import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Href } from "expo-router";
import * as SecureStore from "expo-secure-store";

interface ScoreMetric {
  name: string;
  score: number;
  maxScore: number;
}

interface PracticeResult {
  id: string;
  brand: string;
  recordingDate: string;
  overallScore: number;
  status: string;
  metrics: {
    modelCommunication: ScoreMetric;
    languageQuality: ScoreMetric;
    medicalAccuracy: ScoreMetric;
    closingOrientation: ScoreMetric;
  };
  detailedSummary: Record<string, string>;
  keyFeedback: string[];
}

export default function PracticeResultsPage() {
  const router = useRouter();
  const { recordingId } = useLocalSearchParams();
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [recordingId]);

  const loadResults = async () => {
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
        }/api/query/v1/practice_result/${recordingId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data && data.data) {
        setResult(data.data);
      } else if (data) {
        setResult(data);
      } else {
        setError("Failed to load practice results");
      }
    } catch (err: any) {
      setError("Error loading results: " + err.message);
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

  const getMetricColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return "#10b981";
    if (percentage >= 60) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b66d2" />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={32} color="#ef4444" />
            <Text style={styles.errorText}>{error || "No results found"}</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color="white" />
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getScoreStatus(result.overallScore);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{result.brand} Practice Results</Text>
          <Text style={styles.subtitle}>
            Analysis and feedback on your performance
          </Text>
        </View>

        {/* Overall Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreContent}>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            <Text style={styles.scoreValue}>{result.overallScore}</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}
          >
            <Text style={styles.statusText}>{statusInfo.status}</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <Text style={styles.sectionTitle}>Your Performance</Text>
        <View style={styles.metricsGrid}>
          {[
            {
              name: "Model Communication",
              metric: result.metrics.modelCommunication,
            },
            {
              name: "Language Quality",
              metric: result.metrics.languageQuality,
            },
            {
              name: "Medical Accuracy",
              metric: result.metrics.medicalAccuracy,
            },
            {
              name: "Closing & Action",
              metric: result.metrics.closingOrientation,
            },
          ].map((item, idx) => {
            const color = getMetricColor(
              item.metric.score,
              item.metric.maxScore
            );
            return (
              <View key={idx} style={styles.metricCard}>
                <Text style={styles.metricName}>{item.name}</Text>
                <Text style={styles.metricScore}>
                  {item.metric.score}/{item.metric.maxScore}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (item.metric.score / item.metric.maxScore) * 100
                        }%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Detailed Summary */}
        <Text style={styles.sectionTitle}>Detailed Summary</Text>
        <View style={styles.summaryContainer}>
          {Object.entries(result.detailedSummary).map(([key, value], idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.summaryItem}
              onPress={() =>
                setExpandedSection(expandedSection === key ? null : key)
              }
            >
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>{key}</Text>
                <MaterialIcons
                  name={expandedSection === key ? "expand-less" : "expand-more"}
                  size={24}
                  color="#0b66d2"
                />
              </View>
              {expandedSection === key && (
                <Text style={styles.summaryText}>{value}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Feedback */}
        <Text style={styles.sectionTitle}>Key Feedback</Text>
        <View style={styles.feedbackContainer}>
          {result.keyFeedback.map((feedback, idx) => (
            <View key={idx} style={styles.feedbackItem}>
              <MaterialIcons
                name="fiber-manual-record"
                size={8}
                color="#0b66d2"
              />
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(tabs)/dashboard" as Href)}
          >
            <MaterialIcons name="arrow-back" size={20} color="white" />
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/my-progress" as Href)}
          >
            <MaterialIcons name="bar-chart" size={20} color="#0b66d2" />
            <Text style={styles.secondaryButtonText}>My Progress</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  scoreCard: {
    flexDirection: "row",
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  scoreContent: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000000",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statusText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metricName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  metricScore: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  summaryContainer: {
    marginBottom: 20,
    gap: 8,
  },
  summaryItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  summaryText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 8,
    lineHeight: 20,
  },
  feedbackContainer: {
    marginBottom: 20,
    gap: 10,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  feedbackText: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: "#0b66d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#0b66d2",
  },
  secondaryButtonText: {
    color: "#0b66d2",
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
