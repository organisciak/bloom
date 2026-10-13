# AGENTS.md

Guidance for future LLMs working in this repo.

## Project overview
- Strudel live-coding music language (monorepo).
- REPL UI lives in `website/src/repl`.
- CodeMirror extensions live in `packages/codemirror`.

## Multi-app philosophy
- **Bloom is a platform of creative interfaces, not one app.** The REPL is just one way to interact with the pattern engine.
- **It's encouraged to create new routes as experimental UIs.** Each route is a standalone mini-app with its own personality and purpose.
- **The pattern engine (Superdough/webaudio) and file watcher are shared infrastructure.** They live in `website/src/engine/` as a React context provider so any route can use them without duplicating logic.
- The main REPL (`/`) remains the full-featured editor. Lighter routes like `/headless` and `/controller` offer focused, stripped-down interfaces.

### How to create a new mini-app route
1. Create a new `.astro` page in `website/src/pages/` (e.g. `myapp.astro`).
2. Create a React component for your app UI in `website/src/engine/` or `website/src/apps/`.
3. Wrap your component with `<BloomEngineProvider>` to get access to the shared audio engine, file watcher, and playback controls.
4. Use the `useBloomEngine()` hook inside your component to access: `started`, `toggle`, `tempo`, `code`, `fileName`, `evaluate`, `openFile`, `openWorkspace`.
5. Add `client:only="react"` to your component in the Astro page.
6. Minimal example:
   ```jsx
   import { BloomEngineProvider, useBloomEngine } from '../engine/BloomEngineContext';
   function MyApp() {
     const { started, toggle, tempo } = useBloomEngine();
     return <button onClick={toggle}>{started ? 'Stop' : 'Play'}</button>;
   }
   export default function MyAppWrapper() {
     return <BloomEngineProvider><MyApp /></BloomEngineProvider>;
   }
   ```

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

## Development philosophy

**Forward momentum over preservation.** This codebase moves fast and breaks things. Don't be precious about existing code. If a feature isn't working or isn't needed, remove it. If you have an idea, build it. We can always `git revert`.

**No PRs required.** Just commit and push to main. No review process, no waiting. If it breaks, we fix it. The bias is toward action.

**Bold changes welcome.** Rip out features, add experimental routes, refactor aggressively. The goal is a tool that feels alive and evolving, not a museum piece.

**Multi-app architecture.** Bloom is a platform, not a single app. The pattern engine (Superdough) and file watcher are shared infrastructure. Create new React routes freely as experimental interfaces: `/headless`, `/controller`, `/visualizer`, whatever. Each route is a mini-app that can have its own aesthetic and purpose.

## Working style
- Check in with the user often while building features to confirm direction.
- NEVER push to `upstream`, just `origin`
- Note new features, once they're implemented, to README in the `New features and changes` section
- When writing commit messages and the user asked for it, use a copy-edited version of their wording as a quote when relevant.

## Common workflows
- Update Hydra docs:
  1) Edit `docs/hydra/funcs.md`
  2) Run `node tools/hydra-docs.mjs` to regenerate `hydra-docs.json`
- Update JS docs: `npm run jsdoc-json` (generates `doc.json`)

## Tooling
- Use `rg` for search.
- Use `pnpm` for install/test/dev (`pnpm dev` for the website).


## Tasks: the Obsidian tracker (Peter, 2026-10-12; replaced beads)

Tasks live in Peter's Obsidian vault, not in this repo:

    ~/workspace/Obsidian Vault/Projects/bloom/
      LLM Todos.md       the inbox: Peter dictates under "Inbox"; agents leave
                         him notes under "From Claude"
      Tasks/*.md         one note per task (frontmatter: id bl-NN, status,
                         priority 1-4, type, area, from, labels, created, closed)
      Bloom Tasks.base   table views: Open, Needs Peter, From Peter, Done, By area
      bloom.md           the full conventions, for Peter and for agents

- **Session start:** the SessionStart hook runs `node tools/tasks.mjs`, which
  prints the untriaged Inbox lines and the open tasks (`--next` gives the next id).
- **Triage** every unticked Inbox line into a task note (next free `bl-NN`,
  Peter's words verbatim under `## Peter's words`), then tick the line, append
  `→ [[note]] ✅ <date>` and move it under **Triaged**.
- **Work:** `status: doing` before coding; when done `status: done`, `closed:`,
  and a dated `## Log` line saying what shipped and the commit. Never delete a
  note: `dropped` with a reason.
- Found work you won't do now → a task note with `from: ai`, not a TODO in code.
- Need a decision or a listen from Peter → a dated line under **From Claude** in
  `LLM Todos.md`, and label the task `needs-peter`.
- Cite task ids in commit messages (`bl-28: ...`).
- **No `- [ ]` checkboxes outside the Inbox**: every open checkbox in the vault
  lands in Peter's global To-do List.
- Old beads issues are archived in `docs/archive/beads-issues-2026-10-12.jsonl`;
  each migrated note carries its `beads:` id.

## Development Guidelines

### Before Committing

1. **Run tests**: `pnpm run test`
2. **Update docs**: If you changed behavior, update README.md or other docs
3. **Update the task note** in the Obsidian tracker (status, log line)

### Git Workflow

**Just commit and push.** No branches, no PRs. Direct to main.

```bash
git add <files>
git commit -m "bl-NN: Your message"
git push
```

If working in a **worktree** for parallel work, merge to main when done:
```bash
git checkout main
git merge feat/your-branch
git push
git worktree remove /tmp/your-worktree
```

### Syncing with Upstream Strudel
#### Merge from upstream (recommended for most cases)

```bash
git fetch upstream
git merge upstream/main
git push origin main
```

**After syncing:**
1. Run tests: `pnpm run test`
2. Check for breaking changes in upstream commits
3. Update any custom features that may conflict with upstream changes

## Questions?

- Open tasks: `node tools/tasks.mjs`
- Look at recent commits: `git log --oneline -20`
- Read the docs: README.md
- Unsure about direction → ask Peter under **From Claude** in `LLM Todos.md`


After implementing larger features, update the `README.md` section, "## New features and changes from `strudel`".
