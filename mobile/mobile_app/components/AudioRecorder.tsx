import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { Audio } from "expo-av";
// Use the legacy filesystem API to avoid deprecation warnings for readAsStringAsync
import * as FileSystem from "expo-file-system/legacy";
import { apiPost } from "../src/services/apiClient";
import { API_HOST } from "../utils/axiosConfig";
import { getAccessToken } from "../src/services/tokenStorage";

interface AudioRecorderProps {
  onRecordingComplete?: (recording: any) => void;
}

export default function AudioRecorder({
  onRecordingComplete,
}: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUri, setLastUri] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const rec = recordingRef.current;
      if (rec) {
        // Attempt to stop/unload safely; ignore errors from already-unloaded
        (async () => {
          try {
            const status = await rec.getStatusAsync().catch(() => null);
            if (
              status &&
              (status.isLoaded || status.isRecording || status.durationMillis)
            ) {
              await rec.stopAndUnloadAsync();
            }
          } catch (e) {
            // ignore unload errors
            console.debug(
              "AudioRecorder cleanup unload ignored:",
              e?.message || e
            );
          }
        })();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Microphone permission is required to record audio."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Recording error", "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    setIsProcessing(true);
    try {
      // stop and unload only if still recording/loaded
      try {
        const status = await rec.getStatusAsync().catch(() => null);
        if (
          status &&
          (status.isLoaded || status.isRecording || status.durationMillis)
        ) {
          await rec.stopAndUnloadAsync();
        }
      } catch (e) {
        console.debug("stopAndUnloadAsync ignored error:", e?.message || e);
      }
      const uri = rec.getURI();
      const recObj = {
        id: Date.now(),
        title: "Recording",
        audio_url: uri,
        created_at: new Date().toISOString(),
        status: "new",
      } as any;
      setLastUri(uri || null);
      onRecordingComplete?.(recObj);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      Alert.alert("Recording error", "Could not stop recording.");
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
      recordingRef.current = null;
      setRecording(null);
    }
  };

  // Submit recorded audio to server via base_resource insert
  const submitRecording = async () => {
    if (!lastUri) {
      Alert.alert("No recording", "Please record audio before submitting.");
      return;
    }
    setIsProcessing(true);
    try {
      // read file as base64 - be defensive around EncodingType availability
      let encodingOpt: any = "base64";
      try {
        if (
          (FileSystem as any).EncodingType &&
          (FileSystem as any).EncodingType.Base64
        ) {
          encodingOpt = (FileSystem as any).EncodingType.Base64;
        }
      } catch (e) {
        encodingOpt = "base64";
      }
      let b64: string | null = null;
      try {
        b64 = await FileSystem.readAsStringAsync(lastUri, {
          encoding: encodingOpt,
        });
      } catch (readErr) {
        // try with string 'base64' as fallback
        try {
          b64 = await FileSystem.readAsStringAsync(lastUri, {
            encoding: "base64",
          });
        } catch (readErr2) {
          // final fallback: fetch the file and convert ArrayBuffer -> base64
          try {
            const response = await fetch(lastUri);
            const arrayBuffer = await response.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8.length; i++)
              binary += String.fromCharCode(uint8[i]);
            if (typeof global.btoa === "function") {
              b64 = global.btoa(binary);
            } else {
              // Node Buffer fallback (shouldn't usually be available in RN)
              try {
                b64 = (Buffer as any).from(binary, "binary").toString("base64");
              } catch (bufErr) {
                throw readErr2;
              }
            }
          } catch (finalErr) {
            throw finalErr;
          }
        }
      }
      // determine mime type from extension
      const lower = lastUri.toLowerCase();
      let mime = "audio/webm";
      if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) mime = "audio/mp4";
      else if (lower.endsWith(".wav")) mime = "audio/wav";
      else if (lower.endsWith(".mp3")) mime = "audio/mpeg";

      const dataUrl = `data:${mime};base64,${b64}`;

      // Prepare payload for base_resource insert
      const payload = {
        operation: "insert",
        resource: "audio_recordings",
        data: {
          title: "Recording",
          audio_data: dataUrl,
          status: "new",
        },
      } as any;

      const resp = await apiPost("/api/query/v1/base_resource", payload);
      console.debug("Audio upload response:", resp);
      if (resp && resp.success) {
        Alert.alert("Upload successful", "Recording uploaded successfully.");
        // optionally provide the server record back to parent
        const serverRow = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        onRecordingComplete?.(serverRow);
        // clear lastUri so user can record again
        setLastUri(null);
      } else {
        throw new Error(resp?.error || "Upload failed");
      }
    } catch (e: any) {
      console.error("Submit recording failed (JSON path):", e);
      // If JSON upload failed due to network or body size, try multipart/form-data fallback
      try {
        console.debug("Attempting multipart/form-data fallback upload");
        const token = await getAccessToken();
        const form = new FormData();
        form.append("operation", "insert");
        form.append("resource", "audio_recordings");
        form.append("title", "Recording");
        form.append("status", "new");
        // Append file blob
        form.append("audio_file", {
          uri: lastUri,
          name: `recording.${lower.split(".").pop() || "webm"}`,
          type: mime,
        } as any);

        const uploadUrl = `${API_HOST}/api/query/v1/upload_audio`;
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        // Do not set Content-Type; fetch will set multipart boundary
        const uplResp = await fetch(uploadUrl, {
          method: "POST",
          headers,
          body: form as any,
        });
        const uplJson = await uplResp.json().catch(() => null);
        console.debug("Multipart upload response:", uplResp.status, uplJson);
        if (uplResp.ok && uplJson && uplJson.success) {
          Alert.alert(
            "Upload successful",
            "Recording uploaded successfully (form-data)."
          );
          const serverRow = Array.isArray(uplJson.data)
            ? uplJson.data[0]
            : uplJson.data;
          onRecordingComplete?.(serverRow);
          setLastUri(null);
        } else {
          const msg =
            (uplJson && (uplJson.error || uplJson.message)) ||
            `Upload failed (status ${uplResp.status})`;
          throw new Error(msg);
        }
      } catch (fallbackErr: any) {
        console.error(
          "Submit recording failed (form-data fallback):",
          fallbackErr
        );
        Alert.alert(
          "Upload failed",
          fallbackErr.message || String(fallbackErr)
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Recorder (mobile)</Text>
      <View style={styles.buttons}>
        <Button
          title={isRecording ? "Recording..." : "Start Recording"}
          onPress={startRecording}
          disabled={isRecording || isProcessing}
        />
        <View style={{ height: 8 }} />
        <Button
          title="Stop Recording"
          onPress={stopRecording}
          disabled={!isRecording || isProcessing}
        />
        <View style={{ height: 8 }} />
        <Button
          title="Submit Recording"
          onPress={submitRecording}
          disabled={!lastUri || isProcessing}
        />
        <View style={{ height: 8 }} />
        <Button
          title="Clear"
          onPress={() => {
            setLastUri(null);
          }}
          disabled={isProcessing || !lastUri}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  title: {
    marginBottom: 8,
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "column",
  },
});
