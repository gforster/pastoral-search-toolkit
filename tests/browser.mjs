import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { MODULES } from '../src/data.js';
import { DOCUMENTS } from '../src/documents.js';
const output = 'test-results';
await mkdir(output, { recursive: true });
const port = Number(process.env.TEST_PORT || 4187),
  subpath = '/pastoral-search-toolkit/',
  url = process.env.TEST_BASE_URL || `http://127.0.0.1:${port}${subpath.slice(0, -1)}`;
let server, browser;
const errors = [],
  network = [];
try {
  if (!process.env.TEST_BASE_URL) {
    server = spawn(process.execPath, ['scripts/serve.mjs'], {
      env: { ...process.env, PORT: String(port), BASE_PATH: subpath },
      stdio: 'pipe',
    });
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch(url)).ok) break;
      } catch {}
      if (i === 39) throw new Error('Test server did not start');
      await delay(100);
    }
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  // Exercise the optional tool contract using the documented registry shape.
  await context.addInitScript(() => {
    globalThis.registeredTools = {};
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool(tool) {
          globalThis.registeredTools[tool.name] = tool;
        },
      },
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => {
    if (!req.url().startsWith(url) && !req.url().startsWith('blob:')) network.push(req.url());
  });
  const axe = await readFile(
    new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  async function audit(label) {
    await page.evaluate(axe);
    const result = await page.evaluate(
      async () =>
        await axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        }),
    );
    const violations = result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    }));
    assert.deepEqual(
      violations,
      [],
      `${label} accessibility violations: ${JSON.stringify(violations)}`,
    );
  }
  async function saved() {
    await page.waitForFunction(
      () => !document.querySelector('#save-indicator')?.textContent.includes('Saving'),
    );
  }
  async function noOverflow(label) {
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `${label} horizontal overflow`,
    );
  }
  await page.goto(url + '/');
  await page.locator('.entry-card').first().waitFor();
  await audit('home');
  await page.keyboard.press('Tab');
  assert.equal(
    await page.locator('.skip-link').evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#main').evaluate((el) => el === document.activeElement), true);
  await page.screenshot({ path: `${output}/home.png`, fullPage: true });
  await page.getByRole('link', { name: /Our pastor just left/ }).click();
  await page.locator('#field-event').selectOption('death');
  assert.match(await page.locator('.notice').textContent(), /grieving/);
  await page.locator('#field-vacant').selectOption('yes');
  await page.locator('#field-interim').selectOption('yes');
  await page.locator('#field-associate').selectOption('no');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#field-churchName').fill('Example Baptist Church');
  await page.locator('#field-location').fill('Example Town');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#inventory-constitution').selectOption('yes');
  await page.getByRole('button', { name: 'Create our project' }).click();
  await page.locator('.focus-panel').waitFor();
  const base = new URL(page.url()).hash.replace('/dashboard', '');
  await audit('dashboard');
  await page.screenshot({ path: `${output}/dashboard.png`, fullPage: true });
  console.log('PASS orientation, compassionate guidance, keyboard navigation, dashboard');
  await page.goto(`${url}/${base}/module/transition`);
  await page
    .locator('#field-interimTerms')
    .fill('Temporary church-approved role, limited authority, no automatic succession.');
  await page
    .locator('#field-carePlan')
    .fill('Designated care coordinator; private cases kept in secure records.');
  await saved();
  await page.reload();
  assert.match(await page.locator('#field-interimTerms').inputValue(), /no automatic succession/);
  await page.goto(`${url}/${base}/module/governance?field=quorum`);
  await page.locator('#field-quorum').fill('Confirmed rule in constitution, article 8.');
  await page.locator('[data-unknown="quorum"]').click();
  assert.equal(await page.locator('#field-quorum').inputValue(), '');
  await audit('governance');
  await page.goto(`${url}/${base}/dashboard`);
  await page.locator('#milestone').selectOption('committee');
  await page.goto(`${url}/${base}/tasks/REQUIRED_LATER`);
  assert.match(await page.locator('.task-list').textContent(), /quorum/);
  await page.goto(`${url}/${base}/dashboard`);
  await page.locator('#milestone').selectOption('finalist');
  await page.goto(`${url}/${base}/tasks/BLOCKER_NOW`);
  assert.match(await page.locator('.task-list').textContent(), /quorum/);
  console.log('PASS persistence, unknown answers, milestone-dependent blockers');
  await page.goto(`${url}/${base}/module/qualifications`);
  await page.locator('.qualification summary').first().click();
  for (const k of ['meaning', 'evidence', 'disqualifying', 'questions'])
    await page.locator(`#q1-${k}`).fill(`Church review: ${k}`);
  await saved();
  await page.reload();
  await page.locator('.qualification summary').first().click();
  assert.equal(await page.locator('#q1-meaning').inputValue(), 'Church review: meaning');
  await page.goto(`${url}/${base}/module/convictions`);
  await page.getByRole('button', { name: /Add a conviction/ }).click();
  await page
    .locator('[data-part="statement"]')
    .fill('A personal preference, never a biblical gate.');
  await page.locator('[data-part="category"]').selectOption('preference');
  await page.locator('[data-part="evidence"]').fill('Recorded as a preference for discussion.');
  await audit('convictions');
  await page.goto(`${url}/${base}/module/interviews`);
  await page.locator('[data-question="i1"]').check();
  await page.locator('.question-group summary').filter({ hasText: 'Scenario questions' }).click();
  await page.locator('[data-question="i8"]').check();
  await page.goto(`${url}/${base}/documents/interviews`);
  assert.match(
    await page.locator('.document-sheet').textContent(),
    /long-time member feels unseen/,
  );
  await page.goto(`${url}/${base}/tasks`);
  await page.locator('#task-label').fill('Verify additional local provision');
  await page.locator('#task-owner').fill('Clerk');
  await page.getByRole('button', { name: 'Add prerequisite' }).click();
  assert.match(
    await page.locator('.custom-task').textContent(),
    /Verify additional local provision/,
  );
  await page.locator('.custom-task input').check();
  await audit('tasks');
  console.log('PASS qualifications, category separation, question selection, custom requirements');
  await page.goto(`${url}/${base}/module/position`);
  await page.locator('#field-pastoralModel').selectOption('bivocational');
  await page.goto(`${url}/${base}/module/interviews`);
  await page.locator('#field-sermonReview').selectOption('yes');
  for (const module of MODULES) {
    await page.goto(`${url}/${base}/module/${module.id}`);
    await page.locator('.module-header').waitFor();
    assert(!(await page.getByText('Module not found', { exact: true }).count()));
  }
  for (const doc of DOCUMENTS) {
    await page.goto(`${url}/${base}/documents/${doc.id}`);
    await page.locator('.document-sheet').waitFor();
    assert.match(
      await page.locator('.document-sheet').textContent(),
      /INCOMPLETE|READY FOR COMMITTEE REVIEW|DRAFT/,
    );
  }
  await page.goto(`${url}/${base}/documents/compensation`);
  assert.match(await page.locator('.document-sheet').textContent(), /under development/);
  await audit('document');
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.sidebar').isVisible(), false);
  assert.equal(await page.locator('.document-sheet').isVisible(), true);
  await page.pdf({ path: `${output}/compensation.pdf`, format: 'Letter', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  const mdPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const md = await mdPromise;
  assert.match(
    await readFile(await md.path(), 'utf8'),
    /Compensation package is under development/,
  );
  const htmlPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download printable HTML' }).click();
  const htmlDownload = await htmlPromise;
  assert.match(await readFile(await htmlDownload.path(), 'utf8'), /<!doctype html>/);
  await page.goto(`${url}/${base}/documents`);
  const zipPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Full Search Packet (ZIP)' }).click();
  const zip = await zipPromise;
  const bytes = await readFile(await zip.path());
  assert.equal(bytes.readUInt16LE(0), 0x4b50);
  const backupPromise = page.waitForEvent('download');
  await page.locator('.sidebar [data-export]').click();
  const backup = await backupPromise,
    backupPath = await backup.path();
  const backupData = JSON.parse(await readFile(backupPath, 'utf8'));
  assert.equal(backupData.project.answers.churchName.value, 'Example Baptist Church');
  await page.goto(`${url}/#projects`);
  await page.locator('#import-file').setInputFiles(backupPath);
  await page.locator('.focus-panel').waitFor();
  assert.notEqual(new URL(page.url()).hash, `${base}/dashboard`);
  assert.match(await page.locator('.project-name').textContent(), /imported/);
  const importedBase = new URL(page.url()).hash.replace('/dashboard', '');
  console.log('PASS all 19 modules, 43 documents, print, Markdown download, JSON backup/import');
  const toolResult = await page.evaluate(async () => {
    const before = await registeredTools.read_project_readiness.execute({});
    let invalid = false;
    try {
      await registeredTools.open_workbook_module.execute({ moduleId: 'invalid' });
    } catch {
      invalid = true;
    }
    const after = await registeredTools.open_workbook_module.execute({ moduleId: 'governance' });
    return { names: Object.keys(registeredTools), before, invalid, after };
  });
  assert.equal(toolResult.names.length, 2);
  assert(toolResult.invalid);
  assert.equal(toolResult.after.openedModule, 'governance');
  assert.match(await page.locator('h1').textContent(), /Governing documents/);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      '#home',
      `${base}/dashboard`,
      `${base}/module/governance`,
      `${base}/documents/compensation`,
    ]) {
      await page.goto(`${url}/${path}`);
      await page.locator('h1').waitFor();
      await noOverflow(`${width} ${path}`);
    }
    await page.goto(`${url}/${base}/dashboard`);
    await page.getByRole('button', { name: 'Workbook navigation' }).click();
    assert.equal(await page.locator('.sidebar').isVisible(), true);
    await page.getByRole('button', { name: 'Workbook navigation' }).click();
    await audit(`mobile ${width}`);
    await page.screenshot({ path: `${output}/mobile-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${url}/${base}/module/governance`);
  await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
  await noOverflow('200% text');
  await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  await page.goto(`${url}/#home`);
  await page.getByRole('button', { name: /Explore a Sample Search/ }).click();
  await page.locator('.sample-banner').waitFor();
  assert.match(await page.locator('#save-indicator').textContent(), /temporary exploration/);
  await page.goto(`${url}/#projects`);
  assert.equal(await page.getByRole('link', { name: /SAMPLE — Fellowship/ }).count(), 0);
  await page.goto(`${url}/#project/fellowship-example/dashboard`);
  await page.getByRole('button', { name: 'Use this example as a starting point' }).click();
  await page.waitForFunction(() => !document.querySelector('.sample-banner'));
  assert.notEqual(new URL(page.url()).hash, '#project/fellowship-example/dashboard');
  await saved();
  await page.goto(`${url}/#projects`);
  const sampleRow = page.locator('.project-row').filter({ hasText: 'SAMPLE — Fellowship' });
  await sampleRow.locator('summary').click();
  await sampleRow.locator('input').fill('Our saved learning project');
  await sampleRow.getByRole('button', { name: 'Save name' }).click();
  await page.getByRole('link', { name: 'Our saved learning project', exact: true }).waitFor();
  const row = page.locator('.project-row').filter({ hasText: 'Our saved learning project' });
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();
  await page
    .getByRole('link', { name: 'Our saved learning project', exact: true })
    .waitFor({ state: 'detached' });
  await page.goto(`${url}/${importedBase}/dashboard`);
  await page.locator('.preset-panel summary').click();
  await page.getByRole('button', { name: 'Load suggestions for individual review' }).click();
  await page.goto(`${url}/${importedBase}/module/governance?field=callMethod`);
  assert.equal(await page.locator('#field-callMethod').inputValue(), '');
  await page.locator('[data-adopt-suggestion="callMethod"]').click();
  assert.equal(await page.locator('#field-callMethod').inputValue(), 'vote');
  await page.locator('#field-callMethod').selectOption('no_vote');
  assert.equal(await page.locator('#field-quorum').count(), 0);
  assert.equal(await page.locator('#field-decisionProcedure').count(), 1);
  await page.goto(`${url}/${importedBase}/documents/compensation`);
  assert(await page.locator('[data-approve-artifact]').isDisabled());
  await page.goto(`${url}/${importedBase}/documents/prayer`);
  await page.locator('.artifact-review summary').click();
  await page
    .locator('#artifact-approval')
    .fill('Authorized leaders approved this blank prayer template for use.');
  await page.getByRole('button', { name: 'Record approved for use' }).click();
  assert.match(await page.locator('.document-sheet').textContent(), /APPROVED FOR USE/);
  await page.goto(`${url}/${importedBase}/module/communication`);
  await page
    .locator('#field-prayerTemplate')
    .fill('An updated prayer template requiring another review.');
  await page.goto(`${url}/${importedBase}/documents/prayer`);
  assert.doesNotMatch(await page.locator('.document-sheet').textContent(), /APPROVED FOR USE/);
  console.log(
    'PASS sample isolation, duplicate/rename/delete, preset review, non-voting governance, standalone HTML and ZIP',
  );
  const tab = await context.newPage();
  await tab.goto(`${url}/${base}/module/profile`);
  await page.goto(`${url}/${base}/module/profile`);
  await tab.locator('#field-history').fill('Changed in another tab');
  await page.locator('.error-banner').waitFor();
  await page.locator('#field-history').fill('Keep this unsaved copy');
  assert.match(await page.locator('.error-banner').textContent(), /another tab/);
  const storedValue = await tab.evaluate(
    (id) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('pastoral-search-toolkit');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            read = db.transaction('projects').objectStore('projects').get(id);
          read.onsuccess = () => {
            resolve(read.result.answers.history.value);
            db.close();
          };
        };
      }),
    base.split('/')[1],
  );
  assert.equal(storedValue, 'Changed in another tab');
  await tab.close();
  await page.goto(`${url}/${importedBase}/module/profile`);
  await page.locator('#field-location').fill('Another saved project');
  await page.goto(`${url}/${base}/module/profile`);
  assert.match(await page.locator('.error-banner').textContent(), /another tab/);
  assert.equal(await page.locator('#field-history').inputValue(), 'Keep this unsaved copy');
  console.log('PASS mobile, 200% text, tool contracts, and stale-tab protection');
  const keyboardContext = await browser.newContext(),
    keyboardPage = await keyboardContext.newPage();
  await keyboardPage.goto(`${url}/#new/planned`);
  await keyboardPage.locator('h1').waitFor();
  async function tabTo(selector) {
    for (let i = 0; i < 150; i++) {
      if (await keyboardPage.locator(selector).evaluate((el) => el === document.activeElement))
        return;
      await keyboardPage.keyboard.press('Tab');
    }
    throw new Error(`Keyboard could not reach ${selector}`);
  }
  await tabTo('[data-orientation="next"]');
  await keyboardPage.keyboard.press('Enter');
  await tabTo('#field-churchName');
  await keyboardPage.keyboard.type('Keyboard-only church');
  await tabTo('[data-orientation="next"]');
  await keyboardPage.keyboard.press('Enter');
  await tabTo('[data-orientation="finish"]');
  await keyboardPage.keyboard.press('Enter');
  await keyboardPage.locator('.focus-panel').waitFor();
  assert.match(await keyboardPage.locator('.project-name').textContent(), /Keyboard-only church/);
  await keyboardContext.close();
  const recoveryContext = await browser.newContext();
  await recoveryContext.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    }),
  );
  const recovery = await recoveryContext.newPage();
  await recovery.goto(`${url}/#new/planned`);
  await recovery.getByRole('button', { name: 'Continue' }).click();
  await recovery.locator('#field-churchName').fill('Recoverable temporary project');
  await recovery.getByRole('button', { name: 'Continue' }).click();
  await recovery.getByRole('button', { name: 'Create our project' }).click();
  await recovery.locator('.focus-panel').waitFor();
  assert.match(await recovery.locator('#feedback').textContent(), /storage is unavailable/);
  const recoveryDownload = recovery.waitForEvent('download');
  await recovery.locator('.sidebar [data-export]').click();
  assert.match(
    await readFile(await (await recoveryDownload).path(), 'utf8'),
    /Recoverable temporary project/,
  );
  await recoveryContext.close();
  const legacyContext = await browser.newContext();
  const legacy = { ...backupData.project, id: 'legacy-browser', schemaVersion: 1, revision: 3 };
  for (const key of ['customQuestions', 'artifactOptions', 'artifactReviews', 'presetSuggestions'])
    delete legacy[key];
  await legacyContext.addInitScript(
    (project) =>
      localStorage.setItem('pastoral-search-toolkit:v1:' + project.id, JSON.stringify(project)),
    legacy,
  );
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto(`${url}/#project/legacy-browser/module/profile`);
  await legacyPage.locator('#field-churchName').waitFor();
  assert.equal(
    await legacyPage.locator('#field-churchName').inputValue(),
    'Example Baptist Church',
  );
  await legacyPage.goto(`${url}/#projects`);
  await legacyPage.locator('#import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await legacyPage.waitForFunction(() =>
    document.querySelector('#feedback')?.textContent.includes('not a valid JSON'),
  );
  assert.match(await legacyPage.locator('#feedback').textContent(), /not a valid JSON/);
  assert.equal(await legacyPage.locator('.project-row').count(), 1);
  await legacyContext.close();
  console.log(
    'PASS keyboard-only setup, unavailable storage backup recovery, legacy migration, and invalid import',
  );
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  assert.deepEqual(network, [], 'No external runtime requests');
  console.log(
    'Browser smoke tests and automated accessibility checks passed. Screenshots and print sample: test-results/',
  );
} finally {
  await browser?.close();
  server?.kill();
}
