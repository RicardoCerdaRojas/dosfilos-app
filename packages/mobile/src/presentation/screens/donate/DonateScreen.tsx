import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function DonateScreen() {
  const { t } = useTranslation();
  
  return (
    <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-primary">
      <Text className="text-xl font-bold dark:text-white">{t('study:title')}</Text>
      <Text className="text-slate-500 dark:text-slate-400 mt-2">{t('study:coming_soon')}</Text>
    </View>
  );
}
