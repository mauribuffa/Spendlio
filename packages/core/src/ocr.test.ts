import { describe, it, expect } from 'vitest';
import { classifyOcrFailure } from './ocr';

describe('classifyOcrFailure', () => {
  it('classifies timeouts', () => {
    expect(classifyOcrFailure('The operation timed out')).toBe('timeout');
    expect(classifyOcrFailure('signal timeout')).toBe('timeout');
    expect(classifyOcrFailure('The operation was aborted')).toBe('timeout');
  });

  it('prefers timeout over the wrapping "extraction failed" text', () => {
    // The live provider wraps every inner error as "receipt extraction failed: <inner>".
    expect(classifyOcrFailure('receipt extraction failed: signal timed out')).toBe('timeout');
  });

  it('classifies image-availability/integrity failures', () => {
    expect(
      classifyOcrFailure('receipt abc content hash mismatch (expected x, got y)'),
    ).toBe('image_unavailable');
    expect(classifyOcrFailure('NoSuchKey: The specified key does not exist')).toBe('image_unavailable');
  });

  it('classifies provider/parse failures as unreadable', () => {
    expect(classifyOcrFailure('receipt extraction failed: response did not match schema')).toBe('unreadable');
    expect(classifyOcrFailure('Invalid JSON returned by the model')).toBe('unreadable');
  });

  it('falls back to unknown', () => {
    expect(classifyOcrFailure('something totally weird happened')).toBe('unknown');
    expect(classifyOcrFailure('')).toBe('unknown');
    expect(classifyOcrFailure(undefined)).toBe('unknown');
  });
});
