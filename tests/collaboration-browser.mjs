import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { newProject, serializeBackup, setAnswer } from '../src/domain.js';
import { reviewPacket, newReviewWork, exportCompletedReview } from '../src/domain/collaboration.ts';

const port = Number(process.env.COLLAB_TEST_PORT || 4191),
  subpath = '/pastoral-search-toolkit/',
  url = `http://127.0.0.1:${port}${subpath}`;
const output = 'test-results/collaboration';
await mkdir(output, { recursive: true });
let browser, server;
const errors = [],
  network = [];
async function downloaded(page, action) {
  const promise = page.waitForEvent('download');
  await action();
  return readFile(await (await promise).path(), 'utf8');
}
const file = (name, text) => ({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
try {
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(port), BASE_PATH: subpath },
    stdio: 'pipe',
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    if (i === 49) throw new Error('Local test server did not start');
    await delay(100);
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}),
  });
  const chairContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const chair = await chairContext.newPage();
  const track = (page) => {
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('request', (req) => {
      if (!req.url().startsWith(url) && !req.url().startsWith('blob:')) network.push(req.url());
    });
  };
  track(chair);
  const axe = await readFile(
    new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  async function audit(page, label) {
    await page.evaluate(axe);
    const result = await page.evaluate(() =>
      axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
    );
    assert.deepEqual(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      [],
      `${label} accessibility`,
    );
  }
  const p = newProject('planned');
  setAnswer(p, 'churchName', 'Collaboration Test Church');
  setAnswer(p, 'doctrineText', 'The church’s adopted statement for this fictional test.');
  await chair.goto(url + '#projects');
  await chair.locator('#import-file').setInputFiles(file('project.json', serializeBackup(p)));
  await chair.locator('.focus-panel').waitFor();
  const projectBase = new URL(chair.url()).hash.replace('/dashboard', '');
  await chair.getByRole('link', { name: 'Committee work & candidates' }).click();
  for (let i = 1; i <= 7; i++) {
    await chair.getByText('Add a committee member', { exact: true }).click();
    const form = chair.locator('form[data-collab-form="member"][data-member=""]');
    await form.getByLabel('Display name', { exact: true }).fill(`Reviewer ${i}`);
    await form.getByLabel('Initials (optional)').fill(`R${i}`);
    if (i === 1) await form.getByLabel('Role', { exact: true }).selectOption('chair');
    await form.getByRole('button', { name: 'Add member', exact: true }).click();
    await chair
      .getByText(`Reviewer ${i} · ${i === 1 ? 'chair' : 'member'} · Active`, { exact: true })
      .waitFor();
  }
  await audit(chair, 'committee directory');
  await chair.getByText('Add a candidate', { exact: true }).click();
  const add = chair.locator('form[data-collab-form="candidate"]');
  await add.getByLabel('Candidate display name').fill('Fictional Candidate Smith');
  await add.getByRole('button', { name: 'Add candidate', exact: true }).click();
  await chair.getByRole('heading', { name: 'Fictional Candidate Smith', exact: true }).waitFor();
  const candidateRoute = new URL(chair.url()).hash;
  await chair.getByText('Add evidence reference', { exact: true }).first().click();
  const evidence = chair.locator('form[data-collab-form="evidence"][data-evidence=""]');
  await evidence.getByLabel('Evidence title').fill('Sunday sermon on Titus');
  await evidence.getByLabel('HTTP(S) link (optional)').fill('https://example.org/private-sermon');
  await evidence.getByRole('button', { name: 'Add evidence reference' }).click();
  await chair.getByText('Sunday sermon on Titus · sermon', { exact: true }).waitFor();
  await chair.getByText('Create a review round', { exact: true }).click();
  const roundForm = chair.locator('form[data-collab-form="round"]');
  await roundForm.getByLabel('Review round title').fill('First sermon review');
  await roundForm
    .getByLabel('Instructions for independent reviewers')
    .fill('Read the text and review independently before discussion.');
  await roundForm.getByLabel('Include the church-recorded adopted doctrinal statement').check();
  await roundForm.getByRole('button', { name: 'Create review round' }).click();
  await chair.getByRole('heading', { name: 'First sermon review', exact: true }).waitFor();
  const roundRoute = new URL(chair.url()).hash;
  await audit(chair, 'review round');
  const packetText = await downloaded(chair, () =>
    chair.getByRole('button', { name: 'Download Review Packet', exact: true }).click(),
  );
  const packet = JSON.parse(packetText);
  assert.equal(packet.recipient.name, 'Reviewer 1');
  assert(!packetText.includes('Reviewer 2'));
  assert(!packetText.includes('submissions'));
  const worksheet = await downloaded(chair, () =>
    chair.getByRole('button', { name: 'Download printable review worksheet' }).click(),
  );
  assert.match(worksheet, /Mark one: Not reviewed/);
  assert.match(worksheet, /Titus/);
  const reviewerContext = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    acceptDownloads: true,
  });
  const reviewer = await reviewerContext.newPage();
  track(reviewer);
  await reviewer.goto(url + '#reviews');
  await reviewer.locator('#review-packet-file').setInputFiles(file('assignment.json', packetText));
  await reviewer.getByRole('heading', { name: 'First sermon review', exact: true }).waitFor();
  await reviewerContext.setOffline(true);
  await reviewer
    .locator('[data-review-response="text"][data-review-part="finding"]')
    .selectOption('no_concern');
  await reviewer
    .locator('[data-review-response="text"][data-review-part="notes"]')
    .fill('The exposition follows the passage.');
  await reviewer
    .locator('[data-review-response="doctrine"][data-review-part="finding"]')
    .selectOption('material_concern');
  await reviewer
    .locator('[data-review-response="doctrine"][data-review-part="notes"]')
    .fill(
      'Please clarify a statement that appears to conflict with the church’s adopted doctrine.',
    );
  await reviewer
    .locator('[data-review-value="proposedQuestions"]')
    .fill('How do you understand this passage?');
  await reviewer
    .locator('[data-review-value="observations"]')
    .fill('Completed independently while offline.');
  await reviewer.waitForFunction(() =>
    document.querySelector('#review-save-state')?.textContent.startsWith('Saved on this device'),
  );
  await audit(reviewer, 'independent review offline');
  const firstReview = await downloaded(reviewer, () =>
    reviewer
      .getByRole('button', { name: 'Download Completed Review', exact: true })
      .first()
      .click(),
  );
  assert.equal(JSON.parse(firstReview).reviewer.name, 'Reviewer 1');
  assert(!firstReview.includes('Reviewer 2'));
  assert(!firstReview.includes('The church’s adopted statement'));
  await reviewerContext.setOffline(false);
  await reviewer.reload();
  assert.equal(
    await reviewer.locator('[data-review-value="observations"]').inputValue(),
    'Completed independently while offline.',
  );
  await reviewer.screenshot({ path: `${output}/independent-review.png`, fullPage: true });
  const projectJson = await downloaded(chair, async () => {
    await chair.locator('.sidebar [data-export]').click();
    await chair.locator('#confirm-action').getByText('Download private backup').click();
  });
  const shared = JSON.parse(projectJson).project;
  const r = shared.collaboration.rounds[0];
  const additional = shared.collaboration.members.slice(1).map((m) => {
    const w = newReviewWork(reviewPacket(shared, r.id, m.id));
    for (const response of Object.values(w.responses)) {
      response.finding = 'no_concern';
      response.notes = 'Independent specific observation.';
    }
    w.proposedQuestions = 'How do you understand this passage?';
    return exportCompletedReview(w);
  });
  await chair
    .locator('[data-review-import]')
    .setInputFiles([
      file('review-1.json', firstReview),
      ...additional.slice(0, 5).map((text, i) => file(`review-${i + 2}.json`, text)),
    ]);
  await chair
    .getByText(/6 of 7 expected reviews received/)
    .first()
    .waitFor();
  assert.equal(
    await chair.getByRole('heading', { name: 'Compiled committee review', exact: true }).count(),
    0,
  );
  await chair
    .locator('[data-review-import]')
    .setInputFiles([
      file('duplicate.json', firstReview),
      file(
        'wrong-project.json',
        JSON.stringify({ ...JSON.parse(firstReview), projectFingerprint: 'another-search' }),
      ),
    ]);
  await chair.getByText(/This exact review was already imported/).waitFor();
  await chair.getByText(/Different search project:/).waitFor();
  await chair.getByRole('button', { name: 'Close submissions', exact: true }).click();
  await chair.locator('#confirm-action').click();
  await chair.getByRole('button', { name: 'Release compilation for discussion' }).click();
  await chair.locator('#confirm-action').click();
  await chair.getByRole('heading', { name: 'Compiled committee review', exact: true }).waitFor();
  await chair
    .getByText('Material concern raised — committee review required', { exact: true })
    .waitFor();
  await chair.getByText(/Still expected: Reviewer 7/).waitFor();
  await audit(chair, 'released compilation');
  await chair.screenshot({ path: `${output}/compilation.png`, fullPage: true });
  await chair.getByRole('button', { name: 'Reopen submissions', exact: true }).click();
  await chair.locator('#confirm-action').click();
  await chair.goto(url + projectBase + '/module/doctrine');
  await chair
    .locator('[data-field="doctrineText"]')
    .fill('Revised adopted statement for this test.');
  await chair.goto(url + roundRoute);
  await chair.locator('[data-review-import]').setInputFiles(file('review-7.json', additional[5]));
  await chair.getByRole('button', { name: 'Import using original criteria', exact: true }).click();
  await chair.locator('#confirm-action').click();
  await chair
    .getByText(/7 of 7 expected reviews received/)
    .first()
    .waitFor();
  await chair.goto(url + candidateRoute);
  await chair.getByText('Record an actual committee decision', { exact: true }).click();
  const decision = chair.locator('[data-collab-form="decision"]');
  await decision.getByLabel('Gate or stage').fill('Gate 1');
  await decision
    .getByLabel('Decision and rationale')
    .fill('Pause until the doctrinal question is resolved with evidence.');
  await decision.getByLabel('Unresolved concerns').fill('Doctrinal wording needs clarification.');
  await decision
    .getByLabel('Assigned follow-up (optional)')
    .fill('Request doctrinal clarification');
  await decision.getByLabel('Follow-up owner').fill('Reviewer 2');
  await decision.getByLabel('Recorded by', { exact: true }).fill('Reviewer 1');
  await decision.getByLabel('I am recording the committee’s actual conclusion').check();
  await decision.getByRole('button', { name: 'Record committee decision', exact: true }).click();
  await chair
    .getByText('Pause until the doctrinal question is resolved with evidence.', { exact: true })
    .waitFor();
  await chair
    .getByRole('heading', { name: 'Request doctrinal clarification', exact: true })
    .waitFor();
  await audit(chair, 'candidate meeting and history');
  const backup = JSON.parse(
    await downloaded(chair, async () => {
      await chair.locator('.sidebar [data-export]').click();
      await chair.locator('#confirm-action').click();
    }),
  );
  assert.equal(backup.schemaVersion, 3);
  assert.equal(backup.project.collaboration.rounds[0].submissions.length, 7);
  assert.equal(backup.project.collaboration.decisions[0].type, 'PAUSE_FOR_EVIDENCE');
  assert.equal(backup.project.collaboration.candidates[0].status, 'PAUSED');
  assert.equal(backup.project.tasks[0].owner, 'Reviewer 2');
  await chair.goto(url + projectBase + '/committee-work');
  await chair.getByText('Review template content and export', { exact: true }).click();
  await chair.getByLabel('I checked this reusable wording').check();
  const template = await downloaded(chair, () =>
    chair.getByRole('button', { name: 'Download church template', exact: true }).click(),
  );
  assert(!template.includes('Fictional Candidate Smith'));
  assert(!template.includes('Reviewer 1'));
  assert(!template.includes('Request doctrinal clarification'));
  await chair.setViewportSize({ width: 390, height: 844 });
  await chair.goto(url + candidateRoute);
  await audit(chair, 'mobile candidate');
  assert.equal(
    await chair.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),
    false,
  );
  await chair.screenshot({ path: `${output}/mobile-meeting.png`, fullPage: true });
  await chair.goto(url + roundRoute);
  await audit(chair, 'mobile round');
  assert.equal(
    await chair.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),
    false,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  console.log(
    'PASS committee directory, candidate and evidence, snapshot round, packet export, independent offline review and local persistence, six-of-seven compilation, minority material concern, duplicate/mismatch warnings, stale criteria confirmation, seven submissions, actual decision/history, follow-up assignment, sensitive backup, sanitized template, accessibility and mobile subpath deployment.',
  );
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
