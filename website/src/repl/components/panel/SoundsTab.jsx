import useEvent from '@src/useEvent.mjs';
import { useStore } from '@nanostores/react';
import { getAudioContext, soundMap, connectToDestination } from '@strudel/webaudio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { settingsMap, soundFilterType, useSettings } from '../../../settings.mjs';
import { ButtonGroup } from './Forms.jsx';
import ImportSoundsButton from './ImportSoundsButton.jsx';
import { Textbox } from '../textbox/Textbox.jsx';
import { ActionButton } from '../button/action-button.jsx';
import { confirmDialog } from '@src/repl/util.mjs';
import { clearIDB, userSamplesDBConfig } from '@src/repl/idbutils.mjs';
import { prebake } from '@src/repl/prebake.mjs';
import { MiniRepl } from '@src/docs/MiniRepl';
import { getSynthExamples } from '@src/repl/synth_examples.mjs';
import { buildSoundContextFromMap } from '@src/repl/sound_context.mjs';
import cx from '@src/cx.mjs';

const getSamples = (samples) =>
  Array.isArray(samples) ? samples.length : typeof samples === 'object' ? Object.values(samples).length : 1;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SoundsTab() {
  const sounds = useStore(soundMap);
  const soundContext = useMemo(() => buildSoundContextFromMap(sounds), [sounds]);

  const { soundsFilter } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedSynth, setSelectedSynth] = useState(null);
  const { BASE_URL } = import.meta.env;
  const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

  const soundEntries = useMemo(() => {
    if (!sounds) {
      return [];
    }

    let filtered = Object.entries(sounds)
      .filter(([key]) => !key.startsWith('_'))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()));

    if (soundsFilter === soundFilterType.USER) {
      return filtered.filter(([_, { data }]) => !data.prebake);
    }
    if (soundsFilter === soundFilterType.DRUMS) {
      return filtered.filter(([_, { data }]) => data.type === 'sample' && data.tag === 'drum-machines');
    }
    if (soundsFilter === soundFilterType.SAMPLES) {
      return filtered.filter(([_, { data }]) => data.type === 'sample' && data.tag !== 'drum-machines');
    }
    if (soundsFilter === soundFilterType.SYNTHS) {
      return filtered.filter(([_, { data }]) => ['synth', 'soundfont'].includes(data.type));
    }
    if (soundsFilter === soundFilterType.WAVETABLES) {
      return filtered.filter(([_, { data }]) => data.type === 'wavetable');
    }
    //TODO: tidy this up, it does not need to be saved in settings
    if (soundsFilter === 'importSounds') {
      return [];
    }
    return filtered;
  }, [sounds, soundsFilter, search]);

  useEffect(() => {
    if (soundsFilter !== soundFilterType.SYNTHS) {
      return;
    }
    const synthNames = soundEntries.map(([name]) => name);
    if (!synthNames.length) {
      setSelectedSynth(null);
      return;
    }
    if (!selectedSynth || !synthNames.includes(selectedSynth)) {
      setSelectedSynth(synthNames[0]);
    }
  }, [soundEntries, soundsFilter, selectedSynth]);

  // holds mutable ref to current triggered sound
  const trigRef = useRef();
  const numRef = useRef(0);

  // stop current sound on mouseup
  useEvent('mouseup', () => {
    const ref = trigRef.current;
    trigRef.current = undefined;
    ref?.stop?.(getAudioContext().currentTime + 0.01);
  });
  useEvent('keydown', (e) => {
    if (!isNaN(Number(e.key))) {
      numRef.current = Number(e.key);
    }
  });
  useEvent('keyup', (e) => {
    numRef.current = 0;
  });

  const isSynthView = soundsFilter === soundFilterType.SYNTHS;
  const selectedSynthEntry = useMemo(() => {
    if (!isSynthView || !soundEntries.length) {
      return null;
    }
    const match = soundEntries.find(([name]) => name === selectedSynth) ?? soundEntries[0];
    if (!match) {
      return null;
    }
    const [name, { data, onTrigger }] = match;
    return { name, data, onTrigger };
  }, [isSynthView, soundEntries, selectedSynth]);

  const synthExamples = useMemo(() => {
    if (!selectedSynthEntry) return [];
    return getSynthExamples(selectedSynthEntry.name, { limit: 3, soundContext });
  }, [selectedSynthEntry, soundContext]);

  const handlePreview = async (name, data, onTrigger) => {
    const ctx = getAudioContext();
    const params = {
      note: ['synth', 'soundfont'].includes(data.type) ? 'a3' : undefined,
      s: name,
      n: numRef.current,
      clip: 1,
      release: 0.5,
      sustain: 1,
      duration: 0.5,
    };
    const onended = () => trigRef.current?.node?.disconnect();
    let errMsg;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const time = ctx.currentTime + 0.05;
        const ref = await onTrigger(time, params, onended);
        trigRef.current = ref;
        if (ref?.node) {
          connectToDestination(ref.node);
          break;
        }
      } catch (err) {
        errMsg = err;
      }
      if (attempt == 9) {
        console.warn('Failed to trigger sound after 10 attempts' + (errMsg ? `: ${errMsg}` : ''));
      } else {
        await wait(200);
      }
    }
  };
  return (
    <div id="sounds-tab" className="px-4 flex gap-2 flex-col w-full h-full text-foreground">
      <Textbox placeholder="Search" value={search} onChange={(v) => setSearch(v)} />

      <div className=" flex shrink-0 flex-wrap">
        <ButtonGroup
          value={soundsFilter}
          onChange={(value) => settingsMap.setKey('soundsFilter', value)}
          items={{
            samples: 'samples',
            drums: 'drum-machines',
            synths: 'Synths',
            wavetables: 'Wavetables',
            user: 'User',
            importSounds: 'import-sounds',
          }}
        ></ButtonGroup>
      </div>

      {soundsFilter === soundFilterType.USER && soundEntries.length > 0 && (
        <ActionButton
          className="pl-2"
          label="delete-all"
          onClick={async () => {
            try {
              const confirmed = await confirmDialog('Delete all imported user samples?');
              if (confirmed) {
                clearIDB(userSamplesDBConfig.dbName);
                soundMap.set({});
                await prebake();
              }
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {isSynthView ? (
        <div className="sound-panel min-h-0 max-h-full grow bg-background p-2 rounded-md">
          <div className="sound-list">
            {soundEntries.map(([name, { data, onTrigger }]) => {
              const meta =
                data?.type === 'sample'
                  ? `(${getSamples(data.samples)})`
                  : data?.type === 'wavetable'
                    ? `(${getSamples(data.tables)})`
                    : data?.type === 'soundfont'
                      ? `(${data.fonts.length})`
                      : '';
              const isSelected = name === selectedSynth;
              return (
                <button
                  key={name}
                  type="button"
                  className={cx('sound-row', isSelected && 'sound-row--selected')}
                  onMouseDown={() => handlePreview(name, data, onTrigger)}
                  onClick={() => setSelectedSynth(name)}
                >
                  <span className="sound-row-name">{name}</span>
                  <span className="sound-row-meta">{meta}</span>
                </button>
              );
            })}
            {!soundEntries.length && <div className="sound-empty">No synths loaded</div>}
          </div>
          <div className="sound-synth-panel">
            {selectedSynthEntry ? (
              <>
                <div className="sound-synth-header">
                  <div className="sound-synth-title">{selectedSynthEntry.name}</div>
                  <div className="sound-synth-meta">{selectedSynthEntry.data?.type ?? 'synth'}</div>
                  <div className="sound-synth-hint">Tap play on any mini‑composition to audition the synth.</div>
                </div>
                <div className="sound-synth-examples">
                  {synthExamples.map((example) => (
                    <div key={example.id} className="sound-synth-example">
                      <div className="sound-synth-example-title">{example.title}</div>
                      <div className="sound-synth-example-note">{example.description}</div>
                      <MiniRepl tune={example.code} maxHeight={120} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="sound-synth-empty">Select a synth to see mini‑compositions.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 max-h-full grow overflow-auto text-sm break-normal bg-background p-2 rounded-md">
          {soundEntries.map(([name, { data, onTrigger }]) => {
            return (
              <button
                key={name}
                type="button"
                className="sound-row"
                onMouseDown={() => handlePreview(name, data, onTrigger)}
              >
                <span className="sound-row-name">{name}</span>
                <span className="sound-row-meta">
                  {data?.type === 'sample' ? `(${getSamples(data.samples)})` : ''}
                  {data?.type === 'wavetable' ? `(${getSamples(data.tables)})` : ''}
                  {data?.type === 'soundfont' ? `(${data.fonts.length})` : ''}
                </span>
              </button>
            );
          })}
          {!soundEntries.length && soundsFilter === 'importSounds' ? (
            <div className="prose dark:prose-invert min-w-full pt-2 pb-8 px-4">
              <ImportSoundsButton onComplete={() => settingsMap.setKey('soundsFilter', 'user')} />
              <p>
                To import sounds into strudel, they must be contained{' '}
                <a href={`${baseNoTrailing}/learn/samples/#from-disk-via-import-sounds-folder`} target="_blank">
                  within a folder or subfolder
                </a>
                . The best way to do this is to upload a “samples” folder containing subfolders of individual sounds or
                soundbanks (see diagram below).{' '}
              </p>
              <pre className="bg-background" key={'sample-diagram'}>
                {`└─ samples <-- import this folder
   ├─ swoop
   │  ├─ swoopshort.wav
   │  ├─ swooplong.wav
   │  └─ swooptight.wav
   └─ smash
      ├─ smashhigh.wav
      ├─ smashlow.wav
      └─ smashmiddle.wav`}
              </pre>
              <p>
                The name of a subfolder corresponds to the sound name under the “user” tab. Multiple samples within a
                subfolder are all labelled with the same name, but can be accessed using “.n( )” - remember sounds are
                zero-indexed and in alphabetical order!
              </p>
              <p>
                For more information, and other ways to use your own sounds in strudel,{' '}
                <a href={`${baseNoTrailing}/learn/samples/#from-disk-via-import-sounds-folder`} target="_blank">
                  check out the docs
                </a>
                !
              </p>
              <h3>Preview Sounds</h3>
              <pre className="bg-background" key={'sample-preview'}>
                n("0 1 2 3 4 5").s("sample-name")
              </pre>
              <p>
                Paste the line above into the main editor to hear the uploaded folder. Remember to use the name of your
                sample as it appears under the "user" tab.
              </p>
            </div>
          ) : (
            ''
          )}
          {!soundEntries.length && soundsFilter !== 'importSounds' ? 'No sounds loaded' : ''}
        </div>
      )}
    </div>
  );
}
