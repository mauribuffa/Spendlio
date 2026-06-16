import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AmountInput } from './amount-input';

describe('AmountInput', () => {
  it('shows the currency prefix and the value with tabular figures', () => {
    render(<AmountInput value="42.50" currency="$" onChange={() => {}} />);
    expect(screen.getByText('$')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('42.50');
    expect(input).toHaveAttribute('data-money');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
