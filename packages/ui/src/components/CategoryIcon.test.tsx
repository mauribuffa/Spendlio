import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CategoryKey } from '@spendlio/contracts';
import { CategoryIcon } from './CategoryIcon';

// Drive the test off the contracts enum so it covers exactly the 12 keys and
// fails if a category is added without a mapping.
const keys = CategoryKey.options;

describe('CategoryIcon', () => {
  it('covers all 12 contract category keys', () => {
    expect(keys).toHaveLength(12);
  });

  it.each(keys)('renders an icon for "%s" without throwing', (key) => {
    const { container, getByRole } = render(<CategoryIcon category={key} />);
    // Tinted chip exposes the category as an accessible image label.
    expect(getByRole('img', { name: key })).toBeInTheDocument();
    // Lucide renders an <svg>.
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a bare icon when chip is disabled', () => {
    const { container } = render(<CategoryIcon category="groceries" chip={false} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
