import React, { useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/presentation/state/auth.store';
import { useUIStore } from '@/presentation/state/ui.store';
import { getGoogleIdToken } from '@/core/config/socialAuth';

/**
 * El registro NO ocurre en la app: la política es payment-first en la web
 * (M-08). Google y Apple son SOLO login — abren la sesión de una cuenta que
 * ya existe.
 */
const WEB_REGISTER_URL = 'https://app.preach.dosfilos.com/register';

export const LoginScreen = () => {
    const [resetMode, setResetMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    const [appleAvailable, setAppleAvailable] = useState(false);

    const { t } = useTranslation();
    const { showToast } = useUIStore();
    const { signIn, signInWithGoogle, signInWithApple, resetPassword } = useAuthStore();

    React.useEffect(() => {
        if (Platform.OS !== 'ios') return;
        AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }, []);

    const describeAuthError = (error: any): string => {
        const code = error?.code || error?.message;
        if (
            code === 'auth/invalid-credential' ||
            code === 'auth/user-not-found' ||
            code === 'auth/wrong-password'
        ) {
            return t('auth:error_invalid_credentials');
        }
        if (code === 'auth/invalid-email') return t('auth:error_invalid_email');
        if (code === 'auth/too-many-requests') return t('auth:error_too_many_requests');
        return t('auth:error_generic');
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showToast(t('auth:enter_email_password'), 'info');
            return;
        }
        try {
            setLocalLoading(true);
            await signIn(email, password);
        } catch (error: any) {
            showToast(describeAuthError(error), 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            setLocalLoading(true);
            const idToken = await getGoogleIdToken();
            if (!idToken) return; // cancelado por el usuario
            await signInWithGoogle(idToken);
        } catch (error: any) {
            showToast(describeAuthError(error), 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    const handleApple = async () => {
        try {
            setLocalLoading(true);
            // Apple firma el HASH del nonce; Firebase recibe el nonce en claro
            // y compara. Sin esto el token es rechazado por replay.
            const rawNonce = Crypto.randomUUID();
            const hashedNonce = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                rawNonce,
            );
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });
            if (!credential.identityToken) {
                showToast(t('auth:error_generic'), 'error');
                return;
            }
            await signInWithApple(credential.identityToken, rawNonce);
        } catch (error: any) {
            if (error?.code === 'ERR_REQUEST_CANCELED') return;
            showToast(describeAuthError(error), 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            showToast(t('auth:enter_email'), 'info');
            return;
        }
        try {
            setLocalLoading(true);
            await resetPassword(email);
            showToast(t('auth:reset_sent'), 'success');
            setResetMode(false);
        } catch {
            showToast(t('auth:reset_failed'), 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-white p-6">
            <View className="w-full max-w-sm">
                <Text className="text-3xl font-lexend-bold text-center mb-1 text-slate-900">
                    Dos Filos Preach
                </Text>
                <Text className="text-center text-slate-500 font-lexend mb-8">
                    {resetMode ? t('auth:reset_title') : t('auth:sign_in')}
                </Text>

                <TextInput
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-4 mb-4 text-base font-lexend"
                    placeholder={t('auth:email')}
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    editable={!localLoading}
                />

                {!resetMode && (
                    <TextInput
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg p-4 mb-6 text-base font-lexend"
                        placeholder={t('auth:password')}
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="current-password"
                        editable={!localLoading}
                    />
                )}

                <TouchableOpacity
                    className="w-full bg-primary rounded-lg p-4 flex-row justify-center items-center mb-5 active:opacity-80"
                    style={{ opacity: localLoading ? 0.7 : 1 }}
                    onPress={resetMode ? handlePasswordReset : handleLogin}
                    disabled={localLoading}
                >
                    {localLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-lexend-semibold text-lg">
                            {resetMode ? t('auth:send_reset') : t('auth:sign_in')}
                        </Text>
                    )}
                </TouchableOpacity>

                {!resetMode && (
                    <>
                        <View className="flex-row items-center mb-5">
                            <View className="flex-1 h-px bg-slate-200" />
                            <Text className="text-slate-400 font-lexend text-xs mx-3">
                                {t('auth:or')}
                            </Text>
                            <View className="flex-1 h-px bg-slate-200" />
                        </View>

                        <TouchableOpacity
                            onPress={handleGoogle}
                            disabled={localLoading}
                            className="w-full bg-white border border-slate-300 rounded-lg p-4 flex-row justify-center items-center mb-3 active:opacity-80"
                        >
                            <Text className="text-slate-700 font-lexend-semibold text-base">
                                {t('auth:continue_google')}
                            </Text>
                        </TouchableOpacity>

                        {appleAvailable && (
                            <AppleAuthentication.AppleAuthenticationButton
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                cornerRadius={8}
                                style={{ width: '100%', height: 52, marginBottom: 12 }}
                                onPress={handleApple}
                            />
                        )}
                    </>
                )}

                <TouchableOpacity
                    onPress={() => setResetMode(!resetMode)}
                    className="self-center mt-2"
                    disabled={localLoading}
                >
                    <Text className="text-primary font-lexend">
                        {resetMode ? t('auth:back_to_sign_in') : t('auth:forgot_password')}
                    </Text>
                </TouchableOpacity>

                {!resetMode && (
                    <TouchableOpacity
                        onPress={() => Linking.openURL(WEB_REGISTER_URL)}
                        className="self-center mt-6"
                        disabled={localLoading}
                    >
                        <Text className="text-slate-500 font-lexend text-center">
                            {t('auth:no_account')}{' '}
                            <Text className="text-primary font-lexend-semibold">
                                {t('auth:register_on_web')}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
