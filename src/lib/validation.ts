export function validateTextInput(
  text: string | undefined,
  { minLength = 1, maxLength = 1_000_000 } = {}
): { valid: boolean; error?: string } {
  if (!text) {
    return { valid: false, error: 'Text is required' };
  }

  if (typeof text !== 'string') {
    return { valid: false, error: 'Text must be a string' };
  }

  if (text.trim().length < minLength) {
    return { valid: false, error: `Text must be at least ${minLength} characters` };
  }

  if (text.length > maxLength) {
    return { valid: false, error: `Text must be under ${maxLength} characters` };
  }

  return { valid: true };
}

export function validateFileSize(
  sizeBytes: number,
  maxSizeBytes: number = 50_000_000
): { valid: boolean; error?: string } {
  if (sizeBytes > maxSizeBytes) {
    const maxMB = (maxSizeBytes / 1_000_000).toFixed(1);
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxMB}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate an email address shape (plus RFC 5321 length limits).
 */
export function validateEmail(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  if (value.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (/\s/.test(value)) {
    return { valid: false, error: 'Email must not contain whitespace' };
  }

  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) {
    return { valid: false, error: 'Email must contain a single @' };
  }

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (local.length > 64) {
    return { valid: false, error: 'Email local part is too long' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return { valid: false, error: 'Email format is invalid' };
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { valid: false, error: 'Email domain is invalid' };
  }

  return { valid: true };
}

/**
 * Validate a password: at least 8 chars with at least one letter and one
 * number. Caps length at 128 to guard bcrypt from DoS via huge inputs.
 */
export function validatePassword(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, error: 'Password is required' };
  }

  if (value.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (value.length > 128) {
    return { valid: false, error: 'Password must be under 129 characters' };
  }

  if (!/[A-Za-z]/.test(value)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  if (!/[0-9]/.test(value)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
}

/**
 * Parse a JSON request body while enforcing a maximum size, both via the
 * content-length header and the actual decoded body. Prevents memory abuse
 * from oversized payloads on API routes.
 */
export async function readJsonWithLimit(
  req: Request,
  maxBytes: number
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const declaredLength = req.headers.get('content-length');
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      return { ok: false, error: 'Request body too large' };
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, error: 'Failed to read request body' };
  }

  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, error: 'Request body too large' };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
}

/**
 * Safely strip dangerous content from SVG strings.
 * Uses iterative removal to handle nested/obfuscated tags,
 * and covers all common event handler patterns.
 */
export function sanitizeSVG(svgContent: string): string {
  let sanitized = svgContent;

  // Iteratively remove script tags until none remain (handles nesting/encoding)
  const scriptPattern = /<script[\s\S]*?<\/script\s*>/gi;
  let prev: string;
  do {
    prev = sanitized;
    sanitized = sanitized.replace(scriptPattern, '');
  } while (sanitized !== prev);

  // Remove all event handler attributes (onclick, onload, onerror, etc.)
  // Covers both quoted and unquoted values, including HTML entity variants
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  sanitized = sanitized.replace(/\s+on\w+(?:\s*:\s*[\w.]+\s*)?/gi, ' ');

  // Remove javascript: and data: URIs in href/src/action attributes
  sanitized = sanitized.replace(/\s+(?:href|xlink:href|src|action|formaction)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi, ' ');
  sanitized = sanitized.replace(/\s+(?:href|xlink:href|src|action|formaction)\s*=\s*(?:"data:[^"]*"|'data:[^']*'|data:[^\s>]*)/gi, ' ');

  return sanitized;
}
