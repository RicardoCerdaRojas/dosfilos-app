import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface QuickActionButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: 'primary' | 'academic-gold';
  onPress?: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label, color, onPress }) => {
  const bgColor = color === 'primary' ? 'bg-primary/10' : 'bg-academic-gold/10';
  const iconColor = color === 'primary' ? '#1754cf' : '#c5a059';

  return (
    <TouchableOpacity 
      className="flex-1 items-center justify-center bg-white dark:bg-navy-muted aspect-square rounded-2xl border border-slate-100 dark:border-white/5 mx-1 shadow-sm"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className={`w-12 h-12 ${bgColor} rounded-full items-center justify-center mb-2`}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <Text className="text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 text-center px-1">
        {label}
      </Text>
    </TouchableOpacity>
  );
};

