import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "./contexts/AuthContext";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}

export default function MorePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const menuItems: MenuItem[] = [
    {
      id: "profile",
      label: "My Profile",
      icon: "person",
      onPress: () => {
        // TODO: Navigate to profile page
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: "settings",
      onPress: () => {
        // TODO: Navigate to settings page
      },
    },
    {
      id: "help",
      label: "Help & Support",
      icon: "help",
      onPress: () => {
        // TODO: Navigate to help page
      },
    },
    {
      id: "about",
      label: "About",
      icon: "info",
      onPress: () => {
        // TODO: Navigate to about page
      },
    },
    {
      id: "logout",
      label: "Logout",
      icon: "logout",
      onPress: async () => {
        await logout();
        router.replace("/login");
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>More Options</Text>
      </View>

      <ScrollView style={styles.container}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <MaterialIcons name="person" size={32} color="#0b66d2" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || "Salesman"}</Text>
            <Text style={styles.profileEmail}>
              {user?.email || "user@example.com"}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                item.id === "logout" && styles.logoutItem,
              ]}
              onPress={item.onPress}
            >
              <MaterialIcons
                name={item.icon as any}
                size={24}
                color={item.id === "logout" ? "#ef4444" : "#0b66d2"}
              />
              <Text
                style={[
                  styles.menuLabel,
                  item.id === "logout" && styles.logoutLabel,
                ]}
              >
                {item.label}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={item.id === "logout" ? "#ef4444" : "#9ca3af"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>App Version 1.0.0</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: "row",
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  menuSection: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    flex: 1,
  },
  logoutLabel: {
    color: "#ef4444",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
