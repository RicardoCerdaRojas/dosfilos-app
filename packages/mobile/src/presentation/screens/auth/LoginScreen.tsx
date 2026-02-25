import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/presentation/state/auth.store';
import { useUIStore } from '@/presentation/state/ui.store';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

export const LoginScreen = () => {
  const router = useRouter();
  const [resetMode, setResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  // Hook del UI Store para notificaciones
  const { showToast } = useUIStore();

  /* 
   * Configuración REPARADA:
   * 1. Hardcoded URI para pasar el bloqueo 400 de Google.
   * 2. 'token' (Implicit) Flow para evitar el error 404/Something went wrong del Proxy.
   * 3. useProxy: true para asegurar el enrutamiento.
   */
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "879645593010-pps33vrrc4s1i5fbhj71q3eam7f0vvav.apps.googleusercontent.com",
    redirectUri: "https://auth.expo.io/@ricardocerdarojas/mobile", 
    responseType: "token", 
    scopes: ['openid', 'profile', 'email'],
  });

  React.useEffect(() => {
    if (request) {
      console.log('--- CONFIGURATION RESTORED ---');
      console.log('Target URI:', request.redirectUri);
      console.log('Response Type:', request.responseType);
    }
  }, [request]);

  const { signIn, signUp, signInWithGoogle, resetPassword, isLoading } = useAuthStore();

  React.useEffect(() => {
    if (response?.type === 'success') {
      console.log('¡EXITO! Regresamos de Google.');
      console.log('Params:', response.params);
      
      const { access_token, id_token } = response.params;
      const token = id_token || access_token;
      
      if (token) {
        // Log para validar que tenemos credencial
        console.log('Token capturado:', token.substring(0, 15) + '...');
        signInWithGoogle(token);
      }
    } else if (response?.type === 'error') {
      console.error('Google Auth Error:', response.error);
      showToast('Error en autenticación con Google', 'error');
    }
  }, [response]);


  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Por favor ingrese email y contraseña', 'info');
      return;
    }

    try {
      setLocalLoading(true);
      await signIn(email, password); 
    } catch (error: any) {
      console.log('Login Error Object:', error); // Debugging
      let msg = 'Error al iniciar sesión';
      const errorCode = error.code || error.message; // Fallback to message if code is missing

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        msg = 'Credenciales inválidas. Por favor verifique su email y contraseña.';
      } else if (errorCode === 'auth/invalid-email') {
        msg = 'El formato del email no es válido.';
      } else if (errorCode === 'auth/too-many-requests') {
        msg = 'Demasiados intentos fallidos. Por favor intente más tarde.';
      }
      
      showToast(msg, 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      showToast('Por favor ingrese su email', 'info');
      return;
    }

    try {
      setLocalLoading(true);
      await resetPassword(email);
      showToast('Se ha enviado un enlace de recuperación a su email', 'success');
      setResetMode(false);
    } catch (error: any) {
      showToast('No se pudo enviar el email de recuperación', 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-6">
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-center mb-2 text-gray-800">
          DosFilos
        </Text>
        <Text className="text-center text-gray-500 mb-8">
          {resetMode ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
        </Text>
        
        <TextInput
          className="w-full bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4 text-base"
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!localLoading}
        />

        {!resetMode && (
          <TextInput
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6 text-base"
            placeholder="Contraseña"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!localLoading}
          />
        )}

        <TouchableOpacity
          className={`w-full bg-blue-600 rounded-lg p-4 flex-row justify-center items-center mb-4 ${
            localLoading ? 'opacity-70' : ''
          }`}
          onPress={resetMode ? handlePasswordReset : handleLogin}
          disabled={localLoading}
        >
          {localLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {resetMode ? 'Enviar Email de Recuperación' : 'Iniciar Sesión'}
            </Text>
          )}
        </TouchableOpacity>

        {/* 
          // DESACTIVADO TEMPORALMENTE
          // Google Auth en Expo Go requiere un "Auth Proxy" complejo que está fallando.
          // Funciona mejor en "Production Builds" (APK/IPA).
          // Lo reactivaremos para la build final.
          !resetMode && (
            <TouchableOpacity
              className="w-full bg-white border border-gray-300 rounded-lg p-4 flex-row justify-center items-center mb-4"
              onPress={() => promptAsync({ useProxy: true })}
              disabled={!request || localLoading}
            >
              <Text className="text-gray-700 font-bold text-lg">
                Conectar con Google (Próximamente)
              </Text>
            </TouchableOpacity>
          ) 
        */}

        <TouchableOpacity
          onPress={() => setResetMode(!resetMode)}
          className="self-center"
          disabled={localLoading}
        >
          <Text className="text-blue-600">
            {resetMode ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
            onPress={() => router.push('/(auth)/sign-up')}
            className="self-center mt-6"
            disabled={localLoading}
        >
            <Text className="text-gray-500">
                ¿No tienes cuenta? <Text className="text-blue-600 font-bold">Regístrate</Text>
            </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
