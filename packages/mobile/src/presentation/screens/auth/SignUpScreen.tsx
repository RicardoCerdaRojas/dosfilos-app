import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useAuthStore } from '@/presentation/state/auth.store';
import { useRouter } from 'expo-router';

export const SignUpScreen = () => {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor complete todos los campos');
      return;
    }

    if (password !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
    }

    if (password.length < 6) {
        Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }

    try {
      setLocalLoading(true);
      await signUp(email, password, firstName, lastName);
      // Auth listener in _layout will handle redirection
    } catch (error: any) {
      let msg = 'Error al registrarse';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'El email ya está en uso';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Email inválido';
      } else if (error.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil';
      }
      Alert.alert('Error', msg);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
    >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="w-full max-w-sm self-center">
            <Text className="text-3xl font-bold text-center mb-2 text-gray-800">
            Crear Cuenta
            </Text>
            <Text className="text-center text-gray-500 mb-8">
            Únete a nuestra comunidad
            </Text>
            
            <View className="flex-row justify-between mb-4">
                <TextInput
                    className="flex-1 bg-gray-100 border border-gray-300 rounded-lg p-4 mr-2 text-base"
                    placeholder="Nombre"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    editable={!localLoading}
                />
                <TextInput
                    className="flex-1 bg-gray-100 border border-gray-300 rounded-lg p-4 ml-2 text-base"
                    placeholder="Apellido"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={setLastName}
                    editable={!localLoading}
                />
            </View>

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

            <TextInput
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4 text-base"
            placeholder="Contraseña"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!localLoading}
            />

            <TextInput
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6 text-base"
            placeholder="Confirmar Contraseña"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!localLoading}
            />

            <TouchableOpacity
            className={`w-full bg-blue-600 rounded-lg p-4 flex-row justify-center items-center mb-4 ${
                localLoading ? 'opacity-70' : ''
            }`}
            onPress={handleSignUp}
            disabled={localLoading}
            >
            {localLoading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text className="text-white font-bold text-lg">
                Registrarse
                </Text>
            )}
            </TouchableOpacity>

            <TouchableOpacity
            onPress={() => router.back()}
            className="self-center p-2"
            disabled={localLoading}
            >
            <Text className="text-gray-500">
                ¿Ya tienes cuenta? <Text className="text-blue-600 font-bold">Inicia Sesión</Text>
            </Text>
            </TouchableOpacity>
        </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};
