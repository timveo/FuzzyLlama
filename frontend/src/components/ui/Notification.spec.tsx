import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider, notify } from './Notification';

describe('Notification System', () => {
  describe('NotificationProvider', () => {
    it('should render without errors', () => {
      const { container } = render(<NotificationProvider />);
      expect(container).toBeDefined();
    });
  });

  describe('notify.success', () => {
    it('should display success notification', async () => {
      render(<NotificationProvider />);

      notify.success('Success message', 'Success description');

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeDefined();
        expect(screen.getByText('Success description')).toBeDefined();
      });
    });
  });

  describe('notify.error', () => {
    it('should display error notification', async () => {
      render(<NotificationProvider />);

      notify.error('Error message', 'Error description');

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeDefined();
        expect(screen.getByText('Error description')).toBeDefined();
      });
    });
  });

  describe('notify.info', () => {
    it('should display info notification', async () => {
      render(<NotificationProvider />);

      notify.info('Info message', 'Info description');

      await waitFor(() => {
        expect(screen.getByText('Info message')).toBeDefined();
        expect(screen.getByText('Info description')).toBeDefined();
      });
    });
  });

  describe('notify.warning', () => {
    it('should display warning notification', async () => {
      render(<NotificationProvider />);

      notify.warning('Warning message', 'Warning description');

      await waitFor(() => {
        expect(screen.getByText('Warning message')).toBeDefined();
        expect(screen.getByText('Warning description')).toBeDefined();
      });
    });
  });

  describe('notify.promise', () => {
    it('should display loading, then success notification', async () => {
      render(<NotificationProvider />);

      const promise = Promise.resolve('Success data');

      notify.promise(promise, {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
      });

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeDefined();
      });

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeDefined();
      });
    });

    it('should display loading, then error notification on failure', async () => {
      render(<NotificationProvider />);

      const promise = Promise.reject(new Error('Failed'));

      notify.promise(promise, {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
      });

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeDefined();
      });

      await waitFor(() => {
        expect(screen.getByText('Error!')).toBeDefined();
      });
    });

    it('should support function-based messages', async () => {
      render(<NotificationProvider />);

      const promise = Promise.resolve({ name: 'Test' });

      notify.promise(promise, {
        loading: 'Loading...',
        success: (data) => `Created ${data.name}`,
        error: (err) => `Failed: ${err.message}`,
      });

      await waitFor(() => {
        expect(screen.getByText('Created Test')).toBeDefined();
      });
    });
  });
});
