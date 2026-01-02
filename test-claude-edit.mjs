import { chromium } from 'playwright';

async function testClaudeEdit() {
  console.log('🚀 Starting Claude edit test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[ERROR] ${err.message}`));

  try {
    // 1. Navigate to the REPL
    console.log('📍 Step 1: Navigating to REPL...');
    await page.goto('http://localhost:4321/');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded\n');

    // 2. Test API endpoint directly from browser context
    console.log('📍 Step 2: Testing API endpoint with fetch...');
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/claude-api', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: '$: s("bd sd")',
            prompt: 'add hats'
          })
        });

        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('API Response:', JSON.stringify(apiTest, null, 2));

    if (apiTest.status === 404) {
      console.log('❌ API endpoint not found (404)\n');
    } else if (!apiTest.ok) {
      console.log(`⚠️  API returned error status ${apiTest.status}`);
      console.log(`Error: ${JSON.stringify(apiTest.data)}\n`);
    } else {
      console.log('✅ API endpoint responded successfully\n');
    }

    // 3. Try to trigger Claude edit in UI
    console.log('📍 Step 3: Looking for Claude prompt trigger...');

    // Wait for CodeMirror to be ready
    await page.waitForTimeout(2000);

    // Try to find the editor
    const editorExists = await page.evaluate(() => {
      return !!window.strudelMirror;
    });

    if (editorExists) {
      console.log('✅ StrudelMirror editor found\n');

      // Try triggering with keyboard shortcut (Cmd+\ or Ctrl+\)
      console.log('📍 Step 4: Triggering Claude prompt with Cmd+\\...');
      await page.keyboard.press('Meta+Backslash');
      await page.waitForTimeout(1000);

      // Check if prompt appeared
      const promptVisible = await page.locator('.claude-prompt').isVisible().catch(() => false);

      if (promptVisible) {
        console.log('✅ Claude prompt appeared\n');

        // Fill in the prompt
        console.log('📍 Step 5: Filling prompt...');
        await page.locator('.claude-prompt-input').fill('add hihat');
        await page.locator('.claude-prompt-button').first().click();

        console.log('⏳ Waiting for response...');
        await page.waitForTimeout(5000);

        console.log('✅ Test complete\n');
      } else {
        console.log('❌ Claude prompt did not appear\n');
      }
    } else {
      console.log('❌ StrudelMirror not found\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testClaudeEdit();
