import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image, ScrollView } from 'react-native';
import { useAuthStore } from '@/presentation/state/auth.store';
import { useThemeStore, ThemeMode } from '@/presentation/state/theme.store';
import { useLanguageStore, Language } from '@/presentation/state/language.store';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();

  const themeOptions: { label: string; value: ThemeMode; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { label: t('common:light'), value: 'light', icon: 'light-mode' },
    { label: t('common:dark'), value: 'dark', icon: 'dark-mode' },
    { label: t('common:system'), value: 'system', icon: 'settings-brightness' },
  ];

  const languageOptions: { label: string; value: Language; flag: string }[] = [
    { label: t('common:spanish'), value: 'es', flag: '🇪🇸' },
    { label: t('common:english'), value: 'en', flag: '🇺🇸' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-primary">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          <View className="flex-row items-center mb-8">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="mr-4 p-2 bg-slate-100 dark:bg-background-secondary rounded-full border border-slate-200 dark:border-white/5"
            >
              <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-white" color={themeMode === 'light' ? '#0f172a' : 'white'} />
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white">{t('common:profile')}</Text>
          </View>
          
          {/* User Profile Info */}
          <View className="items-center mb-10">
            <View className="relative">
              <View className="w-24 h-24 rounded-full border-4 border-primary/20 p-1">
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGHn54S6_m1wDutT6kqJOFnk4aCvf9Mle5k1eoYl_0o_2QRYut_df-lQdAl9SrVEkFTkUjQUirljQ4w6bZFP-81ryIHmnpNtZqUNAdHEc2CFakcDlX3UpSpzSXzuDgV8p5MeZC6SNlbbLlyS3cIF7HH5EC35YcdjVRbYdyeTO0_9UkHz-9j3aCISu7kw-0LUvj-6dhkYA5g5ElNmx6A5ptV2nc6KUPe6s5AYiz-SykD6UebkSOjav-wen3niVy4ug1wf4pFAviAoYL' }}
                  className="w-full h-full rounded-full"
                />
              </View>
              <TouchableOpacity 
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-white dark:border-background-primary"
              >
                <MaterialIcons name="edit" size={16} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-2xl font-bold text-slate-900 dark:text-white mt-4">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 font-medium">
              {user?.email}
            </Text>
            
            <View className="mt-4 px-4 py-1.5 bg-academic-gold/10 rounded-full border border-academic-gold/20">
              <Text className="text-xs font-bold text-academic-gold uppercase tracking-wider">Plan Teólogo</Text>
            </View>
          </View>

          {/* Theme Section */}
          <View className="bg-white dark:bg-background-secondary rounded-[32px] p-6 mb-6 shadow-sm border border-slate-100 dark:border-white/5">
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">{t('common:appearance')}</Text>
            
            <View className="flex-row justify-between">
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setThemeMode(option.value)}
                  className={`flex-1 items-center py-4 rounded-2xl border ${
                    themeMode === option.value 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-slate-50 dark:bg-background-primary border-slate-100 dark:border-white/5'
                  } mx-1`}
                >
                  <MaterialIcons 
                    name={option.icon} 
                    size={24} 
                    color={themeMode === option.value ? '#1754cf' : '#64748b'} 
                  />
                  <Text className={`mt-2 text-xs font-bold ${
                    themeMode === option.value ? 'text-primary' : 'text-slate-500'
                  }`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language Section */}
          <View className="bg-white dark:bg-background-secondary rounded-[32px] p-6 mb-6 shadow-sm border border-slate-100 dark:border-white/5">
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">{t('common:language')}</Text>
            
            <View className="flex-row justify-between">
              {languageOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setLanguage(option.value)}
                  className={`flex-1 items-center py-4 rounded-2xl border ${
                    language === option.value 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-slate-50 dark:bg-background-primary border-slate-100 dark:border-white/5'
                  } mx-1`}
                >
                  <Text className="text-2xl mb-1">{option.flag}</Text>
                  <Text className={`text-xs font-bold ${
                    language === option.value ? 'text-primary' : 'text-slate-500'
                  }`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Settings Section */}
          <View className="bg-white dark:bg-background-secondary rounded-[32px] p-2 shadow-sm border border-slate-100 dark:border-white/5 mb-6">
            <TouchableOpacity className="flex-row items-center p-4 border-b border-slate-50 dark:border-white/5">
              <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-background-primary items-center justify-center mr-4">
                <MaterialIcons name="person-outline" size={20} color="#64748b" />
              </View>
              <Text className="flex-1 text-base font-bold text-slate-700 dark:text-slate-200">{t('common:edit_profile')}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center p-4 border-b border-slate-50 dark:border-white/5">
              <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-background-primary items-center justify-center mr-4">
                <MaterialIcons name="notifications-none" size={20} color="#64748b" />
              </View>
              <Text className="flex-1 text-base font-bold text-slate-700 dark:text-slate-200">{t('common:notifications')}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={signOut}
              className="flex-row items-center p-4"
            >
              <View className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mr-4">
                <MaterialIcons name="logout" size={20} color="#EF4444" />
              </View>
              <Text className="flex-1 text-base font-bold text-red-500">{t('common:logout')}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View className="items-center pb-10">
            <Text className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[4px]">Dos Filos App</Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">v0.1.2</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
