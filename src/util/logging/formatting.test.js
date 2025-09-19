import { describe, expect, it } from 'vitest';
import { describeDiscordEntity, formatMetadataKey, formatValue, isPlainObject, truncate } from './formatting.js';

describe('logging formatting helpers', () => {
  describe('truncate', () => {
    it('keeps strings within limit', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('appends ellipsis for long strings', () => {
      expect(truncate('abcdefghijkl', 5)).toBe('abcd…');
    });

    it('returns non-string values unchanged', () => {
      expect(truncate(42, 5)).toBe(42);
    });
  });

  describe('isPlainObject', () => {
    it('detects plain objects', () => {
      expect(isPlainObject({ foo: 'bar' })).toBe(true);
    });

    it('rejects arrays and class instances', () => {
      expect(isPlainObject([1, 2, 3])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });
  });

  describe('describeDiscordEntity', () => {
    it('formats user like objects with discriminator', () => {
      expect(
        describeDiscordEntity({ username: 'Test', discriminator: '1234', id: '42' }),
      ).toBe('Test#1234 (42)');
    });

    it('falls back to nested user property', () => {
      expect(describeDiscordEntity({ user: { username: 'Nested', discriminator: '0' } })).toBe('Nested');
    });

    it('combines array values', () => {
      expect(describeDiscordEntity(['foo', { name: 'Bar' }, null])).toBe('foo, Bar');
    });
  });

  describe('formatValue', () => {
    it('handles primitives and nullish values', () => {
      expect(formatValue(null)).toBe('—');
      expect(formatValue(undefined)).toBe('—');
      expect(formatValue('  value  ')).toBe('value');
      expect(formatValue(true)).toBe('Ja');
      expect(formatValue(false)).toBe('Nein');
      expect(formatValue(123n)).toBe('123');
    });

    it('formats arrays by joining formatted entries', () => {
      expect(formatValue([' foo ', null, 'bar'])).toBe('foo, bar');
    });

    it('describes discord entities and plain objects', () => {
      expect(formatValue({ username: 'Fancy', discriminator: '0' })).toBe('Fancy');
      expect(formatValue({ name: 'Example', id: '55' })).toBe('Example (55)');
      expect(formatValue({ foo: 'bar', baz: 1 })).toBe('{"foo":"bar","baz":1}');
    });
  });

  describe('formatMetadataKey', () => {
    it('converts snake and camel case keys into readable labels', () => {
      expect(formatMetadataKey('actor_id')).toBe('Actor id');
      expect(formatMetadataKey('channelId')).toBe('Channel Id');
      expect(formatMetadataKey('extra-id')).toBe('Extra id');
    });
  });
});
