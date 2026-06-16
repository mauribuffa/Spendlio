import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Add expense</Button>);
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
  });

  it('carries the base class and reflects the variant', () => {
    render(<Button variant="secondary">Settle up</Button>);
    const btn = screen.getByRole('button', { name: 'Settle up' });
    expect(btn).toHaveClass('spl-button');
    expect(btn).toHaveAttribute('data-variant', 'secondary');
  });

  it('defaults to the primary variant and type=button', () => {
    render(<Button>Split it</Button>);
    const btn = screen.getByRole('button', { name: 'Split it' });
    expect(btn).toHaveAttribute('data-variant', 'primary');
    expect(btn).toHaveAttribute('type', 'button');
  });
});
