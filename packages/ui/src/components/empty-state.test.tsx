import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title, message and action', () => {
    render(<EmptyState title="No accounts yet" message="Add one to get started" action={<button>Add account</button>} />);
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
    expect(screen.getByText('Add one to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
  });
});
