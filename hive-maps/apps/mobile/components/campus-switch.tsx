import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CampusMeta } from '@/types/campus';

type Props = {
  options: CampusMeta[];
  value: string | null;
  onChange: (campus: string) => void;
};

export function CampusSwitch({ options, value, onChange }: Readonly<Props>) {
  return (
      // Shadow wrapper
      <View style={styles.shadowWrap}>
        <View style={styles.pill}>
          {options.map((option, index) => {
            const selected = value === option.id;
            const isFirst = index === 0;
            const isLast = index === options.length - 1;

            return (
                <View
                  key={option.id}
                  style={[
                    styles.tabWrap,
                    isFirst && styles.tabWrapFirst,
                    isLast && styles.tabWrapLast,
                  ]}
                >
                  <Pressable
                      testID={`campus-tab-${option.id}`}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => onChange(option.id)}
                      style={({ pressed }) => [
                        styles.tab,
                        selected && styles.tabSelected,
                        selected && isFirst && styles.tabSelectedFirst,
                        selected && isLast && styles.tabSelectedLast,
                        pressed && styles.tabPressed,
                      ]}
                      hitSlop={6}
                  >
                    <ThemedText style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                </View>
            );
          })}
        </View>
      </View>
  );
}

const MAROON = '#912338';

const styles = StyleSheet.create({
  shadowWrap: {
    alignSelf: 'center',
    borderRadius: 999,

    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,

    // Android shadow
    elevation: 10,
  },

  pill: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 2,

    height: 38,
    minWidth: 220,
  },

  tab: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  tabSelected: {
    backgroundColor: MAROON,
    marginHorizontal: -2,
    marginVertical: -2,
  },

  tabPressed: {
    opacity: 0.85,
  },

  tabWrap: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 999,
  },
  tabWrapFirst: {
    marginLeft: 0,
  },
  tabWrapLast: {
    marginRight: 0,
  },
  tabSelectedFirst: {
    marginLeft: -2,
  },
  tabSelectedLast: {
    marginRight: -2,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat',
  },

  labelSelected: {
    color: '#fff',
  },

  labelUnselected: {
    color: '#111',
  },
});
