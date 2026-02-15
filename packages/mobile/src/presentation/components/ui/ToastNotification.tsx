import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore, ToastType } from '@/presentation/state/ui.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getIconName = (type: ToastType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'success': return 'checkmark-circle';
    case 'error': return 'alert-circle';
    case 'info': return 'information-circle';
    default: return 'information-circle';
  }
};

export const ToastNotification = () => {
  const { toast, hideToast } = useUIStore();
  const insets = useSafeAreaInsets();

  if (!toast || !toast.visible) return null;

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      exiting={FadeOutUp}
      style={[
        styles.container,
        { top: insets.top + 12 } 
      ]}
      pointerEvents="box-none"
    >
      <View className={`flex-row items-center justify-between px-4 py-3 rounded-2xl shadow-xl w-[92%] self-center ${bgColors[toast.type] || 'bg-gray-800'}`}>
            <View className="flex-row items-center flex-1">
                <Ionicons name={getIconName(toast.type)} size={28} color="white" />
                <View className="ml-3 flex-1">
                    <Text className="text-white font-bold text-base">
                        {toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Éxito' : 'Información'}
                    </Text>
                    <Text className="text-white/90 text-sm leading-4 mt-0.5">
                        {toast.message}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={hideToast} className="p-1 ml-2">
                <Ionicons name="close" size={20} color="white" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
});
