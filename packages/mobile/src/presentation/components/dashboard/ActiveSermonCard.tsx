import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export interface ActiveSermonCardProps {
  title: string;
  passage: string;
  progress: number;
}

export const ActiveSermonCard: React.FC<ActiveSermonCardProps> = ({ title, passage, progress }) => {
  const { t } = useTranslation();

  return (
    <View className="relative overflow-hidden rounded-3xl bg-primary p-6 shadow-xl shadow-primary/20 mb-8">
      <View className="flex-row justify-between items-start mb-4">
        <View className="px-2 py-1 bg-white/20 rounded">
          <Text className="text-[10px] font-bold tracking-wider uppercase text-white">{t('sermons:active_sermon_label')}</Text>
        </View>
        <Text className="text-xs font-medium text-white/80">{t('sermons:prepared_percent', { percent: progress })}</Text>
      </View>
      
      <Text className="text-2xl font-bold text-white mb-1 leading-tight">
        {title}
      </Text>
      <View className="flex-row items-center mb-6">
        <MaterialIcons name="menu-book" size={12} color="#c5a059" />
        <Text className="text-white/80 text-sm ml-1">{passage}</Text>
      </View>

      <View className="w-full bg-white/20 h-1.5 rounded-full mb-6">
        <View className="bg-academic-gold h-full rounded-full" style={{ width: `${progress}%` }} />
      </View>

      <TouchableOpacity 
        className="w-full bg-white py-3 rounded-xl flex-row justify-center items-center"
        activeOpacity={0.8}
      >
        <MaterialIcons name="play-arrow" size={20} color="#1754cf" />
        <Text className="text-primary font-bold ml-2 text-base">{t('sermons:resume_preparation')}</Text>
      </TouchableOpacity>
      
      {/* Decorative elements */}
      <View className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-[40px] opacity-20" />
      <View className="absolute -left-8 -top-8 w-32 h-32 bg-academic-gold/20 rounded-full blur-[30px] opacity-30" />
    </View>
  );
};
