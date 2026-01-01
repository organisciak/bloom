# AGENTS.md

Guidance for future LLMs working in this repo.

## Project overview
- Strudel live-coding music language (monorepo).
- REPL UI lives in `website/src/repl`.
- CodeMirror extensions live in `packages/codemirror`.

## Key features and entry points
- Hydra docs in REPL reference/autocomplete:
  - Source: `docs/hydra/funcs.md`
  - Generator: `tools/hydra-docs.mjs`
  - Output: `hydra-docs.json`
  - UI reference: `website/src/repl/components/panel/Reference.jsx`
  - Autocomplete: `packages/codemirror/autocomplete.mjs`
- Random favorites:
  - Logic helper: `website/src/repl/random_utils.mjs`
  - Handler: `website/src/repl/useReplContext.jsx`
  - Favorites: `website/src/user_pattern_utils.mjs`
  - UI button: `website/src/repl/components/Header.jsx`
- File System Access API (browser):
  - Handlers: `website/src/repl/useReplContext.jsx`
  - Buttons: `website/src/repl/components/Header.jsx`
  - Requires Chromium-based browsers for `showOpenFilePicker`/`showSaveFilePicker`.
- Claude inline edits:
  - API proxy: `website/src/pages/api/claude-api.ts` (requires `ANTHROPIC_API_KEY`)
  - Editor prompt: `packages/codemirror/claude.mjs`
  - Styles: `website/src/repl/Repl.css`

## Tests
- Always add tests for new logic; do not ship behavior changes without tests.
- Write tests early and run them often while iterating.
- Targeted runs: `pnpm vitest run test/<file>.mjs`
- Full suite: `pnpm test`
- Use short, friendly comments to explain intent in tests:
  - Prefer "arrange / act / assert" markers for readability.
  - Explain *why* a case exists (edge case, regression, expected heuristic).
  - Avoid comments that restate the code.

## Design philosophy
- **LLMs as backend tools**: Language models are infrastructure, not features. They can inform planning, critiquing, and brainstorming alongside other approaches, but aren't the exclusive solution.
- **No AI branding**: Don't label features as "AI" in the UI. Mention capabilities softly in documentation. Users shouldn't need to know or care about the implementation—the tool should simply work better.
- **Seamless integration**: LLM-powered features should feel like natural parts of the creative workflow, not special or separate.

## Working style
- Check in with the user often while building features to confirm direction.
- When writing commit messages and the user asked for it, use a copy-edited version of their wording as a quote when relevant.

## Common workflows
- Update Hydra docs:
  1) Edit `docs/hydra/funcs.md`
  2) Run `node tools/hydra-docs.mjs` to regenerate `hydra-docs.json`
- Update JS docs: `npm run jsdoc-json` (generates `doc.json`)

## Tooling
- Use `rg` for search.
- Use `pnpm` for install/test/dev (`pnpm dev` for the website).
