import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter, Href } from "expo-router";
import { API_HOST } from "../utils/axiosConfig";

export default function BrandDetailingPractice() {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [medicines, setMedicines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query team_documents to get unique medicines via base_resource
      const res = await fetch(`${API_HOST}/api/query/v1/base_resource`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          operation: "query",
          resource: "team_documents",
          fields: ["medicines"],
          filters: {},
        }),
      });
      const response = await res.json();

      let rows: any[] = [];
      if (Array.isArray(response?.data)) {
        rows = response.data;
      } else if (Array.isArray(response)) {
        rows = response;
      }

      // Extract unique medicines from the medicines column
      const uniqueMedicines = Array.from(
        new Set(
          rows
            .map((row: any) => row.medicines)
            .filter((m: any) => m && typeof m === "string" && m.trim() !== "")
        )
      ) as string[];

      setMedicines(uniqueMedicines.sort());
    } catch (err: any) {
      setError(err?.message || "Failed to load medicines");
      console.error("Error loading medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = () => {
    if (!selectedBrand) {
      Alert.alert("Select Brand", "Please select a brand first");
      return;
    }
    // Redirect to centralized dashboard with selected brand
    router.push({
      pathname: "/(tabs)/dashboard" as Href,
      params: { brand: selectedBrand },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Select Brand</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0b66d1" />
          </View>
        ) : (
          <>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBrand}
                onValueChange={(itemValue: string) => {
                  setSelectedBrand(itemValue);
                  setError(null);
                }}
                style={styles.picker}
              >
                <Picker.Item label="Choose a brand" value="" />
                {medicines.map((medicine) => (
                  <Picker.Item
                    key={medicine}
                    label={medicine}
                    value={medicine}
                  />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={[styles.button, !selectedBrand && styles.buttonDisabled]}
              onPress={handleStartPractice}
              disabled={!selectedBrand}
            >
              <Text style={styles.buttonText}>Start Practice</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  contentContainer: {
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    color: "#0f1724",
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 36, 0.12)",
  },
  picker: {
    height: 56,
    color: "#0f1724",
  },
  button: {
    backgroundColor: "#0b66d1",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
