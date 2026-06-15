import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children with the base class', () => {
    render(<Badge>Settled up</Badge>);
    expect(screen.getByText('Settled up')).toHaveClass('spl-badge');
  });

  it('defaults to the neutral tone', () => {
    render(<Badge>Pending</Badge>);
    expect(screen.getByText('Pending').style.color).toBe('var(--text-muted)');
  });

  it('applies the negative tone palette', () => {
    render(<Badge tone="negative">You owe</Badge>);
    expect(screen.getByText('You owe').style.color).toBe('var(--negative-700)');
  });

  it('renders a leading status dot when asked', () => {
    const { container } = render(<Badge dot>Live</Badge>);
    // dot is the first child span before the text
    expect(container.querySelector('span > span')).not.toBeNull();
  });
});
