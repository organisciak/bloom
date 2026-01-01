import { code2hash } from '@strudel/core';
import { getMetadata } from '../metadata_parser';

export const createShareUrl = (code, { origin, pathname } = {}) => {
  if (!code) return '';
  const baseOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const basePath = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!baseOrigin) return '';
  return `${baseOrigin}${basePath}#${code2hash(code)}`;
};

export const buildPostcard = ({ code, cps, origin, pathname } = {}) => {
  if (!code) return '';
  const meta = getMetadata(code);
  const title = meta.title || 'Untitled jam';
  const by = Array.isArray(meta.by) ? meta.by.join(', ') : meta.by;
  const tempo = Number.isFinite(cps) ? Math.round(cps * 60) : null;
  const share = createShareUrl(code, { origin, pathname });
  const lines = [`"${title}"`];
  if (by) lines.push(`@by ${by}`);
  if (tempo) lines.push(`@tempo ${tempo} cpm`);
  if (share) lines.push(`@share ${share}`);
  lines.push('');
  lines.push(code.trim());
  return lines.join('\n');
};
