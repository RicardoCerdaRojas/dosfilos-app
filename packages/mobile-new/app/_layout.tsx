import { View, Text } from 'react-native';
import { Slot } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  console.log("MINIMAL LAYOUT MOUNTED");
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black' }}>
        ¡Hola! Mobile New Works 🚀
      </Text>
      <Text style={{ marginTop: 20, color: 'gray' }}>
        Development Build Successful
      </Text>
      <View style={{ height: 200, width: '100%', marginTop: 20 }}>
         {/* Render the current route */}
         <Slot /> 
      </View>
    </View>
  );
}
