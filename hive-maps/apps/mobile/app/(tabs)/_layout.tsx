import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabIconProps = {
  color: string;
};

function HomeTabIcon({ color }: Readonly<TabIconProps>) {
  return <IconSymbol size={28} name="house.fill" color={color} />;
}

function MapTabIcon({ color }: Readonly<TabIconProps>) {
  return <IconSymbol size={28} name="map.fill" color={color} />;
}

function ExploreTabIcon({ color }: Readonly<TabIconProps>) {
  return <IconSymbol size={28} name="paperplane.fill" color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="map"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: MapTabIcon,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ExploreTabIcon,
        }}
      />
    </Tabs>
  );
}
