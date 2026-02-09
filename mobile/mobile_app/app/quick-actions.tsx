import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, Href } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

const actions = [
  {
    id: "brand-detailing",
    label: "Brand Detailing Practice",
    icon: "business-bag",
    iconFamily: "MaterialCommunityIcons",
    enabled: true,
  },
  {
    id: "market-research",
    label: "Market Research",
    icon: "search",
    iconFamily: "MaterialIcons",
    enabled: false,
  },
  {
    id: "doctor-call",
    label: "Doctor Call",
    icon: "call",
    iconFamily: "MaterialIcons",
    enabled: false,
  },
  {
    id: "chemist-call",
    label: "Chemist Call",
    icon: "science",
    iconFamily: "MaterialIcons",
    enabled: false,
  },
];

export default function QuickActions() {
  const router = useRouter();
  const { user } = useAuth();

  const handleActionPress = (actionId: string, enabled: boolean) => {
    if (!enabled) {
      return; // Do nothing for disabled actions
    }

    // Only the first button (brand-detailing) is enabled for now
    if (actionId === "brand-detailing") {
      router.push("/brand-detailing-practice" as Href);
    }
  };

  const renderIcon = (action: any) => {
    const iconProps = {
      size: 48,
      color: "#0b66d1",
    };

    if (action.iconFamily === "MaterialCommunityIcons") {
      return <MaterialCommunityIcons name={action.icon} {...iconProps} />;
    }
    return <MaterialIcons name={action.icon} {...iconProps} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>What do you want to do today?</Text>

        <View style={styles.actionsContainer}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionCard,
                !action.enabled && styles.disabledCard,
              ]}
              onPress={() => handleActionPress(action.id, action.enabled)}
              activeOpacity={action.enabled ? 0.7 : 1}
              disabled={!action.enabled}
            >
              <View style={styles.actionContent}>
                <View style={styles.iconContainer}>{renderIcon(action)}</View>
                <Text
                  style={[
                    styles.actionLabel,
                    !action.enabled && styles.disabledText,
                  ]}
                >
                  {action.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 32,
    color: "#0f1724",
  },
  actionsContainer: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#061e38",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.6,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#0f1724",
  },
  disabledText: {
    color: "#6b7280",
  },
});
