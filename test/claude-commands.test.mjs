import { describe, it, expect } from 'vitest';
import { buildClaudePrompt, matchInlineCommand } from '../packages/codemirror/claude_commands.mjs';

describe('claude prompt builder', () => {
  it('returns empty string for non-string input', () => {
    // arrange
    const input = { prompt: 'add a bassline' };

    // act
    const prompt = buildClaudePrompt('edit', input);

    // assert
    expect(prompt).toBe('');
  });

  it('matches forward slash commands', () => {
    // arrange
    const input = '/ai';

    // act
    const command = matchInlineCommand(input);

    // assert
    expect(command?.mode).toBe('edit');
    expect(command?.trigger).toBe('/ai');
  });

  it('matches legacy backslash commands', () => {
    // arrange
    const input = '\\claude';

    // act
    const command = matchInlineCommand(input);

    // assert
    expect(command?.mode).toBe('edit');
    expect(command?.trigger).toBe('\\claude');
  });

  it('matches suggestions command', () => {
    // arrange
    const input = '/suggestions';

    // act
    const command = matchInlineCommand(input);

    // assert
    expect(command?.mode).toBe('suggestions');
    expect(command?.trigger).toBe('/suggestions');
  });
});
