import { chromium } from 'playwright';

async function checkLoadedCode() {
  console.log('🔍 Checking what code the browser is loading...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:4321/');
    await page.waitForLoadState('networkidle');

    // Check if the loaded claude.mjs has our setTimeout fix
    const hasSetTimeoutFix = await page.evaluate(() => {
      // Try to get the source of the loaded module
      const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
      const claudeScript = scripts.find(s => s.src && s.src.includes('claude.mjs'));

      return {
        claudeScriptFound: !!claudeScript,
        claudeScriptSrc: claudeScript?.src || null,
      };
    });

    console.log('Claude script info:', hasSetTimeoutFix);

    // Try to fetch the actual claude.mjs content
    if (hasSetTimeoutFix.claudeScriptSrc) {
      const response = await page.goto(hasSetTimeoutFix.claudeScriptSrc);
      const content = await response.text();

      const hasSetTimeout = content.includes('setTimeout(() => {');
      const hasClaudeApi = content.includes('/api/claude-api');
      const hasOldClaudeEndpoint = content.includes('/api/claude') && !content.includes('/api/claude-api');

      console.log('\nLoaded code analysis:');
      console.log('- Has setTimeout fix:', hasSetTimeout);
      console.log('- Uses /api/claude-api:', hasClaudeApi);
      console.log('- Uses old /api/claude:', hasOldClaudeEndpoint);

      if (!hasSetTimeout) {
        console.log('\n❌ Browser is loading OLD version without setTimeout fix!');
        console.log('   The dev server needs to rebuild the package.');
      } else {
        console.log('\n✅ Browser is loading UPDATED version with fixes!');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkLoadedCode();
