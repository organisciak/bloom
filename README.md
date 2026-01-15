# bloom - a strudel fork

`Strudel` is a phenomenal (and phenomenally fun) coding platform.

`bloom`, this repo, is a fork with a bunch of quality of life improvements. *'Improvements'* in the most subjective of ways - this fork is unapolegetically opinionated, messy, and vibe coded. This isn't a capital-P project; I'm making the tool more fun for me, and just riding the waves of where it goes; I welcome you to join.

## New features and changes from `strudel`

- Workspace tab: open a local folder as a workspace (Chromium File System Access API), browse/search files, and keep recents.
- Autosave + recovery when a workspace file has a newer autosave.
- Autocomplete + reference upgrades: tooltips, Hydra docs, synth-aware examples, and `/` command completions.
- Pattern QoL: favorite patterns, plus random/nudge actions apply immediately (no preview confirmation step).
- UI simplifications: removed the Idea feature and Time/CPM displays from the header.
- Optional Claude/OpenAI helpers: compose tab (prompt + context files), inline edits/suggestions, and an error-ribbon "Fix" button.
- Welcome tab: composition generator shortcut plus a tip about `/` tasks and commands.
- Vercel deploy support: Astro Vercel adapter + `vercel.json`. For server output, leave Vercel Output Directory empty.
- Dev tooling: GitHub workflows for Claude-assisted review/security checks.

## Running Locally

After cloning the project, you can run the REPL locally:

1. Install [Node.js](https://nodejs.org/) 18 or newer
2. Install [pnpm](https://pnpm.io/installation)
3. Install dependencies by running the following command:
   ```bash
   pnpm i
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

Optional local Claude/OpenAI features:
- Set `ANTHROPIC_API_KEY` to enable Claude inline edits, suggestions, code fixes, and composition generation.
- Set `OPENAI_API_KEY` to enable OpenAI composition generation.
- Optional: `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-5-20250929`) and `ANTHROPIC_MAX_TOKENS` (defaults to 2048).
- Optional: `OPENAI_MODEL` (defaults to `gpt-5-mini`) and `OPENAI_MAX_TOKENS` (defaults to 2048).

## Contributing

`bloom` uses the [AGPL-3.0](LICENSE.md), following `strudel`. Read their info before forking: <https://strudel.cc/technical-manual/project-start>.

Given the cavalier approach to developing this fork, I don't intent to send strudel any pull requests. But you're welcome to excise ideas or code for those purposes.
