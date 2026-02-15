import AsyncStorage from '@react-native-async-storage/async-storage';

export const reactNativePersistence = {
    type: 'LOCAL',
    _isAvailable: async () => true,
    _setPersistence: async (key: string, value: any) => {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
        } catch { }
    },
    _removePersistence: async (key: string) => {
        try {
            await AsyncStorage.removeItem(key);
        } catch { }
    },
    _getPersistence: async (key: string) => {
        try {
            const json = await AsyncStorage.getItem(key);
            return json ? JSON.parse(json) : null;
        } catch {
            return null;
        }
    },
};
