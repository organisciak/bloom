import { hoverTooltip } from '@codemirror/view';
import jsdoc from '../../doc.json';
import hydraDocs from '../../hydra-docs.json';
import { Autocomplete, getSynonymDoc } from './autocomplete.mjs';

const getDocLabel = (doc) => doc.name || doc.longname;

const findStrudelDoc = (word) => {
  let entry = jsdoc.docs.filter((doc) => getDocLabel(doc) === word)[0];
  if (entry) {
    return entry;
  }
  const synonymDoc = jsdoc.docs.filter((doc) => doc.synonyms && doc.synonyms.includes(word))[0];
  if (!synonymDoc) {
    return null;
  }
  return getSynonymDoc(synonymDoc, word);
};

const findHydraDoc = (word) => hydraDocs.docs.find((doc) => doc.name === word) ?? null;

export const strudelTooltip = hoverTooltip(
  (view, pos, side) => {
    // Word selection from CodeMirror Hover Tooltip example https://codemirror.net/examples/tooltip/#hover-tooltips
    let { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos,
      end = pos;
    while (start > from && /\w/.test(text[start - from - 1])) {
      start--;
    }
    while (end < to && /\w/.test(text[end - from])) {
      end++;
    }
    if ((start == pos && side < 0) || (end == pos && side > 0)) {
      return null;
    }
    let word = text.slice(start - from, end - from);
    const entry = findStrudelDoc(word) ?? findHydraDoc(word);
    if (!entry) {
      return null;
    }

    return {
      pos: start,
      end,
      above: false,
      arrow: true,
      create(view) {
        let dom = document.createElement('div');
        dom.className = 'strudel-tooltip';
        const ac = Autocomplete(entry);
        dom.appendChild(ac);
        return { dom };
      },
    };
  },
  { hoverTime: 10 },
);

export const isTooltipEnabled = (on) => (on ? strudelTooltip : []);
