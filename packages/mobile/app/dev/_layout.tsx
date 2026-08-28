import { Stack } from 'expo-router';

/**
 * Grupo SOLO DE DESARROLLO. Vive fuera del gate de autenticación
 * (`app/_layout.tsx`) porque su razón de ser es mirar pantallas cuando el
 * login no está disponible. En release no se navega a él.
 */
export default function DevLayout() {
    return (
        <Stack>
            <Stack.Screen name="preach" options={{ headerShown: false }} />
        </Stack>
    );
}
