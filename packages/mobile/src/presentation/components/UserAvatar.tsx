import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/core/theme/appTheme';
import { useAuthStore } from '@/presentation/state/auth.store';

/** Iniciales del nombre; si no hay nombre, del correo. */
function initials(first?: string, last?: string, email?: string): string {
    const fromName = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.trim();
    if (fromName) return fromName.toUpperCase();
    return (email?.[0] ?? '·').toUpperCase();
}

/**
 * El avatar del pastor.
 *
 * Era una foto de archivo cargada por URL: la misma cara para todos los
 * usuarios, traída de internet en una app que tiene que funcionar sin señal.
 * Las iniciales son de verdad, son suyas y no piden red.
 */
export function UserAvatar() {
    const router = useRouter();
    const theme = useAppTheme();
    const user = useAuthStore((s) => s.user);

    return (
        <TouchableOpacity
            onPress={() => router.navigate('/profile')}
            accessibilityRole="button"
            className="items-center justify-center active:opacity-70"
            style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.accentSoft,
                borderWidth: 1,
                borderColor: theme.border,
            }}
        >
            <Text style={{ color: theme.accent, fontSize: 14 }} className="font-lexend-semibold">
                {initials(user?.firstName, user?.lastName, user?.email)}
            </Text>
        </TouchableOpacity>
    );
}
