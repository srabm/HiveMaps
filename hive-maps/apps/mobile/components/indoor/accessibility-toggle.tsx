import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface AccessibilityToggleProps {
  onToggle?: (enabled: boolean) => void;
  enabled?: boolean;
};

const AccessibilityToggle: React.FC<AccessibilityToggleProps> = ({
  onToggle,
  enabled = false,
}) => {
  const handleToggle = () => {
    onToggle?.(!enabled);
  };

  return (
    <TouchableOpacity
      testID="accessibility-toggle"
      onPress={handleToggle}
      style={styles.pill}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel="Accessibility Mode"
    >
      <MaterialCommunityIcons
        name="wheelchair-accessibility"
        size={16}
        color="#9d1e30"
      />

      <View style={[styles.track, enabled && styles.trackActive]}>
        <View style={[styles.thumb, enabled && styles.thumbActive]} />
      </View>
    </TouchableOpacity>
  );
};

export default AccessibilityToggle;


const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFB74D",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  track: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#00000030",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  trackActive: {
    backgroundColor: "#9d1e30",
  },
  thumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  thumbActive: {
    alignSelf: "flex-end",
  },
});