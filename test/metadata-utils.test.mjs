import { describe, it, expect } from 'vitest';
import { buildMetadataBlock, hasMetadata, prependMetadataBlock } from '../website/src/repl/metadata_utils.mjs';

describe('metadata utils', () => {
  it('builds a metadata block with defaults', () => {
    const block = buildMetadataBlock({ title: 'Glow', tempoCpm: 120 });
    expect(block).toContain('// "Glow"');
    expect(block).toContain('// @by you');
    expect(block).toContain('// @tempo 120 cpm');
  });

  it('detects metadata presence', () => {
    expect(hasMetadata({ title: 'Hi' })).toBe(true);
    expect(hasMetadata({})).toBe(false);
  });

  it('prepends metadata when missing', () => {
    const block = buildMetadataBlock({ title: 'Track' });
    const code = '$: s("bd")';
    const result = prependMetadataBlock(code, block);
    expect(result.startsWith(block)).toBe(true);
  });

  it('does not prepend when metadata already present', () => {
    const block = buildMetadataBlock({ title: 'Track' });
    const code = '// "Existing"\n$: s("bd")';
    const result = prependMetadataBlock(code, block);
    expect(result).toBe(code);
  });
});
