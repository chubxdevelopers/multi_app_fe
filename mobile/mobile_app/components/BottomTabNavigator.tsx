import React from "react";
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { Text } from "./themed-text";

interface TabItem {
  name: string;
  label: string;
  icon: string;
  route: string;
}

const tabs: TabItem[] = [
  {
    name: "Record",
    label: "Record",
    icon: "mic",
    route: "/(tabs)/dashboard",
  },
  {
    name: "Journey",
    label: "My Progress",
    icon: "bar-chart",
    route: "/(tabs)/dashboard",
  },
  {
    name: "More",
    label: "More",
    icon: "more-vert",
    route: "/more",
  },
];

interface BottomTabNavigatorProps {
  children: React.ReactNode;
}

export function BottomTabNavigator({ children }: BottomTabNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isTabActive = (route: string) => {
    return pathname === route || pathname.startsWith(route);
  };

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <SafeAreaView style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = isTabActive(tab.route);
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.route)}
            >
              <View
                style={[
                  styles.tabIconContainer,
                  isActive && styles.tabIconActive,
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={24}
                  color={isActive ? "#0b66d2" : "#9ca3af"}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  tabIconActive: {
    backgroundColor: "#eff6ff",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#0b66d2",
  },
  tabLabelInactive: {
    color: "#9ca3af",
  },
});
