import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const POSITION_BUTTON = require('@/assets/images/position-button.png');

export function LocateMeButton({
  onPress,
  style,
  accessibilityLabel = 'Locate me',
}: Readonly<Props>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        style,
      ]}
      hitSlop={8}
    >
      <Image source={POSITION_BUTTON} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 38,
    width: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.12,
  },
  icon: {
    width: 18,
    height: 28,
    resizeMode: 'contain',
  },
});
