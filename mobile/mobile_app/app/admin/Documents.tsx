import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import AdminGuard from "./AdminGuard";
import { buildFullApiUrl } from "../../src/services/urlBuilder";
import {
  getCompanySlug,
  getAppSlug,
  getAccessToken,
} from "../../src/services/tokenStorage";

export default function Documents() {
  const [tab, setTab] = useState<"company" | "team">("company");
  const [teamId, setTeamId] = useState<string | number | "">("");
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [tab, teamId]);

  async function load() {
    setLoading(true);
    try {
      const company = await getCompanySlug();
      const app = await getAppSlug();
      const resource = tab === "team" ? "team_documents" : "company_documents";
      const filters: any = {};
      if (tab === "team" && teamId) filters.team_id = Number(teamId);
      const url = buildFullApiUrl("/query/v1/base_resource");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "query", resource, filters }),
      });
      const json = await res.json();
      setDocs(Array.isArray(json) ? json : json?.data || json || []);
    } catch (e: any) {
      console.error("Load docs failed", e);
      Alert.alert("Error", e?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const company = await getCompanySlug();
      const app = await getAppSlug();
      const resource = tab === "team" ? "team_documents" : "company_documents";
      const url = buildFullApiUrl("/query/v1/base_resource");
      const access = await getAccessToken();
      const headers: any = { "Content-Type": "application/json" };
      if (access) headers.Authorization = `Bearer ${access}`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ operation: "delete", resource, data: { id } }),
      });
      if (!res.ok) throw new Error(`Delete failed ${res.status}`);
      Alert.alert("Deleted");
      load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Delete failed");
    }
  }

  async function handleUpload() {
    // Try to use expo-document-picker if available; otherwise prompt user to install it
    let DocumentPicker: any;
    try {
      // dynamic import so app doesn't break if package not installed
      DocumentPicker = require("expo-document-picker");
    } catch (e) {
      Alert.alert(
        "Upload unavailable",
        "To enable file upload install `expo-document-picker`: run `expo install expo-document-picker` in the mobile app and restart."
      );
      return;
    }

    try {
      const pick = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (pick.type !== "success") return;
      const company = await getCompanySlug();
      const app = await getAppSlug();
      const access = await getAccessToken();
      const uploadUrl = buildFullApiUrl("/query/v1/upload_document");

      const fd: any = new FormData();
      fd.append("doc_file", {
        uri: pick.uri,
        name: pick.name || "file",
        type: pick.mimeType || "application/octet-stream",
      } as any);
      const resource = tab === "team" ? "team_documents" : "company_documents";
      fd.append("resource", resource);
      if (tab === "team" && teamId) fd.append("team_id", String(teamId));

      const headers: any = { Accept: "application/json" };
      if (access) headers.Authorization = `Bearer ${access}`;

      const res = await fetch(uploadUrl, { method: "POST", headers, body: fd });
      const json = await res.json();
      if (json && json.success) {
        Alert.alert("Uploaded");
        load();
      } else {
        Alert.alert("Upload failed", json?.error || "Unknown");
      }
    } catch (e: any) {
      console.error("Upload failed", e);
      Alert.alert("Upload error", e?.message || "Upload failed");
    }
  }

  return (
    <AdminGuard>
      <View style={styles.container}>
        <Text style={styles.title}>Documents</Text>
        <View style={styles.tabs}>
          <Button
            title="Company"
            onPress={() => setTab("company")}
            color={tab === "company" ? "#1976d2" : undefined}
          />
          <Button
            title="Team"
            onPress={() => setTab("team")}
            color={tab === "team" ? "#1976d2" : undefined}
          />
        </View>

        {tab === "team" && (
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Team id"
              value={String(teamId)}
              onChangeText={(t) => setTeamId(t)}
            />
            <Button title="Refresh" onPress={() => load()} />
          </View>
        )}

        <View style={{ marginVertical: 8 }}>
          <Button title="Upload Document" onPress={handleUpload} />
        </View>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.path}>{item.doc_path}</Text>
                  <Text style={styles.meta}>
                    {tab === "team" ? `Team: ${item.team_id || "-"} • ` : ""}
                    Uploaded at: {item.uploaded_at || item.created_at || "-"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={{ color: "white" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    justifyContent: "space-around",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  path: { color: "#1976d2" },
  meta: { color: "#666", marginTop: 4 },
  deleteBtn: {
    backgroundColor: "#d32f2f",
    padding: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
});
