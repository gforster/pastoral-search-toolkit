import { chromium, firefox, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { newProject, setAnswer, serializeBackup } from '../src/domain.js';

const output = 'test-results/working-packets';
await mkdir(output, { recursive: true });
const port = process.env.WORKING_TEST_PORT || '4198';
const root = `http://127.0.0.1:${port}/pastoral-search-toolkit/`;
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: port, BASE_PATH: '/pastoral-search-toolkit/' },
  stdio: 'pipe',
});
const results = [];
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(root)).ok) break;
    } catch {}
    if (i === 59) throw new Error('Working packet test server did not start');
    await delay(100);
  }
  for (const [engine, launcher] of [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit],
  ]) {
    const options = {
      headless: true,
      ...(engine === 'chromium' && process.env.CHROME_CHANNEL
        ? { channel: process.env.CHROME_CHANNEL }
        : {}),
    };
    if (!options.channel) {
      try {
        await access(launcher.executablePath());
      } catch {
        if (engine === 'chromium')
          throw new Error('Install Playwright Chromium or set CHROME_CHANNEL');
        results.push({ engine, result: 'unavailable — engine binary not installed' });
        continue;
      }
    }
    const browser = await launcher.launch(options);
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const p = newProject('planned');
      p.name = 'Cedar Brook rehearsal';
      for (const [id, value] of Object.entries({
        churchName: 'Cedar Brook Fictional Church',
        event: 'retirement',
        pulpitPlan: 'Services covered; future coverage needs a report.',
        chair: 'To be selected at first meeting',
        salary: 'Not yet proposed',
        compStatus: 'discussion',
      }))
        setAnswer(p, id, value);
      await page.goto(`${root}#projects`);
      await page.locator('#import-file').setInputFiles({
        name: 'fictional.json',
        mimeType: 'application/json',
        buffer: Buffer.from(serializeBackup(p)),
      });
      await page.waitForURL(/#project\/[^/]+\/dashboard$/);
      const base = new URL(page.url()).hash.replace('/dashboard', '');
      await page.goto(`${root}${base}/documents`);
      await page.getByRole('link', { name: /Working committee binder/ }).click();
      await page.locator('.working-packet').waitFor();
      assert.equal(await page.locator('.packet-group').count(), 12);
      assert.equal(
        await page.locator('.working-packet h1').textContent(),
        'Working committee binder',
      );
      const text = await page.locator('.working-packet').textContent();
      assert.equal(await page.locator('.qualification-block').count(), 26);
      assert.equal(await page.locator('.qualification-reference').count(), 26);
      assert((await page.locator('.artifact-note').count()) >= 5);
      assert.match(await page.locator('.meeting-legend').textContent(), /\[1\].*\[2\].*\[F\]/);
      assert.match(
        await page.locator('.working-packet').textContent(),
        /Committee Governance Summary/,
      );
      assert.match(text, /Cedar Brook Fictional Church/);
      assert.match(text, /TBD/);
      assert.match(text, /Not yet proposed/);
      assert.doesNotMatch(text, /Interview Question Bank/);
      await page.getByRole('button', { name: '2. Committee & meetings', exact: true }).click();
      assert.match(page.url(), /documents\/working-binder$/);
      await page.waitForFunction(
        () => Math.abs(document.getElementById('packet-group-2').getBoundingClientRect().top) < 120,
      );
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download printable HTML' }).click(),
      ]);
      await download.saveAs(`${output}/${engine}-binder.html`);
      const html = await readFile(`${output}/${engine}-binder.html`, 'utf8');
      assert.match(html, /class="work-table(?:\s[^"]*)?"/);
      assert.match(html, /href="#packet-group-12"/);
      assert.doesNotMatch(html, /data-packet-section/);
      await page.screenshot({ path: `${output}/${engine}-binder-desktop.png` });
      const axe = await readFile(
        new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
        'utf8',
      );
      await page.evaluate(axe);
      const violations = await page.evaluate(async () =>
        (
          await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((v) => v.id),
      );
      assert.deepEqual(violations, []);
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        'Mobile page fits viewport',
      );
      await page.screenshot({ path: `${output}/${engine}-binder-mobile.png` });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.reload();
      await page.locator('.working-packet').waitFor();
      assert.match(
        await page.locator('.working-packet').textContent(),
        /Cedar Brook Fictional Church/,
      );
      if (engine === 'chromium') {
        await page.emulateMedia({ media: 'print' });
        await page.pdf({
          path: `${output}/working-binder.pdf`,
          format: 'Letter',
          printBackground: true,
          preferCSSPageSize: true,
        });
        await page.emulateMedia({ media: 'screen' });
      }
      for (const id of ['meeting-agenda', 'chair-guide', 'second-meeting', 'later-resources']) {
        await page.goto(`${root}${base}/documents/${id}`);
        await page.locator('.working-packet').waitFor();
        if (id === 'later-resources')
          assert.match(
            await page.locator('.working-packet').textContent(),
            /Interview Question Bank/,
          );
        else if (id === 'second-meeting')
          assert.match(await page.locator('.working-packet').textContent(), /48 hours beforehand/);
        else
          assert.match(
            await page.locator('.working-packet').textContent(),
            /First meeting assignments/,
          );
        if (engine === 'chromium') {
          await page.emulateMedia({ media: 'print' });
          assert.equal(await page.locator('.sidebar').isVisible(), false);
          assert.equal(await page.locator('.working-packet > footer').isVisible(), false);
          await page.pdf({
            path: `${output}/${id}.pdf`,
            format: 'Letter',
            printBackground: true,
            preferCSSPageSize: true,
          });
          await page.emulateMedia({ media: 'screen' });
        }
      }
      assert.deepEqual(errors, []);
      results.push({
        engine,
        version: browser.version(),
        platform: process.platform,
        channel: options.channel || 'bundled',
        result: 'passed',
        device: 'desktop browser with emulated 390px viewport; no physical phone',
        pdf: engine === 'chromium' ? 'generated' : 'PDF API unavailable; HTML print layout only',
      });
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  server.kill();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
console.log('Working packet browser checks:', JSON.stringify(results));
