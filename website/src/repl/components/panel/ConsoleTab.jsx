import cx from '@src/cx.mjs';
import { useSettings } from '../../../settings.mjs';
import { useStore } from '@nanostores/react';
import { $strudel_log_history } from '../useLogger';
import { useRef, useState } from 'react';
import { logger } from '@strudel/core';
import { consoleCharms, pickCharm } from '../../console_charms.mjs';

export function ConsoleTab({ context }) {
  const log = useStore($strudel_log_history);
  const { fontFamily } = useSettings();
  const [status, setStatus] = useState('');
  const lastCharmIdRef = useRef(null);
  const [lastCharm, setLastCharm] = useState(null);

  const logToBrowserConsole = (message) => {
    try {
      console.log(`%c${message}`, 'color:#f6b26b;font-weight:600;');
    } catch (error) {
      // ignore
    }
  };

  const handleCharm = () => {
    const charm = pickCharm(consoleCharms, lastCharmIdRef.current);
    if (!charm) {
      setStatus('No charm available.');
      return;
    }
    lastCharmIdRef.current = charm.id;
    setLastCharm(charm);
    const line = `${charm.emoji} ${charm.line}`;
    logger(`[console] ${line}`, 'highlight');
    logToBrowserConsole(line);
    if (charm.spell) {
      logger(`[console] spell: ${charm.spell}`, 'highlight');
      logToBrowserConsole(`spell: ${charm.spell}`);
    }
  };

  const handleCopySpell = async () => {
    if (!lastCharm?.spell) {
      setStatus('No spell to copy.');
      return;
    }
    if (!navigator?.clipboard?.writeText) {
      setStatus('Clipboard unavailable.');
      return;
    }
    try {
      await navigator.clipboard.writeText(lastCharm.spell);
      setStatus('Spell copied.');
    } catch (error) {
      setStatus('Copy failed.');
    }
  };

  const handleInsertSpell = () => {
    if (!lastCharm?.spell) {
      setStatus('No spell to insert.');
      return;
    }
    const editor = context?.editorRef?.current;
    if (!editor) {
      setStatus('Editor not available.');
      return;
    }
    const prefix = editor.code?.length ? '\n\n' : '';
    editor.appendCode(`${prefix}${lastCharm.spell}`);
    setStatus('Spell inserted.');
  };

  return (
    <div id="console-tab" className="break-all w-full  first-line:text-sm p-2  h-full" style={{ fontFamily }}>
      <div className="console-charm-bar">
        <div className="console-charm-title">Console gremlin</div>
        <div className="console-charm-actions">
          <button className="console-charm-button" onClick={handleCharm} type="button">
            summon
          </button>
          <button className="console-charm-button" onClick={handleCopySpell} type="button">
            copy spell
          </button>
          {context?.editorRef?.current && (
            <button className="console-charm-button" onClick={handleInsertSpell} type="button">
              insert
            </button>
          )}
        </div>
      </div>
      {lastCharm && (
        <div className="console-charm-message">
          {lastCharm.emoji} {lastCharm.line}
        </div>
      )}
      {status && <div className="console-charm-status">{status}</div>}
      <div className="bg-background h-full w-full overflow-auto space-y-1 p-2 rounded-md">
        {log.map((l, i) => {
          const message = linkify(l.message);
          const color = l.data?.hap?.value?.color;
          return (
            <div
              key={l.id}
              className={cx(
                l.type === 'error' ? 'text-background bg-foreground' : 'text-foreground',
                l.type === 'highlight' && 'underline',
              )}
              style={color ? { color } : {}}
            >
              <span dangerouslySetInnerHTML={{ __html: message }} />
              {l.count ? ` (${l.count})` : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function linkify(inputText) {
  var replacedText, replacePattern1, replacePattern2, replacePattern3;

  //URLs starting with http://, https://, or ftp://
  replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  replacedText = inputText.replace(replacePattern1, '<a class="underline" href="$1" target="_blank">$1</a>');

  //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
  replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  replacedText = replacedText.replace(
    replacePattern2,
    '$1<a class="underline" href="http://$2" target="_blank">$2</a>',
  );

  //Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(replacePattern3, '<a class="underline" href="mailto:$1">$1</a>');

  return replacedText;
}
