import React from 'react';
import { View, Text, Pressable, useColorScheme as useDeviceColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface BibleVersionCardProps {
  abbreviation: string;
  name: string;
  subtitle: string;
  language: string;
  isVerified?: boolean;
  isOriginal?: boolean;
  onPress?: () => void;
}

export const BibleVersionCard: React.FC<BibleVersionCardProps> = ({
  abbreviation,
  name,
  subtitle,
  language,
  isVerified,
  isOriginal,
  onPress,
}) => {
  const colorScheme = useDeviceColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    // WRAPPER VIEW FOR ROBUST LAYOUT
    <View 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isDark ? '#1e293b' : '#ffffff', // surface-primary : white
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
        marginBottom: 8,
        overflow: 'hidden', // Ensure Pressable doesn't bleed
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
        })}
      >
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View 
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              marginRight: 16,
              backgroundColor: isOriginal 
                ? 'rgba(23, 84, 207, 0.1)' 
                : isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
            }}
          >
            <Text 
              style={{
                fontWeight: 'bold',
                fontSize: 14,
                color: isOriginal 
                  ? '#1754cf' 
                  : isDark ? '#94a3b8' : '#475569',
              }}
            >
              {abbreviation}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text 
                style={{
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#0f172a',
                  marginRight: 8,
                }}
                numberOfLines={1}
              >
                {name}
              </Text>
              {isVerified && (
                <MaterialIcons name="verified" size={14} color="#1754cf" />
              )}
            </View>
            <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
        
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            paddingHorizontal: 8, 
            paddingVertical: 2, 
            borderRadius: 4, 
            borderWidth: 1, 
            borderColor: isDark ? '#334155' : '#cbd5e1',
            marginRight: 8 
          }}>
            <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '500', textTransform: 'uppercase' }}>
              {language}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
        </View>
      </Pressable>
    </View>
  );
};
