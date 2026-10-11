import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  readJsonWithLimit,
  sanitizeSVG,
  validateTextInput,
} from './validation';

describe('validateEmail', () => {
  it('accepts normal addresses', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
    expect(validateEmail('first.last@sub.domain.co.in').valid).toBe(true);
  });

  it('rejects missing/invalid shapes', () => {
    expect(validateEmail(undefined).valid).toBe(false);
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail(123).valid).toBe(false);
    expect(validateEmail('not-an-email').valid).toBe(false);
    expect(validateEmail('a@b').valid).toBe(false);
    expect(validateEmail('spaces in@mail.com').valid).toBe(false);
  });

  it('rejects absurdly long emails', () => {
    const long = 'a'.repeat(300) + '@example.com';
    expect(validateEmail(long).valid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('hunter2secure').valid).toBe(true); // letters + number
    expect(validatePassword('abcd1234').valid).toBe(true);
  });

  it('requires minimum length of 8', () => {
    expect(validatePassword('ab1').valid).toBe(false);
    expect(validatePassword('abc12xyz').valid).toBe(true);
  });

  it('requires at least one letter and one number', () => {
    expect(validatePassword('12345678').valid).toBe(false);
    expect(validatePassword('abcdefgh').valid).toBe(false);
  });

  it('rejects non-strings and empty values', () => {
    expect(validatePassword(null).valid).toBe(false);
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword(undefined).valid).toBe(false);
  });

  it('rejects absurdly long passwords (DoS guard for bcrypt)', () => {
    expect(validatePassword('a'.repeat(129) + '1').valid).toBe(false);
  });
});

describe('readJsonWithLimit', () => {
  function makeRequest(body: string): Request {
    return new Request('https://example.test/api', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('parses JSON under the limit', async () => {
    const res = await readJsonWithLimit(makeRequest('{"a":1}'), 1000);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.body).toEqual({ a: 1 });
  });

  it('rejects bodies over the limit via content-length header', async () => {
    const req = new Request('https://example.test/api', {
      method: 'POST',
      body: 'x',
      headers: { 'content-length': '99999999' },
    });
    const res = await readJsonWithLimit(req, 1000);
    expect(res.ok).toBe(false);
  });

  it('rejects oversized actual bodies', async () => {
    const res = await readJsonWithLimit(makeRequest('x'.repeat(2000)), 1000);
    expect(res.ok).toBe(false);
  });

  it('rejects invalid JSON', async () => {
    const res = await readJsonWithLimit(makeRequest('{nope'), 1000);
    expect(res.ok).toBe(false);
  });
});

describe('sanitizeSVG', () => {
  it('removes script tags including nested attempts', () => {
    const out = sanitizeSVG('<svg><script>alert(1)</script><circle r="5"/></svg>');
    expect(out).not.toContain('<script');
    expect(out).toContain('<circle');
  });

  it('strips event handler attributes', () => {
    const out = sanitizeSVG('<svg onload="alert(1)"><rect onmouseover="x()"/></svg>');
    expect(out).not.toMatch(/on\w+\s*=/i);
  });

  it('strips javascript: URIs', () => {
    const out = sanitizeSVG('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('leaves safe SVG untouched', () => {
    const svg = '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>';
    expect(sanitizeSVG(svg)).toContain('viewBox');
    expect(sanitizeSVG(svg)).toContain('<path');
  });
});

describe('validateTextInput', () => {
  it('enforces min/max length', () => {
    expect(validateTextInput('', { minLength: 1 }).valid).toBe(false);
    expect(validateTextInput('hi', { minLength: 5 }).valid).toBe(false);
    expect(validateTextInput('hello', { minLength: 1 }).valid).toBe(true);
    expect(validateTextInput('x'.repeat(11), { maxLength: 10 }).valid).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(validateTextInput(undefined).valid).toBe(false);
  });
});
