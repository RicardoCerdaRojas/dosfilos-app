import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export function UserAvatar() {
  const router = useRouter();

  return (
    <TouchableOpacity 
      onPress={() => router.navigate('/profile')}
      className="active:opacity-70"
    >
      <Image
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGHn54S6_m1wDutT6kqJOFnk4aCvf9Mle5k1eoYl_0o_2QRYut_df-lQdAl9SrVEkFTkUjQUirljQ4w6bZFP-81ryIHmnpNtZqUNAdHEc2CFakcDlX3UpSpzSXzuDgV8p5MeZC6SNlbbLlyS3cIF7HH5EC35YcdjVRbYdyeTO0_9UkHz-9j3aCISu7kw-0LUvj-6dhkYA5g5ElNmx6A5ptV2nc6KUPe6s5AYiz-SykD6UebkSOjav-wen3niVy4ug1wf4pFAviAoYL' }}
        className="w-10 h-10 rounded-full border-2 border-primary/30"
      />
    </TouchableOpacity>
  );
}
