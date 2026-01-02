import { chromium } from 'playwright';

async function testUI() {
  console.log('🧪 Testing Claude UI prompt...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[ERROR] ${err.message}`));

  try {
    console.log('📍 Loading REPL...');
    await page.goto('http://localhost:4321/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Check if CodeMirror is ready
    console.log('📍 Checking for CodeMirror editor...');
    const editorReady = await page.evaluate(() => {
      return {
        hasMirror: !!window.strudelMirror,
        hasView: !!window.strudelMirror?.editor,
        hasEditor: !!window.strudelMirror?.editor?.state,
      };
    });
    console.log('Editor state:', editorReady);

    if (!editorReady.hasMirror) {
      console.log('❌ StrudelMirror not found');
      return;
    }

    // Try typing \ai at the end of the document
    console.log('\n📍 Typing \\ai in editor...');
    await page.evaluate(() => {
      const view = window.strudelMirror.editor;
      const pos = view.state.doc.length;
      view.dispatch({
        changes: { from: pos, insert: '\n\\ai' },
        selection: { anchor: pos + 4 }
      });
    });

    await page.waitForTimeout(1000);

    // Check if prompt appeared
    const promptVisible = await page.evaluate(() => {
      const prompt = document.querySelector('.claude-prompt');
      return {
        exists: !!prompt,
        visible: prompt ? prompt.offsetParent !== null : false,
        classes: prompt ? prompt.className : null
      };
    });

    console.log('Prompt state:', promptVisible);

    if (promptVisible.visible) {
      console.log('✅ Claude prompt appeared!\n');

      // Try filling it
      console.log('📍 Filling prompt...');
      await page.locator('.claude-prompt-input').fill('make it louder');
      await page.waitForTimeout(500);

      console.log('✅ Test complete - keeping browser open for inspection');
      console.log('Press Ctrl+C to close\n');

      await page.waitForTimeout(60000); // Keep open for inspection
    } else {
      console.log('❌ Prompt did not appear');
      console.log('Checking state field...');

      const fieldState = await page.evaluate(() => {
        const view = window.strudelMirror.editor;
        const state = view.state;
        const fields = [];
        state.config.fields.forEach((field, i) => {
          if (field.key && field.key.toString().includes('claude')) {
            fields.push({ index: i, key: field.key.toString() });
          }
        });
        return fields;
      });

      console.log('Claude fields found:', fieldState);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testUI();
