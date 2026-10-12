import React, { useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootParamList } from './navigation';
import { trailOptions, renameTrail } from './trails';
import { TrailCard } from './TrailCard';

export function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootParamList, 'Home'>) {
  const [draft, setDraft] = useState('');
  const { data = [] } = useQuery(trailOptions());
  return (
    <ScrollView>
      <TextInput
        accessibilityLabel="Trip notes"
        value={draft}
        onChangeText={setDraft}
      />
      {data.map(trail => (
        <TrailCard
          key={trail.id}
          trail={trail}
          onPress={() => navigation.navigate('Trail', { id: trail.id })}
        />
      ))}
    </ScrollView>
  );
}

export function TrailScreen({
  route,
}: NativeStackScreenProps<RootParamList, 'Trail'>) {
  const { data = [] } = useQuery(trailOptions());
  const trail = data.find(item => item.id === route.params.id);
  return (
    <View>
      <Text>Trail details: {trail?.title}</Text>
      <Button
        title="Rename trail"
        onPress={() => {
          renameTrail(route.params.id, 'Updated trail').catch(console.error);
        }}
      />
    </View>
  );
}
