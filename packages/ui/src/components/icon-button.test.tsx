import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('exposes the label as accessible name and title', () => {
    render(<IconButton label="Add account" icon={<svg />} />);
    const btn = screen.getByRole('button', { name: 'Add account' });
    expect(btn).toHaveClass('spl-iconbtn');
    expect(btn).toHaveAttribute('title', 'Add account');
  });

  it('defaults to ghost/md and type=button', () => {
    render(<IconButton label="More" icon={<svg />} />);
    const btn = screen.getByRole('button', { name: 'More' });
    expect(btn).toHaveAttribute('data-variant', 'ghost');
    expect(btn).toHaveAttribute('data-size', 'md');
    expect(btn).toHaveAttribute('type', 'button');
  });
});
