import { DarkTheme as navigationDarkTheme, DefaultTheme as navigationDefaultTheme, ThemeProvider } from 'expo-router';
import { LogBox, View, useColorScheme as useDeviceColorScheme } from 'react-native';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from '@expo-google-fonts/lexend';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import 'react-native-reanimated';

// Ignore specific warnings
LogBox.ignoreLogs(['Sign in failed', 'Sign up failed', 'Google sign in failed']);

import { AppQueryClientProvider } from '@/core/providers/query-client.provider';
import { useThemeStore } from '@/presentation/state/theme.store';
import { useAuthStore } from '@/presentation/state/auth.store';
import { ToastNotification } from '@/presentation/components/ui/ToastNotification';
import { Colors } from '@/constants/theme';
import '../global.css';

// Initialize i18n
import '@/core/i18n';

// App Check antes de cualquier llamada al backend (M-04)
import { initAppCheck } from '@/core/config/appCheck';
initAppCheck().catch((err) => console.error('[appCheck] init failed:', err));

// Google Sign-In nativo (M-08) — configurar antes de que se monte el login
import { configureGoogleSignIn } from '@/core/config/socialAuth';
configureGoogleSignIn();
import { useLanguageStore } from '@/presentation/state/language.store';
import { useTranslation } from 'react-i18next';

export const unstable_settings = {
  initialRouteName: '(tabs)',
  bible: {
    initialRouteName: 'index',
  },
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom navigation themes based on our design system
const CustomDarkTheme = {
  ...navigationDarkTheme,
  colors: {
    ...navigationDarkTheme.colors,
    primary: '#1754cf',
    background: '#0b1120',
    card: '#0b1120',
    text: '#f8fafc',
    border: 'rgba(255, 255, 255, 0.05)',
  },
};

const CustomDefaultTheme = {
  ...navigationDefaultTheme,
  colors: {
    ...navigationDefaultTheme.colors,
    primary: '#1754cf',
    background: '#f6f6f8',
    card: '#ffffff',
    text: '#0f172a',
    border: '#e2e8f0',
  },
};

function RootLayoutNav() {
  const deviceColorScheme = useDeviceColorScheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const { language } = useLanguageStore();
  const { i18n } = useTranslation();
  const { user, isLoading } = useAuthStore();
  const [fontsLoaded, fontsError] = useFonts({
    Lexend: Lexend_400Regular,
    'Lexend-Medium': Lexend_500Medium,
    'Lexend-SemiBold': Lexend_600SemiBold,
    'Lexend-Bold': Lexend_700Bold,
  });
  const segments = useSegments();
  const router = useRouter();

  // Sync translation language
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  const isDark = useMemo(() => {
    if (themeMode === 'system') return deviceColorScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, deviceColorScheme]);

  // Sync our theme store with NativeWind
  useEffect(() => {
    setColorScheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    // Si las fuentes fallan (p.ej. asset no resoluble en dev) NO se bloquea el
    // arranque: se entra con la fuente del sistema.
    if (!isLoading && (fontsLoaded || fontsError)) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded, fontsError]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return null; // or a dedicated loading component
  }

  return (
    <ThemeProvider value={isDark ? CustomDarkTheme : CustomDefaultTheme}>
      {/* hideAsync desde un effect temprano tiene carrera con el registro del
          overlay nativo (pantalla blanca intermitente en cold start); el
          onLayout del root es el punto que Expo documenta como seguro. */}
      <View
        style={{ flex: 1 }}
        onLayout={() => {
          SplashScreen.hideAsync();
        }}
      >
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="sermon/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="preach/[id]"
            options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <ToastNotification />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppQueryClientProvider>
      <RootLayoutNav />
    </AppQueryClientProvider>
  );
}
