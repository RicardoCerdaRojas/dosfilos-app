import { Stack } from 'expo-router';

export default function BibleLayout() {
  return (
    <Stack 
      screenOptions={{ headerShown: false }}
      initialRouteName="index"
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="reader" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
