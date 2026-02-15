import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DashboardStatsCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  subtitle: string;
  progress: number;
  color: 'primary' | 'gold';
}

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({ 
  icon, 
  label, 
  value, 
  subtitle, 
  progress,
  color 
}) => {
  const iconColor = color === 'primary' ? '#1754cf' : '#c5a059';
  const progressColor = color === 'primary' ? 'bg-primary' : 'bg-academic-gold';

  return (
    <View className="flex-1 bg-white dark:bg-navy-muted p-4 rounded-xl border border-slate-200 dark:border-white/5 mx-1">
      <View className="flex-row items-center space-x-2 mb-3">
        <MaterialIcons name={icon} size={14} color={iconColor} />
        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </Text>
      </View>
      
      <View className="flex-row items-baseline mb-2">
        <Text className="text-lg font-bold dark:text-academic-beige mr-1">{value}</Text>
        <Text className="text-[10px] text-slate-400 font-medium">{subtitle}</Text>
      </View>

      <View className="w-full bg-slate-100 dark:bg-white/10 h-1 rounded-full">
        <View 
          className={`${progressColor} h-full rounded-full`} 
          style={{ width: `${progress}%` }} 
        />
      </View>
    </View>
  );
};
