import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitHubConnect } from './GitHubConnect';

describe('GitHubConnect', () => {
  const mockOnConnect = vi.fn();
  const mockOnDisconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Disconnected State', () => {
    it('should render connect button when not connected', () => {
      render(
        <GitHubConnect
          isConnected={false}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('Connect GitHub')).toBeDefined();
      expect(screen.getByText('GitHub Integration')).toBeDefined();
    });

    it('should display description text when disconnected', () => {
      render(
        <GitHubConnect
          isConnected={false}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(
        screen.getByText(/Connect your GitHub account to export generated code/i)
      ).toBeDefined();
    });

    it('should call onConnect when connect button clicked', async () => {
      mockOnConnect.mockResolvedValue(undefined);

      render(
        <GitHubConnect
          isConnected={false}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const connectButton = screen.getByText('Connect GitHub');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockOnConnect).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state while connecting', async () => {
      mockOnConnect.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <GitHubConnect
          isConnected={false}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const connectButton = screen.getByText('Connect GitHub');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(connectButton).toHaveAttribute('disabled');
      });
    });
  });

  describe('Connected State', () => {
    it('should render disconnect button when connected', () => {
      render(
        <GitHubConnect
          isConnected={true}
          connectedAccount="testuser"
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('Disconnect GitHub')).toBeDefined();
    });

    it('should display connected account name', () => {
      render(
        <GitHubConnect
          isConnected={true}
          connectedAccount="testuser"
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('testuser')).toBeDefined();
      expect(screen.getByText(/Connected as/i)).toBeDefined();
    });

    it('should show green connection indicator', () => {
      const { container } = render(
        <GitHubConnect
          isConnected={true}
          connectedAccount="testuser"
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).toBeDefined();
    });

    it('should display connected description', () => {
      render(
        <GitHubConnect
          isConnected={true}
          connectedAccount="testuser"
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText(/You can now export your projects/i)).toBeDefined();
    });

    it('should show confirmation dialog before disconnect', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <GitHubConnect
          isConnected={true}
          connectedAccount="testuser"
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const disconnectButton = screen.getByText('Disconnect GitHub');
      fireEvent.click(disconnectButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to disconnect your GitHub account?'
      );
      expect(mockOnDisconnect).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should call onDisconnect when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockOnDisconnect.mockResolvedValue(undefined);

      render(
        <GitHubConnect
          isConnected={true}
          connectedAccount="testuser"
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const disconnectButton = screen.getByText('Disconnect GitHub');
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
      });

      confirmSpy.mockRestore();
    });
  });

  describe('GitHub Logo', () => {
    it('should render GitHub logo SVG', () => {
      const { container } = render(
        <GitHubConnect
          isConnected={false}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const logo = container.querySelector('svg');
      expect(logo).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnConnect.mockRejectedValue(new Error('Connection failed'));

      render(
        <GitHubConnect
          isConnected={false}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const connectButton = screen.getByText('Connect GitHub');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockOnConnect).toHaveBeenCalled();
      });

      // Button should be re-enabled after error
      await waitFor(() => {
        expect(connectButton).not.toHaveAttribute('disabled');
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
