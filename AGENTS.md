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


## Issue Tracking

We use bd (beads) for issue tracking instead of Markdown TODOs or external tools.

### Quick Reference

```bash
# Find ready work (no blockers)
bd ready --json

# Find ready work including future deferred issues
bd ready --include-deferred --json

# Create new issue
bd create "Issue title" -t bug|feature|task -p 0-4 -d "Description" --json

# Create issue with due date and defer (GH#820)
bd create "Task" --due=+6h              # Due in 6 hours
bd create "Task" --defer=tomorrow       # Hidden from bd ready until tomorrow
bd create "Task" --due="next monday" --defer=+1h  # Both

# Update issue status
bd update <id> --status in_progress --json

# Update issue with due/defer dates
bd update <id> --due=+2d                # Set due date
bd update <id> --defer=""               # Clear defer (show immediately)

# Link discovered work
bd dep add <discovered-id> <parent-id> --type discovered-from

# Complete work
bd close <id> --reason "Done" --json

# Show dependency tree
bd dep tree <id>

# Get issue details
bd show <id> --json

# Query issues by time-based scheduling (GH#820)
bd list --deferred              # Show issues with defer_until set
bd list --defer-before=tomorrow # Deferred before tomorrow
bd list --defer-after=+1w       # Deferred after one week from now
bd list --due-before=+2d        # Due within 2 days
bd list --due-after="next monday" # Due after next Monday
bd list --overdue               # Due date in past (not closed)
```

### Workflow

1. **Check for ready work**: Run `bd ready` to see what's unblocked
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work**: If you find bugs or TODOs, create issues:
   - `bd create "Found bug in auth" -t bug -p 1 --json`
   - Link it: `bd dep add <new-id> <current-id> --type discovered-from`
5. **Complete**: `bd close <id> --reason "Implemented"`
6. **Export**: Run `bd export -o .beads/issues.jsonl` before committing

### Issue Types

- `bug` - Something broken that needs fixing
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature composed of multiple issues
- `chore` - Maintenance work (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (nice-to-have features, minor bugs)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Dependency Types

- `blocks` - Hard dependency (issue X blocks issue Y)
- `related` - Soft relationship (issues are connected)
- `parent-child` - Epic/subtask relationship
- `discovered-from` - Track issues discovered during work

Only `blocks` dependencies affect the ready work queue.

## Development Guidelines

### Before Committing

1. **Run tests**: `pnpm run test`
2. **Export issues**: `bd export -o .beads/issues.jsonl`
3. **Update docs**: If you changed behavior, update README.md or other docs
4. **Git add both**: `git add .beads/issues.jsonl <your-changes>`

### Git Workflow

**Just commit and push.** No branches, no PRs. Direct to main.

```bash
# Make changes
git add <files>

# Export beads issues
bd export -o .beads/issues.jsonl
git add .beads/issues.jsonl

# Commit and push
git commit -m "Your message"
git push

# After pull
git pull
bd import -i .beads/issues.jsonl  # Sync SQLite cache
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

## Current Project Status

Run `bd stats` to see overall progress.

## Questions?

- Check existing issues: `bd list`
- Look at recent commits: `git log --oneline -20`
- Read the docs: README.md
- Create an issue if unsure: `bd create "Question: ..." -t task -p 2`

## Pro Tips for Agents

- Always use `--json` flags for programmatic use
- Link discoveries with `discovered-from` to maintain context
- Check `bd ready` before asking "what next?"
- Export to JSONL before committing (or use git hooks)
- Use `bd dep tree` to understand complex dependencies
- Priority 0-1 issues are usually more important than 2-4


After implementing larger features, update the `README.md` section, "## New features and changes from `strudel`".