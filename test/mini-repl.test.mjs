// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const codemirrorMock = vi.hoisted(() => ({ instances: [] }));

vi.mock('@strudel/codemirror', () => {
  class MockStrudelMirror {
    constructor(options) {
      codemirrorMock.instances.push(this);
      this.options = options;
      this.code = options.initialCode ?? '';
      this.setCode = vi.fn((code) => {
        this.code = code;
      });
      this.evaluate = vi.fn();
      this.toggle = vi.fn();
    }
  }
  return { StrudelMirror: MockStrudelMirror, __mock: codemirrorMock };
});

vi.mock('@strudel/core', () => ({
  silence: {},
  noteToMidi: () => 60,
  _mod: (value, mod) => ((value % mod) + mod) % mod,
}));

vi.mock('@strudel/draw', () => ({
  getDrawContext: () => ({}),
  getPunchcardPainter: () => ({}),
}));

vi.mock('@strudel/transpiler', () => ({ transpiler: {} }));

vi.mock('@strudel/webaudio', () => ({
  getAudioContext: () => ({ currentTime: 0 }),
  webaudioOutput: {},
  initAudioOnFirstClick: () => Promise.resolve(),
}));

vi.mock('@components/Claviature', () => ({ default: () => null }), { virtual: true });

vi.mock('@src/useClient.mjs', () => ({ default: () => true }), { virtual: true });

vi.mock('../website/src/repl/prebake.mjs', () => ({
  prebake: () => Promise.resolve(),
}));

vi.mock('../website/src/repl/util.mjs', () => ({
  loadModules: () => Promise.resolve(),
  setVersionDefaultsFrom: () => {},
}));

import { MiniRepl } from '../website/src/docs/MiniRepl.jsx';
import { __mock as codemirrorInstances } from '@strudel/codemirror';

describe('MiniRepl', () => {
  beforeEach(() => {
    codemirrorInstances.instances.length = 0;
  });

  it('updates the editor when the tune prop changes', () => {
    // arrange: render a MiniRepl with an initial tune
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<MiniRepl tune={'s("bd")'} hideHeader />);
    });

    const instance = codemirrorInstances.instances[0];
    expect(instance).toBeDefined();
    expect(instance.setCode).toHaveBeenLastCalledWith('s("bd")');

    // act: update the tune prop
    act(() => {
      root.render(<MiniRepl tune={'s("sd")'} hideHeader />);
    });

    // assert: the editor picks up the new tune
    expect(instance.setCode).toHaveBeenLastCalledWith('s("sd")');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
