import { setActiveFooter, setIsPanelOpened, useSettings } from '@src/settings.mjs';
import { SpecialActionButton } from '../button/action-button.jsx';
import { buildOpenComposeHandler } from '../../welcome_utils.mjs';

const { BASE_URL } = import.meta.env;
const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export function WelcomeTab({ context }) {
  const { fontFamily } = useSettings();
  const handleOpenCompose = buildOpenComposeHandler(setActiveFooter, setIsPanelOpened);
  return (
    <div className="prose dark:prose-invert min-w-full pt-2 font-sans pb-8 px-4 " style={{ fontFamily }}>
      <h3>꩜ welcome</h3>
      <p>
        You have found <span className="underline">bloom</span>, the ugly step-fork of the excellent{' '}
        <a href="https://strudel.cc" target="_blank">strudel</a> live coding platform.
        Write dynamic music in the browser, sprinkled with a few experimental features.
        
        To get started:
        <br />
        <br />
        <span className="underline">1. hit play</span> - <span className="underline">2. change something</span> -{' '}
        <span className="underline">3. hit update</span>
        {/* <br />
        If you don't like what you hear, try <span className="underline">shuffle</span>! */}
      </p>
      <p>
        {/* To learn more about what this all means, check out the{' '} */}
        To get started, check out the{' '}
        <a href={`${baseNoTrailing}/workshop/getting-started/`} target="_blank">
          interactive tutorial
        </a>
        , or generate a composition and hit play.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <SpecialActionButton label="Generate composition" onClick={handleOpenCompose} />
        <p className="text-sm text-foreground opacity-80">
          Tip: type <code>/</code> in the editor to see tasks and commands for inline edits, suggestions, and new sections.
        </p>
      </div>
      <p>
        Also feel free to join the{' '}
        <a href="https://discord.com/invite/HGEdXmRkzT" target="_blank">
          discord channel
        </a>{' '}
        to ask any questions, give feedback or just say hello.
      </p>
      <h3>꩜ about</h3>
      <p>
        bloom is built on{' '}
        <a href="https://strudel.cc" target="_blank">
          strudel
        </a>
        , the brilliant JavaScript implementation of{' '}
        <a href="https://tidalcycles.org/" target="_blank">
          tidalcycles
        </a>.

        Both projects are free/open source software
        under the{' '}
        <a href="https://codeberg.org/uzu/strudel/src/branch/main/LICENSE" target="_blank">
          GNU Affero General Public License
        </a>
        . Find strudel's source at{' '}
        <a href="https://codeberg.org/uzu/strudel" target="_blank">
          codeberg
        </a>
        , bloom's fork on{' '}
        <a href="https://github.com/organisciak/live-coding-music" target="_blank">
          github
        </a>
        , and <a href="https://github.com/felixroos/dough-samples/blob/main/README.md">licensing info</a>{' '}
        for the default sound banks. Please consider{' '}
        <a href="https://opencollective.com/tidalcycles" target="_blank">
          supporting strudel and tidalcycles
        </a>
      </p>
    </div>
  );
}
