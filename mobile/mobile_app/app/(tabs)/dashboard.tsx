// Mobile-native dashboard: converted from web MUI to React Native components
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Button,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "expo-router";
import { query } from "../../api-builder";
import AudioRecorder from "../../components/AudioRecorder";
import perms from "../../src/utils/permissions";
import { getAccessToken } from "../../src/services/tokenStorage";
import jwt_decode from "jwt-decode";

interface AudioRecording {
  id: number;
  title: string;
  recorded_by: string;
  recorded_by_role: string;
  audio_url: string;
  transcription: string;
  created_at: string;
  status: string;
}

export default function UserDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [recordingsData, setRecordingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myRecordings, setMyRecordings] = useState<any[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [showMy, setShowMy] = useState(false);
  const [errorMy, setErrorMy] = useState("");
  const [audioSrcById, setAudioSrcById] = useState<Record<number, string>>({});
  const [audioLoadingById, setAudioLoadingById] = useState<
    Record<number, boolean>
  >({});
  const [teamOptions, setTeamOptions] = useState<
    { name: string; role?: string }[]
  >([]);
  const [selectedRep, setSelectedRep] = useState<string>("");
  const [managerRecs, setManagerRecs] = useState<any[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);
  // Manager filters (mobile)
  const [managerFilterTitle, setManagerFilterTitle] = useState("");
  const [managerFilterDateFrom, setManagerFilterDateFrom] = useState("");
  const [managerFilterDateTo, setManagerFilterDateTo] = useState("");
  const [managerFilterKeywords, setManagerFilterKeywords] = useState("");
  const [managerFilterScoreMin, setManagerFilterScoreMin] =
    useState<string>("");
  const [managerFilterScoreMax, setManagerFilterScoreMax] =
    useState<string>("");

  const u = user || localUser;
  console.log("User dashboard - full user object:", u);
  console.log("User uiPermissions:", u?.uiPermissions);

  // Brand selection
  const [medicines, setMedicines] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  useEffect(() => {
    const load = async () => {
      try {
        const response = await query({
          resource: "team_documents",
          fields: ["medicines"],
          filters: {},
          timeoutMs: 8000,
        });
        const d: any = response;
        const rows: any[] = Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d)
          ? d
          : [];
        const uniq = Array.from(
          new Set(
            rows
              .map((r: any) => r?.medicines)
              .filter((m: any) => m && typeof m === "string")
          )
        ) as string[];
        setMedicines(uniq);
      } catch (e) {}
    };
    load();
  }, []);

  const handleLogout = () => {
    logout();
    try {
      router.replace("/login");
    } catch (e) {
      // fallback
    }
  };

  const handleGetDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "recorded_by",
          "recorded_by_role",
          "transcription",
          "created_at",
          "analysis",
        ],
        filters: {},
      });
      // Normalize response shape. api-builder send() returns parsed payload
      // The backend base_resource returns { success: true, data: rows }
      // but in some error cases send() may return a raw array or text.
      console.debug("GetDetails response:", response);
      const rows: any[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      if (!Array.isArray(rows)) {
        setError("Unexpected response shape from server");
        setRecordingsData([]);
        setShowDetails(false);
        return;
      }

      // Map the data to include user's name, email, role, team
      const mappedData = rows.map((recording: any) => ({
        id: recording.id,
        title: recording.title,
        name: recording.recorded_by,
        email: user?.email || "N/A",
        role: recording.recorded_by_role,
        team: user?.team || "N/A",
        recording_transcript:
          recording.transcription &&
          recording.transcription !== "No transcription available"
            ? recording.transcription
            : "Pending...",
        recording_timestamp: recording.created_at
          ? new Date(recording.created_at).toLocaleString()
          : "",
        analysis: recording.analysis,
      }));

      setRecordingsData(mappedData);
      setShowDetails(true);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch recordings");
      console.error("Error fetching recordings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamOptions = async () => {
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: ["recorded_by", "recorded_by_role"],
        filters: {},
      });
      const rows: any[] = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];
      const uniq = new Map<string, { name: string; role?: string }>();
      rows.forEach((r) => {
        if (r?.recorded_by) {
          uniq.set(r.recorded_by, {
            name: r.recorded_by,
            role: r.recorded_by_role,
          });
        }
      });
      setTeamOptions(Array.from(uniq.values()));
    } catch (e) {
      console.warn("Failed to load team options", e);
    }
  };

  const loadManagerRecordings = async (repName: string) => {
    setManagerLoading(true);
    setError("");
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "recorded_by",
          "recorded_by_role",
          "transcription",
          "created_at",
          "analysis",
        ],
        filters: { "recorded_by.eq": repName },
      });
      const rows: any[] = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];
      const mapped = rows.map((recording: any) => ({
        id: recording.id,
        title: recording.title,
        name: recording.recorded_by,
        role: recording.recorded_by_role,
        recording_transcript:
          recording.transcription &&
          recording.transcription !== "No transcription available"
            ? recording.transcription
            : "Pending...",
        recording_timestamp: recording.created_at
          ? new Date(recording.created_at).toLocaleString()
          : "",
        analysis: recording.analysis,
      }));
      setManagerRecs(mapped);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch team recordings");
      setManagerRecs([]);
    } finally {
      setManagerLoading(false);
    }
  };

  const filterManagerRecs = (rows: any[]) => {
    const titleQ = managerFilterTitle.trim().toLowerCase();
    const kwQ = managerFilterKeywords.trim().toLowerCase();
    const minScore = managerFilterScoreMin
      ? Number(managerFilterScoreMin)
      : undefined;
    const maxScore = managerFilterScoreMax
      ? Number(managerFilterScoreMax)
      : undefined;
    const from = managerFilterDateFrom
      ? new Date(managerFilterDateFrom)
      : undefined;
    const to = managerFilterDateTo ? new Date(managerFilterDateTo) : undefined;
    return rows.filter((r) => {
      if (titleQ && !(r.title || "").toLowerCase().includes(titleQ))
        return false;
      if ((from || to) && r.recording_timestamp) {
        const d = new Date(r.recording_timestamp);
        if (from && d < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (d > toEnd) return false;
        }
      }
      const formatted = formatAnalysisMobile(r.analysis);
      const score = formatted?.overallScore ?? formatted?.score;
      if (
        minScore !== undefined &&
        typeof score === "number" &&
        score < minScore
      )
        return false;
      if (
        maxScore !== undefined &&
        typeof score === "number" &&
        score > maxScore
      )
        return false;
      if (kwQ) {
        const keywords: string[] = (formatted?.areasOfImprovement ??
          formatted?.keywords ??
          []) as any;
        const joined = Array.isArray(keywords)
          ? keywords.join(" ").toLowerCase()
          : "";
        if (!joined.includes(kwQ)) return false;
      }
      return true;
    });
  };

  const handleViewAnalysis = (row: any) => {
    Alert.alert(
      row.title || "Recording Analysis",
      row.analysis || "No analysis available",
      [{ text: "Close" }],
      { cancelable: true }
    );
  };

  // Attempt to extract score and keywords of improvement from analysis content
  const formatAnalysisMobile = (
    analysis: any
  ): {
    score?: string | number;
    overallScore?: string | number;
    areasOfImprovement?: string[];
    keywords?: string[];
  } => {
    if (!analysis) return {};
    try {
      const obj =
        typeof analysis === "string" ? JSON.parse(analysis) : analysis;
      const keywordsArr = obj.areasOfImprovement || obj.keywords || [];
      return {
        score: obj.score ?? obj.overallScore,
        overallScore: obj.overallScore ?? obj.score,
        areasOfImprovement: Array.isArray(obj.areasOfImprovement)
          ? obj.areasOfImprovement
          : Array.isArray(keywordsArr)
          ? keywordsArr
          : [],
        keywords: Array.isArray(obj.keywords) ? obj.keywords : undefined,
      };
    } catch {
      // Fallback: try to parse simple patterns from string
      const s = String(analysis);
      const scoreMatch = s.match(/score\s*[:|-]\s*(\d+(?:\.\d+)?)/i);
      const parts = s
        .split(/\n|\r|,/)
        .map((p) => p.trim())
        .filter((p) => /improve|improvement|keyword/i.test(p));
      const kws: string[] = [];
      parts.forEach((p) => {
        const m = p.match(/improve(?:ment)?s?\s*[:|-]\s*(.*)$/i);
        if (m && m[1]) {
          m[1]
            .split(/,|;|•|-/)
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((x) => kws.push(x));
        }
      });
      return {
        score: scoreMatch ? Number(scoreMatch[1]) : undefined,
        overallScore: scoreMatch ? Number(scoreMatch[1]) : undefined,
        areasOfImprovement: kws,
        keywords: kws,
      };
    }
  };

  // Check user capabilities from JWT
  const canRecordAudio = !!perms.hasPermission(
    (user || localUser)?.uiPermissions,
    { feature_tag: "audio_recording", capability: "record_audio" }
  );

  const canViewTranscription = !!perms.hasPermission(
    (user || localUser)?.uiPermissions,
    { feature_tag: "speech_to_text", capability: "view_transcription" }
  );

  const canSeeAppName = !!perms.hasPermission(
    (user || localUser)?.uiPermissions,
    "see_app_name"
  );
  const isManager =
    ((user || localUser)?.role || "").toLowerCase() === "manager";

  // Download is gated by speech_to_text feature only
  const canDownload = canViewTranscription;

  console.log("Permissions check results:", {
    canRecordAudio,
    canViewTranscription,
    canSeeAppName,
    role: (user || localUser)?.role,
    team: (user || localUser)?.team,
  });

  useEffect(() => {
    // If provider has not populated user yet, try decoding stored access token as fallback
    let mounted = true;
    (async () => {
      if (user || localUser) return;
      try {
        const t = await getAccessToken();
        if (!t) return;
        const payload: any = jwt_decode(t as string);
        // backend might wrap user under `user` or return claims directly
        const u = payload.user ?? payload;
        if (mounted) setLocalUser(u);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const [showDebug, setShowDebug] = useState(false);

  const handleRecordingComplete = (newRecording: AudioRecording) => {
    console.log("Recording saved:", newRecording);
    // Prepend to myRecordings so user sees it immediately
    setMyRecordings((prev) => [
      {
        id: newRecording.id,
        title: newRecording.title || "Recording",
        transcription: newRecording.transcription || "",
        status: newRecording.status || "new",
        timestamp: newRecording.created_at
          ? new Date(newRecording.created_at).toLocaleString()
          : new Date().toLocaleString(),
        audio_url: newRecording.audio_url,
      },
      ...prev,
    ]);
    // Recording is saved, nothing else to do
  };

  // If the UI shows Record Audio feature and user taps it, show recorder
  const onOpenRecorder = () => {
    // If AudioRecorder is a UI component in this file, you could toggle a local modal
    // For now, call handleRecordingComplete when recorder reports result via its own UI
    Alert.alert("Recorder", "Open the recorder in-app (not implemented)");
  };

  const handleDownload = async (recordId: number) => {
    try {
      setError("");
      const resp = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "audio_url",
          "processed_audio",
          "audio_data",
          "created_at",
        ],
        filters: { "id.eq": recordId },
      });

      const rec = resp?.data?.[0];
      if (!rec) throw new Error("Recording not found");

      // Prefer original audio URL (audio_url). If it's not present, fall back to
      // processed_audio (new column) or legacy audio_data.
      // On mobile we can't trigger a direct browser download. Instead,
      // open the audio URL in the system or copy it to clipboard.
      // For now we'll attempt to open the URL using Linking.
      const url = rec.audio_url || rec.processed_audio;
      if (url) {
        try {
          // Use Linking to open url
          const { Linking } = require("react-native");
          Linking.openURL(url);
          return;
        } catch (e) {
          console.error("Failed to open url for download:", e);
        }
      }
      throw new Error("Audio not available for download on mobile");
    } catch (err: any) {
      console.error("Download failed:", err);
      setError(err?.message || "Failed to download recording");
    }
  };

  // Helper function to convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // chunk size
    setUint16(1); // audio format (1 = PCM)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
    setUint16(buffer.numberOfChannels * 2); // block align
    setUint16(16); // bits per sample

    // Data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // chunk size

    // Write interleaved audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(
          pos,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleListen = async (recordId: number) => {
    try {
      if (audioSrcById[recordId]) return; // already loaded
      setAudioLoadingById((prev) => ({ ...prev, [recordId]: true }));
      // Prefer original audio URL (audio_url) which points to the original MP3
      const resp = await query({
        resource: "audio_recordings",
        fields: ["id", "audio_url", "processed_audio", "audio_data"],
        filters: { "id.eq": recordId },
      });
      const rec = resp?.data?.[0];
      if (!rec) throw new Error("Audio not available");
      const src = rec.audio_url || rec.processed_audio || rec.audio_data;
      if (!src) throw new Error("Audio not available");
      setAudioSrcById((prev) => ({ ...prev, [recordId]: src as string }));
      // For mobile, attempt to play immediately
      try {
        const { Audio: ExpoAudio } = require("expo-av");
        const { sound } = await ExpoAudio.Sound.createAsync(
          { uri: src as string },
          { shouldPlay: true }
        );
        // unload after 30s (clean up automatically)
        setTimeout(() => {
          try {
            sound.unloadAsync();
          } catch (e) {}
        }, 30000);
      } catch (e) {
        console.warn("Auto-play failed:", e);
      }
    } catch (err: any) {
      console.error("Listen failed:", err);
      setError(err?.message || "Failed to load audio");
    } finally {
      setAudioLoadingById((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  const handleLoadMyRecordings = async () => {
    setLoadingMy(true);
    setErrorMy("");
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: ["id", "title", "transcription", "status", "created_at"],
        filters: { "recorded_by.eq": user?.name || "" },
      });
      console.debug("LoadMyRecordings resp:", resp);
      const rows: any[] = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];

      if (!Array.isArray(rows)) {
        setErrorMy("Unexpected response shape from server");
        setMyRecordings([]);
        setShowMy(false);
        return;
      }

      const mapped = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        transcription:
          r.transcription && r.transcription !== "No transcription available"
            ? r.transcription
            : "Pending...",
        status: r.status || "-",
        timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : "",
      }));
      setMyRecordings(mapped);
      setShowMy(true);
    } catch (err: any) {
      console.error("Error loading my recordings:", err);
      setErrorMy(err?.message || "Failed to load recordings");
    } finally {
      setLoadingMy(false);
    }
  };

  if (authLoading && !u) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Use a plain View as parent to avoid nesting VirtualizedLists (FlatList) inside a ScrollView
  // Inner FlatLists will manage scrolling themselves. Keep padding consistent with styles.container.
  return (
    <View style={[{ flex: 1 }, styles.container]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcome}>Welcome, {user?.name}</Text>
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Role: {user?.role}</Text>
            </View>
            {user?.team && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Team: {user.team}</Text>
              </View>
            )}
            {canSeeAppName && u?.company && (
              <View style={styles.chip}>
                <MaterialCommunityIcons name="application" size={14} />
                <Text style={[styles.chipText, { marginLeft: 6 }]}>
                  App: {u.company}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push("/call-history")}
            style={styles.historyButton}
          >
            <MaterialIcons name="history" size={24} color="#fff" />
          </TouchableOpacity>
          <Button title="Logout" onPress={handleLogout} />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.subtitle}>Your Capabilities:</Text>
        <View style={styles.capabilitiesRow}>
          {canRecordAudio && (
            <View style={styles.capability}>
              <MaterialIcons name="mic" size={18} color="green" />
              <Text style={styles.capText}>Record Audio</Text>
            </View>
          )}
          {canViewTranscription && (
            <View style={styles.capability}>
              <Text style={styles.capText}>View Transcriptions</Text>
            </View>
          )}
          {canSeeAppName && (
            <View style={styles.capability}>
              <Text style={styles.capText}>View App Name</Text>
            </View>
          )}
          {!canRecordAudio && !canViewTranscription && !canSeeAppName && (
            <Text style={styles.mutedText}>
              No capabilities assigned to your role
            </Text>
          )}
        </View>
      </View>

      {/* Features panel - show only those features the user has permission for */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Features</Text>
        <Text style={styles.cardSubtitle}>
          Available features for your account.
        </Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {canRecordAudio && <Button title="Record Audio" onPress={() => {}} />}
          {canViewTranscription && (
            <Button title="View Transcriptions" onPress={handleGetDetails} />
          )}
          {isManager && (
            <Button
              title={managerLoading ? "Loading team..." : "Load Team"}
              onPress={loadTeamOptions}
              disabled={managerLoading}
            />
          )}
          {!canRecordAudio && !canViewTranscription && !canSeeAppName && (
            <Text style={styles.mutedText}>No capabilities assigned.</Text>
          )}
        </View>
      </View>

      {/* Debug / Permissions inspector */}
      <View style={styles.card}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.cardTitle}>Debug & Permissions</Text>
          <Button
            title={showDebug ? "Hide" : "Show"}
            onPress={() => setShowDebug((s) => !s)}
          />
        </View>

        {showDebug && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: "monospace" }}>
              {JSON.stringify(user ?? {}, null, 2)}
            </Text>
          </View>
        )}
      </View>

      {canRecordAudio && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record Audio</Text>
          <Text style={styles.cardSubtitle}>
            Create new audio recordings with automatic transcription
          </Text>
          {/* Simple brand selector */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ marginBottom: 4, fontWeight: "600" }}>
              Select Brand
            </Text>
            <TextInput
              value={selectedBrand}
              onChangeText={setSelectedBrand}
              placeholder="Type or pick a brand"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 8,
                padding: 8,
              }}
            />
            {/* lightweight picker: show first few suggestions */}
            {selectedBrand.length === 0 && medicines.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {medicines.slice(0, 8).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setSelectedBrand(m)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 16,
                        marginRight: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            defaultTitle={selectedBrand || undefined}
          />
        </View>
      )}

      {canRecordAudio && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>My Recordings</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Button
                title={loadingMy ? "Loading..." : "Load My Recordings"}
                onPress={handleLoadMyRecordings}
                disabled={loadingMy}
              />
            </View>
          </View>

          {errorMy ? <Text style={styles.errorText}>{errorMy}</Text> : null}

          {showMy && myRecordings.length > 0 ? (
            <FlatList
              data={myRecordings}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title || "-"}</Text>
                    <Text style={styles.small}>
                      Transcription: {item.transcription}
                    </Text>
                    <Text style={styles.small}>Date: {item.timestamp}</Text>
                    {(() => {
                      const fmt = formatAnalysisMobile(item.analysis);
                      const score = fmt.overallScore ?? fmt.score;
                      const keywords =
                        fmt.areasOfImprovement ?? fmt.keywords ?? [];
                      return (
                        <>
                          <Text style={styles.small}>
                            Score: {score ?? "-"}
                          </Text>
                          {Array.isArray(keywords) && keywords.length > 0 ? (
                            <Text style={styles.small}>
                              Improvement: {keywords.join(", ")}
                            </Text>
                          ) : (
                            <Text style={styles.small}>Improvement: -</Text>
                          )}
                        </>
                      );
                    })()}
                  </View>
                  <View style={styles.rowActions}>
                    {audioSrcById[item.id] ? (
                      <Button
                        title="Play"
                        onPress={() => {
                          /* handled when loaded */
                        }}
                      />
                    ) : (
                      <Button
                        title={
                          audioLoadingById[item.id] ? "Loading..." : "Listen"
                        }
                        onPress={() => handleListen(item.id)}
                        disabled={!!audioLoadingById[item.id]}
                      />
                    )}
                    {canDownload && <View style={{ height: 8 }} />}
                    {canDownload && (
                      <Button
                        title="Open"
                        onPress={() => handleDownload(item.id)}
                      />
                    )}
                    <View style={{ height: 8 }} />
                    <Button
                      title={item.analysis ? "Analysis" : "No analysis"}
                      onPress={() => handleViewAnalysis(item)}
                      disabled={!item.analysis}
                    />
                  </View>
                </View>
              )}
              nestedScrollEnabled={true}
            />
          ) : showMy && myRecordings.length === 0 && !loadingMy ? (
            <Text style={styles.infoText}>You have no recordings yet.</Text>
          ) : null}
        </View>
      )}

      {canViewTranscription && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Recording Details</Text>
            <Button
              title={loading ? "Loading..." : "Get Details"}
              onPress={handleGetDetails}
              disabled={loading}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {showDetails && recordingsData.length > 0 ? (
            <FlatList
              data={recordingsData}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title || "-"}</Text>
                    <Text style={styles.small}>
                      {item.name} • {item.role}
                    </Text>
                    <Text style={styles.small}>
                      Date: {item.recording_timestamp}
                    </Text>
                    <Text style={styles.small}>
                      Transcription: {item.recording_transcript}
                    </Text>
                    {(() => {
                      const fmt = formatAnalysisMobile(item.analysis);
                      const score = fmt.overallScore ?? fmt.score;
                      const keywords =
                        fmt.areasOfImprovement ?? fmt.keywords ?? [];
                      return (
                        <>
                          <Text style={styles.small}>
                            Score: {score ?? "-"}
                          </Text>
                          {Array.isArray(keywords) && keywords.length > 0 ? (
                            <Text style={styles.small}>
                              Improvement: {keywords.join(", ")}
                            </Text>
                          ) : (
                            <Text style={styles.small}>Improvement: -</Text>
                          )}
                        </>
                      );
                    })()}
                  </View>
                  <View style={styles.rowActions}>
                    <Button
                      title={item.analysis ? "Analysis" : "No analysis"}
                      onPress={() => handleViewAnalysis(item)}
                      disabled={!item.analysis}
                    />
                    <View style={{ height: 8 }} />
                    <Button
                      title={
                        audioLoadingById[item.id] ? "Loading..." : "Listen"
                      }
                      onPress={() => handleListen(item.id)}
                      disabled={!!audioLoadingById[item.id]}
                    />
                    {canDownload && <View style={{ height: 8 }} />}
                    {canDownload && (
                      <Button
                        title="Open"
                        onPress={() => handleDownload(item.id)}
                      />
                    )}
                  </View>
                </View>
              )}
              nestedScrollEnabled={true}
            />
          ) : showDetails && recordingsData.length === 0 && !loading ? (
            <Text style={styles.infoText}>No recordings found.</Text>
          ) : null}
        </View>
      )}

      {isManager && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Manager View: Team Recordings</Text>
            <Button title="Refresh team" onPress={loadTeamOptions} />
          </View>

          {teamOptions.length > 0 ? (
            <FlatList
              data={teamOptions}
              keyExtractor={(item) => item.name}
              horizontal
              renderItem={({ item }) => (
                <Button
                  title={`${item.name}${
                    item.role ? " (" + item.role + ")" : ""
                  }`}
                  onPress={() => {
                    setSelectedRep(item.name);
                    loadManagerRecordings(item.name);
                  }}
                  color={selectedRep === item.name ? "#1976d2" : undefined}
                />
              )}
              style={{ marginVertical: 8 }}
            />
          ) : (
            <Text style={styles.infoText}>
              Tap Refresh team to load members.
            </Text>
          )}

          {managerLoading ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : selectedRep && managerRecs.length > 0 ? (
            <>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.cardSubtitle}>Filters</Text>
                <View style={{ gap: 8 }}>
                  <View
                    style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                  >
                    <View style={{ flex: 1, minWidth: 160 }}>
                      <Text style={styles.small}>Title contains</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. intro call"
                        value={managerFilterTitle}
                        onChangeText={setManagerFilterTitle}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={styles.small}>Date From (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="2025-01-01"
                        value={managerFilterDateFrom}
                        onChangeText={setManagerFilterDateFrom}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={styles.small}>Date To (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="2025-12-31"
                        value={managerFilterDateTo}
                        onChangeText={setManagerFilterDateTo}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                  <View
                    style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                  >
                    <View style={{ flex: 1, minWidth: 160 }}>
                      <Text style={styles.small}>Keywords contain</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. closing, rapport"
                        value={managerFilterKeywords}
                        onChangeText={setManagerFilterKeywords}
                      />
                    </View>
                    <View style={{ width: 120 }}>
                      <Text style={styles.small}>Score Min</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        value={managerFilterScoreMin}
                        onChangeText={setManagerFilterScoreMin}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ width: 120 }}>
                      <Text style={styles.small}>Score Max</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="100"
                        value={managerFilterScoreMax}
                        onChangeText={setManagerFilterScoreMax}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>
              <FlatList
                data={managerRecs}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{item.title || "-"}</Text>
                      <Text style={styles.small}>
                        {item.name} • {item.role}
                      </Text>
                      <Text style={styles.small}>
                        Date: {item.recording_timestamp}
                      </Text>
                      <Text style={styles.small}>
                        Transcription: {item.recording_transcript}
                      </Text>
                      {(() => {
                        const fmt = formatAnalysisMobile(item.analysis);
                        const score = fmt.overallScore ?? fmt.score;
                        const keywords =
                          fmt.areasOfImprovement ?? fmt.keywords ?? [];
                        return (
                          <>
                            <Text style={styles.small}>
                              Score: {score ?? "-"}
                            </Text>
                            {Array.isArray(keywords) && keywords.length > 0 ? (
                              <Text style={styles.small}>
                                Improvement: {keywords.join(", ")}
                              </Text>
                            ) : (
                              <Text style={styles.small}>Improvement: -</Text>
                            )}
                          </>
                        );
                      })()}
                    </View>
                    <View style={styles.rowActions}>
                      <Button
                        title={item.analysis ? "Analysis" : "No analysis"}
                        onPress={() => handleViewAnalysis(item)}
                        disabled={!item.analysis}
                      />
                    </View>
                  </View>
                )}
                nestedScrollEnabled
              />
            </>
          ) : selectedRep ? (
            <Text style={styles.infoText}>
              No recordings found for {selectedRep}.
            </Text>
          ) : null}
        </View>
      )}

      {!canRecordAudio && !canViewTranscription && !canSeeAppName && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Welcome! Your capabilities will appear here once assigned by your
            administrator.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  welcome: { fontSize: 20, fontWeight: "700" },
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  chip: {
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  chipText: { fontSize: 12 },
  infoBox: {
    backgroundColor: "#e8f0ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  subtitle: { fontWeight: "600", marginBottom: 6 },
  capabilitiesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  capability: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  capText: { marginLeft: 6 },
  mutedText: { color: "#666" },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "700", fontSize: 16 },
  cardSubtitle: { color: "#666", marginBottom: 8 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: "red", marginVertical: 8 },
  infoText: { color: "#444", marginVertical: 8 },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowTitle: { fontWeight: "600" },
  rowActions: { justifyContent: "center", alignItems: "center", width: 110 },
  small: { color: "#666" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  historyButton: {
    backgroundColor: "#0b66d1",
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
