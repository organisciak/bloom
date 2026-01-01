function sanitizeSegment(segment) {
  return segment
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildAutosavePath({ workspaceName, filePath }) {
  const safeWorkspace = sanitizeSegment(workspaceName || 'workspace') || 'workspace';
  const fallbackName = 'untitled.strudel';
  const rawPath = filePath?.trim() ? filePath : fallbackName;
  const parts = rawPath.split('/').filter(Boolean).map((part) => sanitizeSegment(part) || 'file');
  const fileName = parts.pop() ?? fallbackName;
  const withExt = fileName.includes('.') ? fileName : `${fileName}.strudel`;
  const safeParts = [safeWorkspace, ...parts, withExt].filter(Boolean);
  return `autosaves/${safeParts.join('/')}`;
}

export function shouldPromptAutosave({ autosaveLastModified, fileLastModified, autosaveText, fileText }) {
  if (!autosaveText) return false;
  if (autosaveText === fileText) return false;
  if (!Number.isFinite(autosaveLastModified) || !Number.isFinite(fileLastModified)) return false;
  return autosaveLastModified > fileLastModified;
}
