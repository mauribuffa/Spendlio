import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tag } from './tag';

describe('Tag', () => {
  it('renders children and the base class', () => {
    render(<Tag>Groceries</Tag>);
    const el = screen.getByText('Groceries');
    expect(el).toHaveClass('spl-tag');
  });

  it('reflects pressed state when selectable', () => {
    render(<Tag selectable selected>Dining</Tag>);
    expect(screen.getByRole('button', { name: 'Dining' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onRemove from the trailing affordance', () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Trip</Tag>);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
