import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useUpcomingEvents } from '@/presentation/hooks/useEvents';
import { EventCard } from '@/presentation/components/EventCard';

export default function EventListScreen() {
  const { data: events, isLoading, error, refetch } = useUpcomingEvents();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-4">
        <Text className="text-red-500 text-center mb-4">Error al cargar eventos</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
       <View className="pt-12 px-4 pb-4 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Próximos Eventos</Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={{ padding: 16 }}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-gray-500">No hay eventos próximos</Text>
          </View>
        }
      />
    </View>
  );
}
