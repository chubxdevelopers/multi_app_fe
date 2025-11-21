import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./contexts/AuthContext";
import { getCompanySlug, getAppSlug } from "../src/services/tokenStorage";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    let mounted = true;
    async function decide() {
      // while auth is loading, wait
      if (loading) return;

      const company = await getCompanySlug();
      const app = await getAppSlug();

      if (!company || !app) {
        // require user to pick company/app first
        await router.replace("/company-selection");
        return;
      }

      if (!user) {
        // send to login with company/app prefilled
        await router.replace(`/login?company=${company}&app=${app}`);
        return;
      }

      // send everyone to the unified dashboard explicitly; feature visibility is handled there
      try {
        await router.replace("/(tabs)/dashboard");
      } catch (e) {
        try {
          await router.replace("/");
        } catch (e2) {
          /* ignore */
        }
      }
    }
    decide();
    return () => {
      mounted = false;
    };
  }, [user, loading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>{loading ? "Checking session…" : "Redirecting…"}</Text>
    </View>
  );
}
