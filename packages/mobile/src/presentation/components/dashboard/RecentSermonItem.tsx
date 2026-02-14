import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface RecentSermonItemProps {
  title: string;
  passage: string;
  time: string;
}

export const RecentSermonItem: React.FC<RecentSermonItemProps> = ({ title, passage, time }) => {
  return (
    <TouchableOpacity 
      className="flex-row items-center p-4 bg-white dark:bg-navy-muted rounded-2xl border border-slate-100 dark:border-white/5 mb-3 shadow-sm"
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 items-center justify-center mr-4">
        <MaterialIcons name="description" size={20} color="#94a3b8" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold dark:text-academic-beige">{title}</Text>
        <View className="flex-row items-center mt-0.5">
          <Text className="text-[10px] text-slate-500">{passage}</Text>
          <View className="w-1 h-1 rounded-full bg-slate-300 mx-1.5" />
          <Text className="text-[10px] text-slate-500">{time}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );
};
