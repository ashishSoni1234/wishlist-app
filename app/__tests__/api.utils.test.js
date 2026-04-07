import { describe, it, expect } from 'vitest';

export function parseWishlist(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toProductGid(id) {
  if (!id) return null;
  const s = String(id);
  if (s.startsWith("gid://shopify/Product/")) return s;
  const num = s.replace(/\D/g, "");
  return num ? `gid://shopify/Product/${num}` : null;
}

export function toCustomerGid(id) {
  if (!id) return null;
  const s = String(id);
  if (s.startsWith("gid://shopify/Customer/")) return s;
  const num = s.replace(/\D/g, "");
  return num ? `gid://shopify/Customer/${num}` : null;
}

describe('Wishlist API Data Modifiers', () => {
    it('parseWishlist parses stringified arrays', () => {
        expect(parseWishlist('["gid://123"]')).toEqual(['gid://123']);
    });

    it('parseWishlist handles undefined and malformed data', () => {
        expect(parseWishlist(null)).toEqual([]);
        expect(parseWishlist('{ bad json }')).toEqual([]);
        expect(parseWishlist('"just a string"')).toEqual([]);
    });

    it('toProductGid formats correctly', () => {
        expect(toProductGid('12345')).toBe('gid://shopify/Product/12345');
        expect(toProductGid('gid://shopify/Product/987')).toBe('gid://shopify/Product/987');
        expect(toProductGid('invalid')).toBe(null);
    });

    it('toCustomerGid formats correctly', () => {
        expect(toCustomerGid('777')).toBe('gid://shopify/Customer/777');
        expect(toCustomerGid('invalid')).toBe(null);
    });
});
