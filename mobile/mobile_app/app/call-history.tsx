import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { query } from "../api-builder";

interface CallHistoryItem {
  id: number;
  title: string;
  recorded_by: string;
  created_at: string;
  history_block: any;
  score?: number;
}

export default function CallHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<CallHistoryItem[]>([]);

  const loadHistory = async () => {
    try {
      setError(null);
      const response = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "recorded_by",
          "created_at",
          "history_block",
          "score",
        ],
        filters: {},
        timeoutMs: 10000,
      });

      const rows: any[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      // Sort by created_at descending (latest first)
      const sortedRows = rows
        .filter((r) => r.history_block) // Only show records with history
        .sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });

      setRecordings(sortedRows);
    } catch (err: any) {
      setError(err?.message || "Failed to load call history");
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const parseHistoryBlock = (historyBlock: any) => {
    try {
      if (typeof historyBlock === "string") {
        return JSON.parse(historyBlock);
      }
      return historyBlock;
    } catch {
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const renderHistoryItem = (item: CallHistoryItem) => {
    const historyData = parseHistoryBlock(item.history_block);
    const hasHistory =
      historyData && Array.isArray(historyData) && historyData.length > 0;

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title || "Untitled"}</Text>
            <Text style={styles.cardSubtitle}>
              By: {item.recorded_by} • {formatDate(item.created_at)}
            </Text>
            {item.score !== undefined && (
              <View style={styles.scoreContainer}>
                <MaterialIcons name="star" size={16} color="#FFA500" />
                <Text style={styles.scoreText}>Score: {item.score}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {!hasHistory ? (
          <Text style={styles.noHistoryText}>No historical data available</Text>
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>
              Call History ({historyData.length} previous calls)
            </Text>
            {historyData.map((histItem: any, index: number) => {
              const callNotes = histItem?.call_notes;
              const historicalDelta = histItem?.historical_delta;

              return (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyItemTitle}>Call {index + 1}</Text>

                  {callNotes && (
                    <>
                      {callNotes.strengths &&
                        callNotes.strengths.length > 0 && (
                          <View style={styles.section}>
                            <Text style={styles.label}>✅ Strengths:</Text>
                            {callNotes.strengths.map(
                              (strength: string, i: number) => (
                                <Text key={i} style={styles.bulletText}>
                                  • {strength}
                                </Text>
                              )
                            )}
                          </View>
                        )}

                      {callNotes.gaps && callNotes.gaps.length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.label}>⚠️ Gaps:</Text>
                          {callNotes.gaps.map((gap: string, i: number) => (
                            <Text key={i} style={styles.bulletText}>
                              • {gap}
                            </Text>
                          ))}
                        </View>
                      )}

                      {callNotes.key_compliance_observation && (
                        <View style={styles.section}>
                          <Text style={styles.label}>📋 Compliance:</Text>
                          <Text style={styles.text}>
                            {callNotes.key_compliance_observation}
                          </Text>
                        </View>
                      )}

                      {callNotes.language_snapshot && (
                        <View style={styles.section}>
                          <Text style={styles.label}>💬 Language:</Text>
                          <Text style={styles.text}>
                            Confidence: {callNotes.language_snapshot.confidence}{" "}
                            | Fillers: {callNotes.language_snapshot.fillers}
                          </Text>
                        </View>
                      )}

                      {callNotes.representative_quote && (
                        <View style={styles.section}>
                          <Text style={styles.label}>💭 Quote:</Text>
                          <Text style={styles.quoteText}>
                            "{callNotes.representative_quote}"
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {historicalDelta && (
                    <>
                      {historicalDelta.key_improvements_vs_history &&
                        historicalDelta.key_improvements_vs_history.length >
                          0 && (
                          <View style={styles.section}>
                            <Text style={styles.label}>📈 Improvements:</Text>
                            {historicalDelta.key_improvements_vs_history.map(
                              (imp: string, i: number) => (
                                <Text key={i} style={styles.bulletText}>
                                  • {imp}
                                </Text>
                              )
                            )}
                          </View>
                        )}

                      {historicalDelta.key_regressions_vs_history &&
                        historicalDelta.key_regressions_vs_history.length >
                          0 && (
                          <View style={styles.section}>
                            <Text style={styles.label}>📉 Regressions:</Text>
                            {historicalDelta.key_regressions_vs_history.map(
                              (reg: string, i: number) => (
                                <Text key={i} style={styles.bulletText}>
                                  • {reg}
                                </Text>
                              )
                            )}
                          </View>
                        )}

                      {historicalDelta.behavioral_interpretation && (
                        <View style={styles.section}>
                          <Text style={styles.label}>
                            🧠 Behavioral Analysis:
                          </Text>
                          <Text style={styles.text}>
                            {historicalDelta.behavioral_interpretation}
                          </Text>
                        </View>
                      )}

                      {historicalDelta.coaching_implication && (
                        <View style={styles.section}>
                          <Text style={styles.label}>
                            🎯 Coaching Implication:
                          </Text>
                          <Text style={styles.text}>
                            {historicalDelta.coaching_implication}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0b66d1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0b66d1" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadHistory} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {recordings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No call history available</Text>
              <Text style={styles.emptySubtext}>
                Historical data will appear here once calls are analyzed
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.infoText}>
                Showing {recordings.length} recording(s) with historical data
              </Text>
              {recordings.map(renderHistoryItem)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f1724",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0b66d1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f1724",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f1724",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  noHistoryText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  historyContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f1724",
    marginBottom: 8,
  },
  historyItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0b66d1",
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0b66d1",
    marginBottom: 8,
  },
  section: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    paddingLeft: 8,
  },
  quoteText: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    lineHeight: 18,
  },
});
