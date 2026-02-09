import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Button,
  StyleSheet,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "expo-router";
import perms from "../../src/utils/permissions";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  // Capability-based admin check: consider user admin if they have any admin-related
  // permission or capability. This is more flexible than checking the role string.
  const adminFeatureTags = [
    "admin",
    "users",
    "features",
    "capabilities",
    "error_logs",
    "company_documents",
    "team_documents",
  ];
  const adminCapabilities = [
    "manage_users",
    "manage_features",
    "manage_capabilities",
    "view_error_logs",
    "manage_documents",
    "admin_access",
  ];

  const hasAnyAdminPermission = !!(
    user &&
    (adminFeatureTags.some((ft) =>
      perms.hasPermission(user.uiPermissions, { feature_tag: ft })
    ) ||
      adminCapabilities.some((cap) =>
        perms.hasPermission(user.uiPermissions, { capability: cap })
      ))
  );

  const isAdmin =
    hasAnyAdminPermission ||
    (!!user &&
      ((user.role && String(user.role).toLowerCase() === "admin") ||
        (user.roleName && String(user.roleName).toLowerCase() === "admin")));

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Unauthorized — admin access required.</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  msg: { marginBottom: 12, fontSize: 16 },
});
