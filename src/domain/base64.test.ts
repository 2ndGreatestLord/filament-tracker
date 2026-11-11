import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64 } from './base64';

describe('base64', () => {
  it('round-trips every byte value', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it('handles data larger than one chunk', () => {
    const bytes = new Uint8Array(100_000).map((_, index) => index % 251);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('handles empty data', () => {
    expect(bytesToBase64(new Uint8Array())).toBe('');
    expect(base64ToBytes('')).toHaveLength(0);
  });

  it('throws on invalid text', () => {
    expect(() => base64ToBytes('not base64!!')).toThrow();
  });
});
