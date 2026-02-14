import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSermon } from '@/presentation/hooks/useSermons';
import { useTranslation } from 'react-i18next';

export default function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: sermon, isLoading, error } = useSermon(id!);
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-background-primary">
        <ActivityIndicator size="large" color="#1754cf" />
      </View>
    );
  }

  if (error || !sermon) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-background-primary">
        <Text className="text-red-500">{t('sermons:error_loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: sermon.title }} />
      <ScrollView className="flex-1 bg-white dark:bg-background-primary">
        {sermon.thumbnailUrl && (
          <Image
            source={{ uri: sermon.thumbnailUrl }}
            className="w-full h-64"
            resizeMode="cover"
          />
        )}
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{sermon.title}</Text>
          {sermon.preacher && (
            <Text className="text-lg text-gray-600 dark:text-slate-400 mb-4">{sermon.preacher}</Text>
          )}
          <Text className="text-gray-500 dark:text-slate-500 mb-4">
            {new Date(sermon.date).toLocaleDateString(i18n.language)}
          </Text>
          <Text className="text-base text-gray-800 dark:text-slate-300 leading-6">
            {sermon.description}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
