import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEvent } from '@/presentation/hooks/useEvents';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id!);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-red-500">Error al cargar el evento</Text>
      </View>
    );
  }

  const handleRegister = () => {
    if (event.registrationUrl) {
      Linking.openURL(event.registrationUrl);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Detalles del Evento' }} />
      <ScrollView className="flex-1 bg-white">
        {event.imageUrl && (
          <Image
            source={{ uri: event.imageUrl }}
            className="w-full h-64"
            resizeMode="cover"
          />
        )}
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-900 mb-2">{event.title}</Text>
          
          <View className="flex-row items-center mb-2">
            <IconSymbol name="calendar" size={16} color="#4B5563" />
            <Text className="text-gray-600 ml-2">
              {new Date(event.startDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <IconSymbol name="clock" size={16} color="#4B5563" />
            <Text className="text-gray-600 ml-2">
               {new Date(event.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {event.location && (
             <View className="flex-row items-center mb-4">
                <IconSymbol name="mappin.and.ellipse" size={16} color="#4B5563" />
                <Text className="text-gray-600 ml-2">{event.location}</Text>
             </View>
          )}

          <Text className="text-base text-gray-800 leading-6 mb-6">
            {event.description}
          </Text>

          {event.registrationUrl && (
            <TouchableOpacity 
              className="bg-blue-600 py-3 rounded-lg items-center"
              onPress={handleRegister}
            >
              <Text className="text-white font-bold text-lg">Registrarse</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}
