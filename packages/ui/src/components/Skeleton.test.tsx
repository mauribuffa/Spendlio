import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonRow } from './Skeleton';

describe('Skeleton', () => {
  it('applies the base shimmer class and a circle modifier', () => {
    const { container } = render(<Skeleton circle width={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('spl-skel');
    expect(el).toHaveClass('spl-skel--circle');
  });

  it('SkeletonRow renders a row scaffold', () => {
    const { container } = render(<SkeletonRow />);
    expect(container.querySelector('.spl-skel-row')).not.toBeNull();
  });
});
