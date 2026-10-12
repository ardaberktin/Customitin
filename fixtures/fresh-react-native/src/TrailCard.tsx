import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import type { Trail } from './trails';

export function TrailCard({
  trail,
  onPress,
}: {
  trail: Trail;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${trail.title}`}
      onPress={onPress}
    >
      <Text>{trail.title}</Text>
      <Text>
        {trail.distance} km · {trail.terrain}
      </Text>
    </Pressable>
  );
}

export function Greeting({
  message = 'Explore your trails',
}: {
  message?: string;
}) {
  useQueryClient();
  return <Text>{message}</Text>;
}
