import { createNavigationContainerRef } from '@react-navigation/native';

export type RootParamList = {
  Home: undefined;
  Trail: { id: string };
};

export const navigationRef = createNavigationContainerRef<RootParamList>();
