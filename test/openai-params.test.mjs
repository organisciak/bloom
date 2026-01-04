import { describe, it, expect } from 'vitest';
import {
  extractOpenAIText,
  getOpenAIMaxTokensParam,
  withOpenAIMaxTokens,
  withOpenAITemperature,
} from '../website/src/pages/api/openai.ts';

describe('openai token parameters', () => {
  it('uses max_completion_tokens for gpt-5 models', () => {
    // arrange
    const model = 'gpt-5-nano';

    // act
    const body = withOpenAIMaxTokens({ model }, model, 123);

    // assert
    expect(body.max_completion_tokens).toBe(123);
    expect(body.max_tokens).toBeUndefined();
  });

  it('uses max_tokens for legacy chat models', () => {
    // arrange
    const model = 'gpt-4o-mini';

    // act
    const body = withOpenAIMaxTokens({ model }, model, 321);

    // assert
    expect(body.max_tokens).toBe(321);
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it('maps o-series models to max_completion_tokens', () => {
    // arrange
    const model = 'o1-mini';

    // act
    const param = getOpenAIMaxTokensParam(model);

    // assert
    expect(param).toBe('max_completion_tokens');
  });

  it('omits temperature for gpt-5 models', () => {
    // arrange
    const model = 'gpt-5-nano';

    // act
    const body = withOpenAITemperature({ model }, model, 0.4);

    // assert
    expect(body.temperature).toBeUndefined();
  });

  it('passes temperature for models that support it', () => {
    // arrange
    const model = 'gpt-4o-mini';

    // act
    const body = withOpenAITemperature({ model }, model, 0.4);

    // assert
    expect(body.temperature).toBe(0.4);
  });

  it('extracts text from string content', () => {
    // arrange
    const data = { choices: [{ message: { content: '{"suggestions":[]}' } }] };

    // act
    const text = extractOpenAIText(data);

    // assert
    expect(text).toBe('{"suggestions":[]}');
  });

  it('extracts text from array content', () => {
    // arrange
    const data = {
      choices: [{ message: { content: [{ type: 'text', text: '{"suggestions":[1]}' }] } }],
    };

    // act
    const text = extractOpenAIText(data);

    // assert
    expect(text).toBe('{"suggestions":[1]}');
  });

  it('extracts text from responses output_text', () => {
    // arrange
    const data = { output_text: '{"suggestions":[3]}' };

    // act
    const text = extractOpenAIText(data);

    // assert
    expect(text).toBe('{"suggestions":[3]}');
  });

  it('extracts nested text values from responses content', () => {
    // arrange
    const data = {
      output: [
        {
          content: [{ type: 'output_text', text: { value: '{"suggestions":[4]}' } }],
        },
      ],
    };

    // act
    const text = extractOpenAIText(data);

    // assert
    expect(text).toBe('{"suggestions":[4]}');
  });

  it('extracts text from legacy completions', () => {
    // arrange
    const data = { choices: [{ text: '{"suggestions":[2]}' }] };

    // act
    const text = extractOpenAIText(data);

    // assert
    expect(text).toBe('{"suggestions":[2]}');
  });
});
