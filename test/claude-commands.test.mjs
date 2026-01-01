import { describe, it, expect } from 'vitest';
import { buildClaudePrompt, matchInlineCommand } from '../packages/codemirror/claude_commands.mjs';

describe('claude commands', () => {
  it('matches /addsection at line end', () => {
    // arrange
    const input = '  /addsection';

    // act
    const match = matchInlineCommand(input);

    // assert
    expect(match).not.toBeNull();
    expect(match.trigger).toBe('/addsection');
    expect(match.mode).toBe('add-section');
  });

  it('does not match when inline without whitespace', () => {
    // arrange
    const input = 'foo/addsection';

    // act
    const match = matchInlineCommand(input);

    // assert
    expect(match).toBeNull();
  });

  it('builds add-section prompt prefix', () => {
    // arrange
    const input = 'make it metallic';

    // act
    const prompt = buildClaudePrompt('add-section', input);

    // assert
    expect(prompt).toContain('Add a new instrument section');
    expect(prompt).toContain('make it metallic');
  });
});
