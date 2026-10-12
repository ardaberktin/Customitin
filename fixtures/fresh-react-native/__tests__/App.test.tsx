/**
 * @format
 */

import React from 'react';
import { render, cleanup, screen } from '@testing-library/react-native';
import { queryClient } from '../src/client';
afterEach(() => {
  cleanup();
  queryClient.clear();
});
import App from '../App';

test('renders correctly', async () => {
  render(<App />);
  await screen.findByLabelText('Open Trail 1');
});
