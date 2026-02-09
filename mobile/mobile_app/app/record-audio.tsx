import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Href } from "expo-router";
import * as FileSystem from "expo-file-system";

export default function RecordAudioPage() {
  const router = useRouter();
  const { brand } = useLocalSearchParams();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    requestAudioPermissions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const requestAudioPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Microphone permission is required to record audio"
        );
      }
    } catch (err) {
      setError("Failed to request microphone permission");
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();

      setRecording(rec);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError("Failed to start recording: " + err.message);
      console.error("Recording error:", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      setError("Failed to stop recording: " + err.message);
    }
  };

  const uploadRecording = async () => {
    if (!recording) {
      setError("No recording to upload");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const uri = recording.getURI();
      if (!uri) {
        setError("Failed to get recording URI");
        return;
      }

      const formData = new FormData();
      formData.append("audio_file", {
        uri,
        type: "audio/m4a",
        name: `recording-${Date.now()}.m4a`,
      } as any);
      formData.append(
        "title",
        `Brand Detailing - ${
          brand || "Practice"
        } - ${new Date().toLocaleString()}`
      );

      const response = await fetch(
        `${
          process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"
        }/api/query/v1/upload_audio`,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = await response.json();

      if (data && data.success) {
        setSuccess("Recording saved successfully!");
        setRecording(null);
        setRecordingTime(0);
        // Redirect to practice results with recording ID
        const recordingId = data.recordingId || data.id;
        setTimeout(() => {
          router.push({
            pathname: "/practice-results" as Href,
            params: { recordingId },
          } as any);
        }, 1500);
      } else {
        setError(data?.error || "Failed to save recording");
      }
    } catch (err: any) {
      setError("Failed to upload recording: " + err.message);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Record Brand Detailing Practice</Text>
          {brand && <Text style={styles.brandName}>{brand}</Text>}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={24} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successBox}>
            <MaterialIcons name="check-circle" size={24} color="#10b981" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* Recording Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Recording Time</Text>
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording in progress...</Text>
            </View>
          )}
        </View>

        {/* Control Buttons */}
        <TouchableOpacity
          style={[
            styles.button,
            isRecording ? styles.stopButton : styles.startButton,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={uploading}
        >
          <MaterialIcons
            name={isRecording ? "stop" : "mic"}
            size={24}
            color="white"
          />
          <Text style={styles.buttonText}>
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Text>
        </TouchableOpacity>

        {/* Upload Button */}
        {recording && !isRecording && (
          <View>
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Duration: {formatTime(recordingTime)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.uploadButton]}
              onPress={uploadRecording}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <MaterialIcons name="cloud-upload" size={24} color="white" />
              )}
              <Text style={styles.buttonText}>
                {uploading ? "Uploading..." : "Save Recording"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0b66d2",
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    color: "#dc2626",
    flex: 1,
    fontSize: 14,
  },
  successBox: {
    flexDirection: "row",
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  successText: {
    color: "#16a34a",
    flex: 1,
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  timerText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0b66d2",
    fontFamily: "monospace",
    marginBottom: 12,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ef4444",
  },
  recordingText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 12,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: "#0b66d2",
  },
  stopButton: {
    backgroundColor: "#ef4444",
  },
  uploadButton: {
    backgroundColor: "#10b981",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    color: "#1e40af",
    fontSize: 14,
    flex: 1,
  },
});
