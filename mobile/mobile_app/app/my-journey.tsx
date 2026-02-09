import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Href } from "expo-router";
import * as SecureStore from "expo-secure-store";

interface Recording {
  id: string;
  title: string;
  created_at: string;
  duration?: number;
  file_path?: string;
}

export default function MyJourneyPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from secure store
      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Fetch recordings from backend
      const response = await fetch(
        `${
          process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"
        }/api/query/v1/user_recordings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data && Array.isArray(data.data)) {
        setRecordings(data.data);
      } else if (data && Array.isArray(data)) {
        setRecordings(data);
      } else {
        setRecordings([]);
      }
    } catch (err: any) {
      setError("Failed to load recordings: " + err.message);
      console.error("Error loading recordings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handlePlayRecording = (recording: Recording) => {
    // Navigate to recording detail/player page
    router.push({
      pathname: "/recording-detail" as Href,
      params: { id: recording.id, title: recording.title },
    } as any);
  };

  const handleDeleteRecording = (recordingId: string) => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync("authToken");
              if (!token) return;

              const response = await fetch(
                `${
                  process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"
                }/api/query/v1/delete_recording/${recordingId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.ok) {
                setRecordings(recordings.filter((r) => r.id !== recordingId));
                Alert.alert("Success", "Recording deleted");
              } else {
                Alert.alert("Error", "Failed to delete recording");
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete recording");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const renderRecordingItem = ({ item }: { item: Recording }) => (
    <View style={styles.recordingCard}>
      <View style={styles.recordingContent}>
        <View style={styles.recordingIcon}>
          <MaterialIcons name="mic" size={24} color="#0b66d2" />
        </View>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.recordingDate}>
            {formatDate(item.created_at)}
          </Text>
          {item.duration && (
            <Text style={styles.recordingDuration}>
              Duration: {item.duration}s
            </Text>
          )}
        </View>
      </View>
      <View style={styles.recordingActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayRecording(item)}
        >
          <MaterialIcons name="play-arrow" size={20} color="#0b66d2" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteRecording(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="folder-open" size={48} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No Recordings Yet</Text>
      <Text style={styles.emptyStateText}>
        Start by recording your first brand detailing practice session
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>My Journey</Text>
        <Text style={styles.subtitle}>Your past recordings</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b66d2" />
          <Text style={styles.loadingText}>Loading your recordings...</Text>
        </View>
      ) : recordings.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={recordings}
          renderItem={renderRecordingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Refresh Button */}
      {!loading && (
        <TouchableOpacity style={styles.refreshButton} onPress={loadRecordings}>
          <MaterialIcons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    color: "#dc2626",
    flex: 1,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  recordingCard: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordingContent: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  recordingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  recordingDate: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  recordingDuration: {
    fontSize: 12,
    color: "#0b66d2",
    fontWeight: "500",
  },
  recordingActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  refreshButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0b66d2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
});
