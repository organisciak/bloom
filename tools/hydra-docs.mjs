import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve('docs/hydra/funcs.md');
const targetPath = resolve('hydra-docs.json');

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const renderInline = (text) => {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  escaped = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return escaped;
};

const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

const parseParamLine = (line) => {
  const match = line.match(/^\* `([^`]+)`\s*(?:::\s*(.*))?$/);
  if (!match) return null;
  const name = match[1].trim();
  const rest = (match[2] || '').trim();

  let type;
  let descriptionParts = [];

  if (rest) {
    const typeMatch = rest.match(/^([^\s(]+)\s*(.*)$/);
    type = typeMatch?.[1]?.trim();
    let remainder = typeMatch?.[2]?.trim() ?? '';

    const defaultMatch = remainder.match(/^\(default `([^`]+)`\)\s*(.*)$/);
    if (defaultMatch) {
      descriptionParts.push(`default ${defaultMatch[1]}`);
      remainder = defaultMatch[2]?.trim() ?? '';
    }

    if (remainder) {
      descriptionParts.push(remainder.replace(/^\(|\)$/g, '').trim());
    }
  }

  return {
    name,
    type,
    descriptionParts,
  };
};

const parseDocs = (text) => {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let category = '';
  const headingIndexes = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      category = line.replace(/^##\s+/, '').trim();
    }
    if (line.startsWith('### ')) {
      headingIndexes.push({ index: i, category });
    }
  }

  for (let i = 0; i < headingIndexes.length; i += 1) {
    const { index, category: blockCategory } = headingIndexes[i];
    const nextIndex = headingIndexes[i + 1]?.index ?? lines.length;
    const blockLines = lines.slice(index + 1, nextIndex);

    const signatureLine = blockLines.find((line) => /^`[^`]+`/.test(line));
    if (!signatureLine) continue;

    const signature = signatureLine.replace(/`/g, '').trim();
    const name = signature.replace(/^\./, '').split('(')[0].trim();
    if (!name) continue;

    const params = [];
    let currentParam = null;

    for (const line of blockLines) {
      const trimmed = line.trim();
      const isNestedBullet = /^\s+\*/.test(line);
      const isTopLevelBullet = /^\*\s+/.test(line);
      if (!trimmed) {
        if (currentParam) {
          params.push(currentParam);
          currentParam = null;
        }
        continue;
      }
      if (trimmed.startsWith('```')) {
        if (currentParam) {
          params.push(currentParam);
          currentParam = null;
        }
        continue;
      }
      if (isTopLevelBullet && trimmed.startsWith('* `')) {
        if (currentParam) {
          params.push(currentParam);
        }
        const parsed = parseParamLine(trimmed);
        if (parsed) {
          currentParam = parsed;
        }
        continue;
      }
      if (currentParam && isNestedBullet) {
        currentParam.descriptionParts.push(trimmed.replace(/^\*\s+/, ''));
      }
    }
    if (currentParam) {
      params.push(currentParam);
    }

    const normalizedParams = params.map((param) => {
      const description = normalizeWhitespace(param.descriptionParts.join(' | '));
      return {
        name: param.name,
        type: param.type ? { names: [param.type] } : undefined,
        description: description ? renderInline(description) : undefined,
      };
    });

    const examples = [];
    let inCode = false;
    let codeLines = [];
    for (const line of blockLines) {
      if (line.trim().startsWith('```')) {
        if (inCode) {
          examples.push(codeLines.join('\n').trimEnd());
          codeLines = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeLines.push(line);
      }
    }

    const descriptionLines = [];
    let inDescriptionCode = false;
    for (const line of blockLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inDescriptionCode = !inDescriptionCode;
        continue;
      }
      if (inDescriptionCode) {
        continue;
      }
      if (!trimmed) {
        descriptionLines.push('');
        continue;
      }
      if (trimmed === signatureLine.trim()) {
        continue;
      }
      if (/^\s*\*/.test(line)) {
        continue;
      }
      if (trimmed.startsWith('#### Example')) {
        continue;
      }
      if (trimmed.startsWith('---') || trimmed.startsWith('## ')) {
        break;
      }
      if (trimmed.startsWith('- [')) {
        continue;
      }
      descriptionLines.push(trimmed);
    }

    const descriptionBlocks = [];
    let currentBlock = [];
    for (const line of descriptionLines) {
      if (!line) {
        if (currentBlock.length) {
          descriptionBlocks.push(normalizeWhitespace(currentBlock.join(' ')));
          currentBlock = [];
        }
        continue;
      }
      currentBlock.push(line);
    }
    if (currentBlock.length) {
      descriptionBlocks.push(normalizeWhitespace(currentBlock.join(' ')));
    }

    const descriptionParts = [`Signature: ${renderInline(`\`${signature}\``)}`];
    if (descriptionBlocks.length) {
      descriptionParts.push(descriptionBlocks.map(renderInline).join('<br><br>'));
    }

    entries.push({
      name,
      description: descriptionParts.join('<br>'),
      params: normalizedParams.length ? normalizedParams : undefined,
      examples: examples.length ? examples : undefined,
      meta: {
        source: 'hydra',
        category: blockCategory || undefined,
      },
    });
  }

  return entries;
};

const text = await readFile(sourcePath, 'utf8');
const docs = parseDocs(text);
const output = {
  docs,
  meta: {
    source: 'https://github.com/ojack/hydra/blob/main/docs/funcs.md',
    license: 'AGPL-3.0-or-later',
  },
};

await writeFile(targetPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Wrote ${docs.length} hydra docs to ${targetPath}`);
