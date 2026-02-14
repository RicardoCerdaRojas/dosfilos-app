import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { View, useColorScheme as useDeviceColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useThemeStore } from '@/presentation/state/theme.store';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const deviceColorScheme = useDeviceColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const { t } = useTranslation();

  const isDark = useMemo(() => {
    if (themeMode === 'system') return deviceColorScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, deviceColorScheme]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1754cf',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#0b1120' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
          paddingTop: 8,
          height: 85,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -4,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('common:home_tab'),
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: t('common:bible_tab'),
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: t('common:study_tab'),
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="school" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tutor"
        options={{
          title: t('common:tutor_tab'),
          tabBarIcon: ({ color }) => (
            <View>
              <MaterialIcons size={24} name="bolt" color={color} />
              <View className="absolute -top-1 -right-1 w-2 h-2 bg-academic-gold rounded-full" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sermons"
        options={{
          title: t('common:sermons_tab'),
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="history-edu" color={color} />,
        }}
      />
    </Tabs>
  );
}
