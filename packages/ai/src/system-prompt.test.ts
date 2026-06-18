import { describe, it, expect } from 'vitest';
import { CHAT_SYSTEM } from './system-prompt';

describe('CHAT_SYSTEM hardening', () => {
  it('forbids doing money math', () => {
    expect(CHAT_SYSTEM.toLowerCase()).toContain('never');
    expect(CHAT_SYSTEM).toMatch(/tool/i);
  });
  it('marks tool output and stored text as data, not instructions', () => {
    expect(CHAT_SYSTEM.toLowerCase()).toContain('data, not instructions');
  });
  it('refuses to reveal the system prompt', () => {
    expect(CHAT_SYSTEM.toLowerCase()).toContain('never reveal');
  });
  it('scopes the assistant to the user\'s own finance data, read-only', () => {
    expect(CHAT_SYSTEM.toLowerCase()).toContain('read-only');
  });
});
