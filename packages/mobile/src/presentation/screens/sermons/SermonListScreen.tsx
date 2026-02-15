import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useSermons } from '@/presentation/hooks/useSermons';
import { SermonCard } from '@/presentation/components/SermonCard';
import { MaterialIcons } from '@expo/vector-icons';
import { UserAvatar } from '@/presentation/components/UserAvatar';
import { useTranslation } from 'react-i18next';

export default function SermonListScreen() {
  const { t } = useTranslation();
  const { data: sermons, isLoading, error, refetch } = useSermons();
  const [filter, setFilter] = useState<'Draft' | 'Ready' | 'Preached'>('Draft');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSermons = sermons?.filter(sermon => {
    const matchesFilter = sermon.status === filter;
    const matchesSearch = searchQuery.trim() === '' || 
      sermon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sermon.passage?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Draft': return t('sermons:status_draft');
      case 'Working': return t('sermons:status_working');
      case 'Ready': return t('sermons:status_ready');
      case 'Preached': return t('sermons:status_preached');
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-primary">
        <ActivityIndicator size="large" color="#1754cf" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-primary">
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="pt-6 pb-4 flex-row justify-between items-center">
          <Text className="text-3xl font-bold tracking-tight dark:text-white">{t('sermons:title')}</Text>
          <View className="flex-row items-center">
            <TouchableOpacity className="p-1 mr-3">
              <MaterialIcons name="tune" size={24} color="#1754cf" />
            </TouchableOpacity>
            <UserAvatar />
          </View>
        </View>

        {/* Search Bar */}
        <View className="relative mb-6">
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <MaterialIcons name="search" size={20} color="#94a3b8" />
          </View>
          <TextInput
            className="w-full bg-slate-200/50 dark:bg-surface-primary border-none rounded-xl py-3 pl-10 pr-4 text-sm dark:text-white"
            placeholder={t('sermons:search_placeholder')}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Segmented Filter */}
        <View className="bg-slate-200/50 dark:bg-surface-primary p-1 rounded-xl flex-row items-center mb-6">
          {(['Draft', 'Ready', 'Preached'] as const).map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFilter(item)}
              activeOpacity={0.7}
              className={`flex-1 py-2 items-center rounded-lg ${
                filter === item ? 'bg-white dark:bg-primary shadow-sm' : ''
              }`}
            >
              <Text className={`text-sm font-medium ${
                filter === item ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {getStatusLabel(item)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sermons List */}
        <FlatList
          data={filteredSermons}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SermonCard sermon={item} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <MaterialIcons name="description" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 font-medium text-center px-6">
                {searchQuery ? t('sermons:no_results') : t('sermons:no_sermons_in_status', { status: getStatusLabel(filter) })}
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="fixed absolute right-6 bottom-6 w-14 h-14 bg-accent-gold rounded-full shadow-lg items-center justify-center elevation-5"
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}


