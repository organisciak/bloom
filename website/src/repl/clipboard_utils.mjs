import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { isTauri } from '../tauri.mjs';

export const normalizeClipboardText = (text) => {
  if (!text) return null;
  const normalized = text.replace(/\r\n/g, '\n').trim();
  return normalized.length ? normalized : null;
};

export const copyToClipboard = async (text) => {
  if (!text) return false;
  try {
    if (isTauri()) {
      await writeText(text);
      return true;
    }
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
};

export const readFromClipboard = async () => {
  if (typeof navigator === 'undefined' || !navigator?.clipboard?.readText) {
    return null;
  }
  try {
    const text = await navigator.clipboard.readText();
    return normalizeClipboardText(text);
  } catch (error) {
    return null;
  }
};
