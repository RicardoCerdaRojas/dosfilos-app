import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuthStore } from '@/presentation/state/auth.store';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  ActiveSermonCard, 
  QuickActionButton, 
  RecentSermonItem,
  DashboardStatsCard
} from '@/presentation/components/dashboard';
import { UserAvatar } from '@/presentation/components/UserAvatar';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-primary">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="py-6 flex-row justify-between items-center">
          <View>
            <Text className="text-xs uppercase tracking-widest text-primary font-semibold">
              Theologos Studio
            </Text>
            <Text className="text-2xl font-bold dark:text-academic-beige">
              {t('home:welcome')} {user?.firstName || 'Dr. Julian'}
            </Text>
            <View className="flex-row items-center mt-1">
              <MaterialIcons name="sync" size={12} color="#64748b" />
              <Text className="text-[10px] text-slate-500 ml-1">
                {t('home:last_synced', { minutes: 2 })}
              </Text>
            </View>
          </View>
          <UserAvatar />
        </View>

        {/* Active Sermon Card */}
        <ActiveSermonCard 
          title="The Grace of the Epistles"
          passage="Ephesians 2:1-10"
          progress={65}
        />

        {/* Progress Section */}
        <View className="flex-row mb-8">
          <DashboardStatsCard 
            icon="auto-stories"
            label={t('home:study_goal')}
            value="4/10"
            subtitle={t('home:chapters')}
            progress={40}
            color="primary"
          />
          <DashboardStatsCard 
            icon="schedule"
            label={t('home:reading')}
            value="20"
            subtitle={t('home:min_left')}
            progress={70}
            color="gold"
          />
        </View>

        {/* Quick Actions Grid */}
        <View className="mb-8">
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 ml-1">
            {t('home:quick_actions')}
          </Text>
          <View className="flex-row justify-between">
            <QuickActionButton 
              icon="psychology" 
              label={t('home:start_study')} 
              color="primary" 
              onPress={() => router.navigate('/bible')} 
            />
            <QuickActionButton 
              icon="import-contacts" 
              label={t('home:open_bible')} 
              color="academic-gold" 
              onPress={() => router.navigate('/bible')} 
            />
            <QuickActionButton 
              icon="add-circle-outline" 
              label={t('home:new_sermon')} 
              color="primary" 
            />
          </View>
        </View>

        {/* Recent Sermons Section */}
        <View className="pb-10">
          <View className="flex-row justify-between items-center mb-4 ml-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {t('home:recent_sermons')}
            </Text>
            <TouchableOpacity>
              <Text className="text-[11px] font-semibold text-primary">{t('home:view_all')}</Text>
            </TouchableOpacity>
          </View>
          
          <RecentSermonItem 
            title="The Sermon on the Mount" 
            passage="Matthew 5:1-12" 
            time={t('home:edited_ago', { time: '2h' })} 
          />
          <RecentSermonItem 
            title="Faith vs. Works" 
            passage="James 2" 
            time={t('home:yesterday')} 
          />
          <RecentSermonItem 
            title="The Great Commission" 
            passage="Matthew 28" 
            time={t('home:days_ago', { count: 3 })} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



