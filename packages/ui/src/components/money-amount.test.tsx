import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyAmount, formatSignedMoney } from './money-amount';

describe('formatSignedMoney', () => {
  it('formats -675 cents USD as a signed "-$6.75"', () => {
    expect(formatSignedMoney(-675, 'USD')).toBe('-$6.75');
  });

  it('prefixes positive amounts with a "+"', () => {
    expect(formatSignedMoney(675, 'USD')).toBe('+$6.75');
  });

  it('leaves zero unsigned', () => {
    expect(formatSignedMoney(0, 'USD')).toBe('$0.00');
  });

  it('respects zero-decimal currencies (JPY)', () => {
    expect(formatSignedMoney(-675, 'JPY')).toBe('-¥675');
  });
});

describe('MoneyAmount', () => {
  it('renders -675 cents USD as a negative-styled "-$6.75" with a sign', () => {
    render(<MoneyAmount amount={-675} currency="USD" />);
    const el = screen.getByText('-$6.75');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-tone', 'negative');
    expect(el).toHaveAttribute('data-money');
    expect(el.style.color).toBe('var(--negative-500)');
  });

  it('renders positive amounts with the positive color and a "+"', () => {
    render(<MoneyAmount amount={1200} currency="USD" />);
    const el = screen.getByText('+$12.00');
    expect(el).toHaveAttribute('data-tone', 'positive');
    expect(el.style.color).toBe('var(--positive-500)');
  });
});
