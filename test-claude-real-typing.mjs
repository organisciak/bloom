import { chromium } from 'playwright';

async function testRealTyping() {
  console.log('🧪 Testing Claude with real keyboard input...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[claude]') || text.includes('error') || text.includes('Error')) {
      console.log(`[BROWSER] ${text}`);
    }
  });
  page.on('pageerror', err => console.error(`[ERROR] ${err.message}`));

  try {
    console.log('📍 Loading REPL...');
    await page.goto('http://localhost:4321/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Focus the editor by clicking on it
    console.log('📍 Clicking on editor...');
    await page.locator('.cm-content').click();
    await page.waitForTimeout(500);

    // Move to end of document
    await page.keyboard.press('End');
    await page.waitForTimeout(200);

    // Add a newline first
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Type \ai character by character
    console.log('📍 Typing \\ai on new line...');
    await page.keyboard.type('\\ai', { delay: 100 });
    await page.waitForTimeout(1000);

    // Check if prompt appeared
    const promptVisible = await page.locator('.claude-prompt').isVisible().catch(() => false);

    if (promptVisible) {
      console.log('✅ Prompt appeared!\n');

      // Type a prompt
      console.log('📍 Typing prompt: "add clap"');
      await page.keyboard.type('add clap', { delay: 50 });
      await page.waitForTimeout(500);

      // Submit (Enter key)
      console.log('📍 Pressing Enter to submit...');
      await page.keyboard.press('Enter');

      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(10000);

      // Check if code was updated
      const codeUpdated = await page.evaluate(() => {
        const editor = window.strudelMirror?.editor;
        if (!editor) return { updated: false, reason: 'No editor' };

        const code = editor.state.doc.toString();
        return {
          updated: true,
          hasClap: code.includes('clap') || code.includes('cp'),
          codeLength: code.length,
          codePreview: code.substring(0, 100)
        };
      });

      console.log('Code update result:', codeUpdated);

      if (codeUpdated.hasClap) {
        console.log('✅ SUCCESS! Code was updated with clap sound');
      } else {
        console.log('⚠️  Code updated but no clap detected');
      }

    } else {
      console.log('❌ Prompt did NOT appear after typing \\ai\n');

      // Debug: check if the extension is loaded
      const debugInfo = await page.evaluate(() => {
        const editor = window.strudelMirror?.editor;
        if (!editor) return { error: 'No editor' };

        const state = editor.state;
        const extensions = state.field ? 'hasField' : 'noField';

        // Check document content
        const doc = state.doc.toString();
        const hasAiCommand = doc.includes('\\ai');

        return {
          extensions,
          hasAiCommand,
          docLength: doc.length,
          lastChars: doc.substring(doc.length - 10)
        };
      });

      console.log('Debug info:', debugInfo);
    }

    // Keep browser open for inspection
    console.log('\n⏸️  Keeping browser open for 30s for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testRealTyping();
