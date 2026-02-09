import { Text, View } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-bold text-blue-600">DosFilos Mobile</Text>
      <Text className="text-gray-500 mt-2">Sermons MVP</Text>
      <Link href="/login" className="mt-4 text-blue-500 underline">
        Go to Login
      </Link>
    </View>
  );
}
