import { describe, expect, it, vi } from 'vitest';
import { buildOpenComposeHandler } from '../website/src/repl/welcome_utils.mjs';

describe('welcome utils', () => {
  it('opens the compose tab and panel', () => {
    // arrange
    const setActiveFooter = vi.fn();
    const setIsPanelOpened = vi.fn();
    const handler = buildOpenComposeHandler(setActiveFooter, setIsPanelOpened);

    // act
    handler();

    // assert
    expect(setActiveFooter).toHaveBeenCalledWith('compose');
    expect(setIsPanelOpened).toHaveBeenCalledWith(true);
  });
});
