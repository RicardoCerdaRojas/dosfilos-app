import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function TutorScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-primary">
      <ScrollView className="flex-1 px-6 py-8" showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t('tutor:title')}</Text>
        
        <View className="bg-white dark:bg-background-secondary rounded-[32px] p-8 items-center shadow-sm border border-slate-100 dark:border-white/5">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
            <MaterialIcons name="bolt" size={40} color="#1754cf" />
          </View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('tutor:coming_soon')}</Text>
          <Text className="text-slate-500 text-center leading-6">
            {t('tutor:description')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
