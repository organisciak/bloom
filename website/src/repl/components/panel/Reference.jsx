import { useMemo, useState } from 'react';

import jsdocJson from '../../../../../doc.json';
import hydraDocs from '../../../../../hydra-docs.json';
import { Textbox } from '../textbox/Textbox';
import cx from '@src/cx.mjs';
import { getEasyWins, getLiveTweak, getPairWith, getQuickTips } from '../../reference_utils.mjs';
import { logger } from '@strudel/core';

const isValid = ({ name, description }) => name && !name.startsWith('_') && !!description;

const availableFunctions = (() => {
  const seen = new Set(); // avoid repetition
  const functions = [];
  const combinedDocs = [
    ...jsdocJson.docs.map((doc) => ({ ...doc, source: 'strudel' })),
    ...hydraDocs.docs.map((doc) => ({ ...doc, source: 'hydra' })),
  ];
  for (const doc of combinedDocs) {
    if (!isValid(doc)) continue;
    functions.push(doc);
    const synonyms = doc.synonyms || [];
    for (const s of synonyms) {
      if (!s || seen.has(s)) continue;
      seen.add(s);
      // Swap `doc.name` in for `s` in the list of synonyms
      const synonymsWithDoc = [doc.name, ...synonyms].filter((x) => x && x !== s);
      functions.push({
        ...doc,
        name: s, // update names for the synonym
        longname: s,
        synonyms: synonymsWithDoc,
        synonyms_text: synonymsWithDoc.join(', '),
      });
    }
  }
  return functions.sort((a, b) => /* a.meta.filename.localeCompare(b.meta.filename) +  */ a.name.localeCompare(b.name));
})();

const getInnerText = (html) => {
  var div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const SourceBadge = ({ source }) => {
  const label = source === 'hydra' ? 'Hydra' : 'Strudel';
  return <span className={cx('reference-badge', `reference-badge--${source}`)}>{label}</span>;
};

export function Reference({ context }) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [copyStatus, setCopyStatus] = useState('');
  const soundContext = context?.soundContext;

  const visibleFunctions = useMemo(() => {
    return availableFunctions.filter((entry) => {
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) {
        return false;
      }
      if (!search) {
        return true;
      }

      const lowerCaseSearch = search.toLowerCase();
      return (
        entry.name.toLowerCase().includes(lowerCaseSearch) ||
        (entry.synonyms?.some((s) => s.toLowerCase().includes(lowerCaseSearch)) ?? false)
      );
    });
  }, [search, sourceFilter]);

  const copyToClipboard = async (text) => {
    if (!navigator?.clipboard?.writeText) {
      setCopyStatus('Clipboard unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied to clipboard');
      logger('[reference] copied example', 'highlight');
      setTimeout(() => setCopyStatus(''), 1500);
    } catch (error) {
      setCopyStatus('Copy failed');
      logger('[reference] copy failed', 'highlight');
    }
  };

  const insertExample = (text) => {
    const editor = context?.editorRef?.current;
    if (!editor) {
      setCopyStatus('Editor not available');
      return;
    }
    const prefix = editor.code?.length ? '\n\n' : '';
    editor.appendCode(`${prefix}${text}`);
    logger('[reference] inserted example', 'highlight');
  };

  return (
    <div className="flex h-full w-full p-2 overflow-hidden">
      <div className="h-full  flex flex-col gap-2 w-1/3 max-w-72 ">
        <div class="w-full flex">
          <Textbox className="w-full" placeholder="Search" value={search} onChange={setSearch} />
        </div>
        <div className="flex gap-1 text-xs">
          {['all', 'strudel', 'hydra'].map((source) => (
            <button
              key={source}
              className={cx(
                'px-2 py-1 rounded capitalize',
                sourceFilter === source ? 'bg-lineHighlight' : 'opacity-60 hover:opacity-100',
              )}
              onClick={() => setSourceFilter(source)}
            >
              {source}
            </button>
          ))}
        </div>
        <div className="flex flex-col h-full overflow-y-auto  gap-1.5 bg-background bg-opacity-50  rounded-md">
          {visibleFunctions.map((entry, i) => (
            <a
              key={i}
              className="cursor-pointer text-foreground flex-none hover:bg-lineHighlight overflow-x-hidden  px-1 text-ellipsis"
              onClick={() => {
                const el = document.getElementById(`doc-${i}`);
                const container = document.getElementById('reference-container');
                container.scrollTo(0, el.offsetTop);
              }}
            >
              {entry.name}
              <SourceBadge source={entry.source} />
            </a>
          ))}
        </div>
      </div>
      <div
        className="break-normal flex-grow flex-col overflow-y-auto overflow-x-hidden   px-2 flex relative"
        id="reference-container"
      >
        <div className="prose dark:prose-invert min-w-full px-1 ">
          <h2>API Reference</h2>
          <p>
            This is the long list of functions you can use. Remember that you don't need to remember all of those and
            that you can already make music with a small set of functions!
          </p>
          {copyStatus && <p className="text-xs opacity-70">{copyStatus}</p>}
          {visibleFunctions.map((entry, i) => (
            <section key={i}>
              <h3 id={`doc-${i}`}>
                {entry.name}
                <SourceBadge source={entry.source} />
              </h3>
              {!!entry.synonyms_text && (
                <p>
                  Synonyms: <code>{entry.synonyms_text}</code>
                </p>
              )}
              {/* <small>{entry.meta.filename}</small> */}
              <p dangerouslySetInnerHTML={{ __html: entry.description }}></p>
              <h4 className="reference-section-title">Quick tips</h4>
              <ul className="reference-section-list">
                {getQuickTips(entry).map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
              <h4 className="reference-section-title">Easy wins</h4>
              {getEasyWins(entry, soundContext).map((example, j) => (
                <div className="reference-example" key={`easy-${j}`}>
                  <div className="reference-example-actions">
                    <button
                      className="reference-action-button"
                      onClick={() => copyToClipboard(example)}
                      type="button"
                    >
                      copy
                    </button>
                    {context?.editorRef?.current && (
                      <button
                        className="reference-action-button"
                        onClick={() => insertExample(example)}
                        type="button"
                      >
                        insert
                      </button>
                    )}
                  </div>
                  <pre className="bg-background">{example}</pre>
                </div>
              ))}
              <h4 className="reference-section-title">Pair with</h4>
              <p className="reference-pair-with">
                {getPairWith(entry)
                  .map((combo, idx) => (
                    <code key={`${combo}-${idx}`}>{combo}</code>
                  ))
                  .reduce((prev, curr) => [prev, ' ', curr])}
              </p>
              <h4 className="reference-section-title">Live tweak</h4>
              <p className="reference-live-tweak">{getLiveTweak(entry)}</p>
              <ul>
                {entry.params?.map(({ name, type, description }, i) => (
                  <li key={i}>
                    {name} : {type?.names?.join(' | ')} {description ? <> - {getInnerText(description)}</> : ''}
                  </li>
                ))}
              </ul>
              {entry.examples?.map((example, j) => (
                <pre className="bg-background" key={j}>
                  {example}
                </pre>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
