import { View, Text } from 'react-native';

export default function RootLayout() {
  console.log("DEBUG: RootLayout mounted");
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'cyan' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>DEBUG MODE</Text>
      <Text>If you see this, Expo Router is working!</Text>
    </View>
  );
}
