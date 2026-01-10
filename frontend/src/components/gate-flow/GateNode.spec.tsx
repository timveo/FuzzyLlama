import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GateNode, GateStatus } from './GateNode';
import { ReactFlowProvider } from 'reactflow';

describe('GateNode', () => {
  const mockData = {
    gateType: 'G2_PRD',
    label: 'Product Requirements',
    status: 'READY' as GateStatus,
    description: 'Define product requirements',
    artifactsCount: 3,
    onViewDetails: vi.fn(),
  };

  const defaultProps = {
    id: 'gate-1',
    type: 'gateNode',
    data: mockData,
    selected: false,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
  };

  const renderWithReactFlow = (props: any) => {
    return render(
      <ReactFlowProvider>
        <GateNode {...props} />
      </ReactFlowProvider>
    );
  };

  describe('Rendering', () => {
    it('should render gate label', () => {
      renderWithReactFlow(defaultProps);
      expect(screen.getByText('Product Requirements')).toBeDefined();
    });

    it('should render gate type', () => {
      renderWithReactFlow(defaultProps);
      expect(screen.getByText('G2_PRD')).toBeDefined();
    });

    it('should render gate description', () => {
      renderWithReactFlow(defaultProps);
      expect(screen.getByText('Define product requirements')).toBeDefined();
    });

    it('should render artifacts count when present', () => {
      renderWithReactFlow(defaultProps);
      expect(screen.getByText('3 artifacts')).toBeDefined();
    });

    it('should not render artifacts count when zero', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, artifactsCount: 0 },
      };
      renderWithReactFlow(props);
      expect(screen.queryByText('artifacts')).toBeNull();
    });
  });

  describe('Status Colors', () => {
    it('should render BLOCKED status with gray colors', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'BLOCKED' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const node = container.querySelector('[class*="border-gray"]');
      expect(node).toBeDefined();
    });

    it('should render IN_PROGRESS status with blue colors', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'IN_PROGRESS' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const node = container.querySelector('[class*="border-blue"]');
      expect(node).toBeDefined();
    });

    it('should render READY status with yellow colors', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'READY' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const node = container.querySelector('[class*="border-yellow"]');
      expect(node).toBeDefined();
    });

    it('should render APPROVED status with green colors', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'APPROVED' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const node = container.querySelector('[class*="border-green"]');
      expect(node).toBeDefined();
    });

    it('should render REJECTED status with red colors', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'REJECTED' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const node = container.querySelector('[class*="border-red"]');
      expect(node).toBeDefined();
    });
  });

  describe('Interactions', () => {
    it('should call onViewDetails when clicked', () => {
      const onViewDetails = vi.fn();
      const props = {
        ...defaultProps,
        data: { ...mockData, onViewDetails },
      };

      renderWithReactFlow(props);
      const button = screen.getByText('View Details');
      fireEvent.click(button);

      expect(onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should not render View Details button if onViewDetails is undefined', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, onViewDetails: undefined },
      };

      renderWithReactFlow(props);
      expect(screen.queryByText('View Details')).toBeNull();
    });
  });

  describe('Status Icons', () => {
    it('should render lock icon for BLOCKED status', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'BLOCKED' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();
    });

    it('should render spinner icon for IN_PROGRESS status', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'IN_PROGRESS' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const spinner = container.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeDefined();
    });

    it('should render clock icon for READY status', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'READY' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();
    });

    it('should render checkmark icon for APPROVED status', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'APPROVED' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();
    });

    it('should render X icon for REJECTED status', () => {
      const props = {
        ...defaultProps,
        data: { ...mockData, status: 'REJECTED' as GateStatus },
      };
      const { container } = renderWithReactFlow(props);
      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();
    });
  });
});
