import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { buildPublicApiUrl } from "../src/services/urlBuilder";
import { saveCompanySlug, saveAppSlug } from "../src/services/tokenStorage";

export default function CompanySelection() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Array<any>>([]);
  const [apps, setApps] = useState<Array<any>>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestUrl, setRequestUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError(null);
      try {
        const url = buildPublicApiUrl("/companies");
        setRequestUrl(url);
        const res = await fetch(url);
        if (!res.ok) {
          const txt = await res.text().catch(() => "<no body>");
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }
        const json = await res.json();
        console.debug("Fetched companies:", json);
        if (!mounted) return;
        const list = json || [];
        setCompanies(list);
        if (list.length === 1) {
          setSelectedCompany(list[0].slug);
        }
      } catch (e: any) {
        console.error("Failed to fetch companies:", e);
        if (mounted) {
          setCompanies([]);
          setError(e?.message || "Failed to fetch companies");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompany) {
      setApps([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const url = buildPublicApiUrl(`/companies/${selectedCompany}/apps`);
        setRequestUrl(url);
        const res = await fetch(url);
        if (!res.ok) {
          const txt = await res.text().catch(() => "<no body>");
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }
        const json = await res.json();
        const list = json || [];
        if (!mounted) return;
        setApps(list);
        if (list.length === 1) {
          setSelectedApp(list[0].slug);
        }
      } catch (e: any) {
        console.error("Failed to fetch apps:", e);
        if (mounted) {
          setApps([]);
          setError(e?.message || "Failed to fetch apps");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedCompany]);

  function handleContinue() {
    if (selectedCompany && selectedApp) {
      // persist selection for later API calls
      saveCompanySlug(selectedCompany).catch(() => {});
      saveAppSlug(selectedApp).catch(() => {});
      router.push(`/login?company=${selectedCompany}&app=${selectedApp}`);
    }
  }

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={styles.container}>
      {error && (
        <View style={{ width: "100%", marginBottom: 10 }}>
          <Text style={{ color: "red", marginBottom: 6 }}>Error: {error}</Text>
          {requestUrl ? (
            <Text style={{ color: "#666", fontSize: 12 }}>
              Request: {requestUrl}
            </Text>
          ) : null}
          <View style={{ marginTop: 8 }}>
            <Button
              title="Retry"
              onPress={() => {
                setLoading(true);
                setError(null);
                setCompanies([]);
                setApps([]);
                setSelectedCompany(null);
                setSelectedApp(null); /* reload effect will run */
              }}
            />
          </View>
        </View>
      )}
      <Text style={styles.title}>Select Company & App</Text>
      <Text style={styles.subtitle}>
        Choose the company and app to scope login
      </Text>
      <View style={{ marginTop: 16, width: "100%" }}>
        {companies.length === 0 ? (
          <Text style={styles.muted}>No companies available</Text>
        ) : (
          companies.map((c) => (
            <TouchableOpacity
              key={c.slug}
              onPress={() => {
                setSelectedCompany(c.slug);
                setSelectedApp(null);
              }}
              style={[
                styles.item,
                selectedCompany === c.slug && styles.itemSelected,
              ]}
            >
              <Text
                style={
                  selectedCompany === c.slug
                    ? styles.itemTextSelected
                    : styles.itemText
                }
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
      {selectedCompany && (
        <View style={{ marginTop: 20, width: "100%" }}>
          <Text style={{ fontWeight: "600" }}>
            Select App for {selectedCompany}:
          </Text>
          {apps.length === 0 ? (
            <Text style={styles.muted}>No apps available for this company</Text>
          ) : (
            apps.map((a) => (
              <TouchableOpacity
                key={a.slug}
                onPress={() => {
                  setSelectedApp(a.slug);
                }}
                style={[
                  styles.item,
                  selectedApp === a.slug && styles.itemSelected,
                ]}
              >
                <Text
                  style={
                    selectedApp === a.slug
                      ? styles.itemTextSelected
                      : styles.itemText
                  }
                >
                  {a.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <View style={{ marginTop: 20 }}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedCompany || !selectedApp}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    paddingTop: 40,
  },
  title: { fontSize: 20, fontWeight: "600" },
  subtitle: { marginTop: 8, color: "#666" },
  muted: { color: "#999", marginTop: 8 },
  item: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemSelected: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  itemText: { color: "#111" },
  itemTextSelected: { color: "#fff", fontWeight: "600" },
});
