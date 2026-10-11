'use client';

import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SafeSvgProps {
  /** Raw SVG markup (e.g. admin-injected svgContent from the database). */
  content: string | null | undefined;
  className?: string;
  ariaLabel?: string;
}

/**
 * Renders untrusted SVG markup safely.
 *
 * All SVG coming out of the database (badges, ranks, season challenges)
 * must pass through this component — never inject it with raw
 * dangerouslySetInnerHTML.
 */
export default function SafeSvg({ content, className, ariaLabel }: SafeSvgProps) {
  const clean = useMemo(
    () => (content ? DOMPurify.sanitize(content) : ''),
    [content]
  );

  if (!clean) return null;

  return (
    <div
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
