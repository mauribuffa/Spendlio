import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './switch';

describe('Switch', () => {
  it('renders a switch-role checkbox reflecting checked', () => {
    render(<Switch checked onChange={() => {}} label="Split evenly" />);
    const input = screen.getByRole('switch');
    expect(input).toBeChecked();
    expect(screen.getByText('Split evenly')).toBeInTheDocument();
  });

  it('calls onChange when toggled', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
