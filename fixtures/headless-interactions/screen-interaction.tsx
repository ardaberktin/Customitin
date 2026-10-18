import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

export async function run() {
  try {
    render(<App />);
    await screen.findByText(/Original (web|native) screen/);
    fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
    assert.ok(screen.getByRole('button', { name: 'Count 1' }));
    assert.ok(screen.getByText('Original data: 5'));
    console.log(
      'Generated existing screen shares the provider and retains host callbacks.',
    );
  } finally {
    cleanup();
  }
}
