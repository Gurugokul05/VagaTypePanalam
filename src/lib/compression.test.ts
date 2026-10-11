import { describe, it, expect } from 'vitest';
import { compressContent, decompressContent, hashContent } from './compression';

describe('compressContent / decompressContent', () => {
  it('skips compression below minSizeToCompress', async () => {
    const text = 'short text';
    const result = await compressContent(text);
    expect(result.compressed).toBe('');
    expect(result.compressionRatio).toBe(1);
    expect(result.originalSize).toBe(Buffer.byteLength(text, 'utf-8'));
  });

  it('round-trips large content losslessly', async () => {
    const text = 'வாகை டைப் பணாலம் typing practice '.repeat(10_000); // >100KB
    const { compressed } = await compressContent(text);
    expect(compressed).not.toBe('');

    const restored = await decompressContent(compressed);
    expect(restored).toBe(text);
  });

  it('achieves real compression on repetitive content', async () => {
    const text = 'the quick brown fox jumps over the lazy dog '.repeat(5_000);
    const result = await compressContent(text);
    expect(result.compressionRatio).toBeLessThan(0.5);
    expect(result.contentHash.length).toBe(64);
  });

  it('produces a stable sha256 contentHash', async () => {
    const a = await compressContent('a'.repeat(200_000));
    const b = await compressContent('a'.repeat(200_000));
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.contentHash).toBe(hashContent('a'.repeat(200_000)));
  });
});

describe('decompressContent', () => {
  it('throws on empty input', async () => {
    await expect(decompressContent('')).rejects.toThrow();
  });

  it('throws on corrupt base64/gzip data', async () => {
    const bad = Buffer.from('this is not gzip').toString('base64');
    await expect(decompressContent(bad)).rejects.toThrow();
  });
});
