import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Sermon } from '@/domain/models/sermon.model';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface SermonCardProps {
  sermon: Sermon;
}

export const SermonCard: React.FC<SermonCardProps> = ({ sermon }) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  const statusConfig = {
    Draft: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-300' },
    Working: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-blue-400' },
    Ready: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    Preached: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-400 dark:text-slate-500' },
  };

  const config = statusConfig[sermon.status] || statusConfig.Draft;
  const formattedDate = sermon.date ? new Date(sermon.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }) : '';

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Draft': return t('sermons:status_draft');
      case 'Working': return t('sermons:status_working');
      case 'Ready': return t('sermons:status_ready');
      case 'Preached': return t('sermons:status_preached');
      default: return status;
    }
  };

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/sermon/${sermon.id}`)}
      className="bg-white dark:bg-surface-primary p-5 rounded-xl border border-slate-100 dark:border-border-primary/30 shadow-sm mb-4 active:scale-[0.98]"
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className={`px-2 py-0.5 rounded ${config.bg}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
            {getStatusLabel(sermon.status)}
          </Text>
        </View>
        <Text className="text-xs text-slate-400 font-medium">{formattedDate}</Text>
      </View>

      <Text className="text-xl font-semibold leading-tight mb-1 text-slate-900 dark:text-white" numberOfLines={2}>
        {sermon.title}
      </Text>
      
      {sermon.passage && (
        <Text className="text-primary dark:text-primary font-medium text-sm mb-3 italic">
          {sermon.passage}
        </Text>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 mr-2">
            <Image 
              source={{ uri: sermon.thumbnailUrl || 'https://lh3.googleusercontent.com/a/default-user' }} 
              className="w-full h-full"
            />
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {sermon.preacher || 'Rev. Dr. Julian'}
          </Text>
        </View>
        
        <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
};


