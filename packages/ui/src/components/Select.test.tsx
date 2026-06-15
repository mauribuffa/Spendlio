import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from './Select';

describe('Select', () => {
  it('renders options from strings and objects', () => {
    render(<Select options={['USD', { value: 'ars', label: 'Pesos' }]} value="USD" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pesos' })).toHaveValue('ars');
  });

  it('renders a label and a disabled placeholder', () => {
    render(<Select label="Currency" placeholder="Pick one" options={['USD']} />);
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pick one' })).toBeDisabled();
  });
});
