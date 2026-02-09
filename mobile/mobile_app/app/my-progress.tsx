import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Href } from "expo-router";
import * as SecureStore from "expo-secure-store";

interface PerformanceOverview {
  averageScore: number;
  latestScore: number;
  improvement: number;
  totalRecordings: number;
}

interface RecordingHistory {
  id: string;
  brand: string;
  recordingDate: string;
  score: number;
  metrics: {
    modelCommunication: { score: number; maxScore: number };
    languageQuality: { score: number; maxScore: number };
    medicalAccuracy: { score: number; maxScore: number };
    closingOrientation: { score: number; maxScore: number };
  };
}

interface MyProgressData {
  overview: PerformanceOverview;
  history: RecordingHistory[];
  feedback: string;
}

export default function MyProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<MyProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `${
          process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"
        }/api/query/v1/user_progress`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const fetchedData = await response.json();

      if (fetchedData && fetchedData.data) {
        setData(fetchedData.data);
      } else if (fetchedData) {
        setData(fetchedData);
      } else {
        setError("Failed to load progress data");
      }
    } catch (err: any) {
      setError("Error loading progress: " + err.message);
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { status: "Excellent", color: "#10b981" };
    if (score >= 70) return { status: "Good", color: "#3b82f6" };
    if (score >= 60) return { status: "Needs Coaching", color: "#fbbf24" };
    return { status: "Needs Improvement", color: "#ef4444" };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b66d2" />
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={32} color="#ef4444" />
            <Text style={styles.errorText}>
              {error || "No progress data found"}
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color="white" />
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { overview, history, feedback } = data;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Progress</Text>
          <Text style={styles.subtitle}>Track your improvement over time</Text>
        </View>

        {/* Performance Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <MaterialIcons name="trending-up" size={24} color="#10b981" />
            <Text style={styles.overviewTitle}>Performance Overview</Text>
          </View>

          <View style={styles.overviewMetrics}>
            <View style={styles.overviewMetric}>
              <Text style={styles.metricLabel}>Average Score</Text>
              <Text style={styles.metricValue}>{overview.averageScore}</Text>
            </View>
            <View style={styles.overviewMetric}>
              <Text style={styles.metricLabel}>Latest Score</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: getScoreStatus(overview.latestScore).color },
                ]}
              >
                {overview.latestScore}
              </Text>
            </View>
            <View style={styles.overviewMetric}>
              <Text style={styles.metricLabel}>Improvement</Text>
              <View style={styles.improvementBox}>
                <MaterialIcons name="trending-up" size={16} color="#10b981" />
                <Text style={styles.improvementValue}>
                  +{overview.improvement}
                </Text>
              </View>
            </View>
          </View>

          {feedback && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}
        </View>

        {/* Recording History */}
        <Text style={styles.sectionTitle}>Recording History</Text>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="library-books" size={40} color="#d1d5db" />
            <Text style={styles.emptyStateText}>
              No recordings yet. Start your first practice session!
            </Text>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {history.map((record, idx) => {
              const isExpanded = expandedId === record.id;
              const scoreStatus = getScoreStatus(record.score);

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.historyCard}
                  onPress={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDate}>
                        {new Date(record.recordingDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </Text>
                      <Text style={styles.historyBrand}>{record.brand}</Text>
                    </View>
                    <View style={styles.historyScoreBox}>
                      <Text
                        style={[
                          styles.historyScore,
                          { color: scoreStatus.color },
                        ]}
                      >
                        {record.score}
                      </Text>
                      <MaterialIcons
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={20}
                        color={scoreStatus.color}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.metricGrid}>
                        {[
                          {
                            name: "Model Communication",
                            metric: record.metrics.modelCommunication,
                          },
                          {
                            name: "Language Quality",
                            metric: record.metrics.languageQuality,
                          },
                          {
                            name: "Medical Accuracy",
                            metric: record.metrics.medicalAccuracy,
                          },
                          {
                            name: "Closing & Action",
                            metric: record.metrics.closingOrientation,
                          },
                        ].map((item, mIdx) => (
                          <View key={mIdx} style={styles.metricItem}>
                            <Text style={styles.metricItemName}>
                              {item.name}
                            </Text>
                            <Text style={styles.metricItemScore}>
                              {item.metric.score}/{item.metric.maxScore}
                            </Text>
                            <View style={styles.miniProgressBar}>
                              <View
                                style={[
                                  styles.miniProgressFill,
                                  {
                                    width: `${
                                      (item.metric.score /
                                        item.metric.maxScore) *
                                      100
                                    }%`,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/(tabs)/dashboard" as Href)}
        >
          <MaterialIcons name="arrow-back" size={20} color="white" />
          <Text style={styles.buttonText}>Back to Recording</Text>
        </TouchableOpacity>
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
    padding: 16,
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
  header: {
    marginBottom: 20,
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
  overviewCard: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  overviewMetrics: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  overviewMetric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  improvementBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  improvementValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10b981",
  },
  feedbackBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e7ff",
  },
  feedbackText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 20,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
    marginTop: 8,
  },
  historyContainer: {
    gap: 12,
    marginBottom: 20,
  },
  historyCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  historyBrand: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0b66d2",
  },
  historyScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyScore: {
    fontSize: 18,
    fontWeight: "700",
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricItem: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
  },
  metricItemName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  metricItemScore: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 6,
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: "#e5e7eb",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 1.5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0b66d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
});
