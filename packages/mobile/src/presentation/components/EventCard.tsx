import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Event } from '@/domain/models/event.model';
import { Link } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const startDate = new Date(event.startDate);
  const day = startDate.getDate();
  const month = startDate.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

  return (
    <Link href={`/event/${event.id}`} asChild>
      <TouchableOpacity className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden border border-gray-100 flex-row">
        <View className="bg-blue-50 w-20 justify-center items-center p-2 border-r border-blue-100">
          <Text className="text-blue-600 text-xs font-bold">{month}</Text>
          <Text className="text-gray-900 text-2xl font-bold">{day}</Text>
        </View>
        
        <View className="flex-1 p-4">
          <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={1}>
            {event.title}
          </Text>
          
          <View className="flex-row items-center mt-1">
             <IconSymbol name="clock" size={12} color="#6B7280" />
             <Text className="text-xs text-gray-500 ml-1">
                {startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
             </Text>
          </View>

          {event.location && (
            <View className="flex-row items-center mt-1">
               <IconSymbol name="mappin.and.ellipse" size={12} color="#6B7280" />
               <Text className="text-xs text-gray-500 ml-1" numberOfLines={1}>
                  {event.location}
               </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );
};
