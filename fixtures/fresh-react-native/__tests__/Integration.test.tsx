import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import {useHostConfiguration} from '../personalize/config';
import { navigationRef } from '../src/navigation';
import { queryClient } from '../src/client';
import {renameTrail} from '../src/trails';

jest.mock('../personalize/config', () => ({
  ...jest.requireActual('../personalize/config'),
  planner: require('../test-support/planner').planner,
  useHostConfiguration: jest.fn(() => ({scope: 'local-device'})),
}));

beforeEach(async () => {
  jest.mocked(useHostConfiguration).mockReturnValue({scope: 'local-device'});
  await AsyncStorage.clear();
  queryClient.clear();
});
afterEach(() => {
  cleanup();
  queryClient.clear();
});

it('preserves native screen state, applies filtered data and host components, persists, invalidates and opens host details', async () => {
  const app = render(<App />);
  await screen.findByLabelText('Trip notes');
  fireEvent.changeText(screen.getByLabelText('Trip notes'), 'Bring water');
  fireEvent.press(screen.getByText('Customize'));
  await waitFor(() =>
    expect(screen.getByTestId('customization-prompt')).toBeEnabled(),
  );
  fireEvent.changeText(
    screen.getByTestId('customization-prompt'),
    'Show favorite trails',
  );
  fireEvent.press(screen.getByTestId('preview-button'));
  await screen.findByTestId('preview-panel');
  await waitFor(() => expect(screen.getByTestId('apply-button')).toBeEnabled());
  await act(async () => {
    fireEvent.press(screen.getByTestId('apply-button'));
  });
  await waitFor(() => {
    expect(screen.queryByRole('alert')?.props.children).toBeUndefined();
    expect(screen.queryByTestId('preview-panel')).toBeNull();
  });
  fireEvent.press(screen.getByText('My space'));
  await screen.findByText('Ready for a hike');
  await screen.findByLabelText('Open Trail 35');
  expect(screen.queryByLabelText('Open Trail 34')).toBeNull();
  expect(
    screen.getAllByRole('button', { name: /^Open Trail/ })[0].props
      .accessibilityLabel,
  ).toBe('Open Trail 35');
  await act(async () => {
    await renameTrail('35', 'Updated trail');
  });
  fireEvent.press(await screen.findByLabelText('Open Updated trail'));
  await screen.findByText('Trail details: Updated trail');
  act(() => navigationRef.goBack());
  expect(await screen.findByDisplayValue('Bring water')).toBeTruthy();
  app.unmount();
  const restarted = render(<App />);
  fireEvent.press(await screen.findByText('My space'));
  await screen.findByText('Ready for a hike');
  await screen.findByLabelText('Open Updated trail');
  jest.mocked(useHostConfiguration).mockReturnValue({scope: 'another-profile'});
  restarted.rerender(<App />);
  await screen.findByText('Your personal space');
  expect(screen.queryByText('Ready for a hike')).toBeNull();
  jest.mocked(useHostConfiguration).mockReturnValue({scope: 'local-device'});
  restarted.rerender(<App />);
  await screen.findByText('Ready for a hike');
});

it('supports offline appearance preview, apply, undo and reset', async () => {
  render(<App />);
  fireEvent.press(screen.getByText('Customize'));
  const dark = await screen.findByRole('button', {
    name: 'Reading theme: Dark',
  });
  await waitFor(() => expect(dark).toBeEnabled());
  fireEvent.press(dark);
  await screen.findByTestId('preview-panel');
  await waitFor(() => expect(screen.getByTestId('apply-button')).toBeEnabled());
  await act(async () => {
    fireEvent.press(screen.getByTestId('apply-button'));
  });
  await waitFor(() => {
    expect(screen.queryByRole('alert')?.props.children).toBeUndefined();
    expect(screen.queryByTestId('preview-panel')).toBeNull();
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('undo-button'));
  });
  await act(async () => {
    fireEvent.press(screen.getByText('Restore original'));
  });
});
