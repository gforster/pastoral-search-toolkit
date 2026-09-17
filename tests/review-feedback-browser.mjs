import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FIELDS, FIELD_MAP, MODULES, QUALIFICATIONS } from '../src/data.js';
import { newProject, serializeBackup } from '../src/domain.js';
import { moduleReviewIssues } from '../src/review-feedback.js';

export async function testReviewFeedback(browser, url, output) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const top = page.locator('[data-review-position="top"]');
  const bottom = page.locator('[data-review-position="bottom"]');
  const review = page.getByRole('button', { name: 'Mark module reviewed', exact: true });
  const focused = async (id) => {
    await page.waitForFunction((target) => document.activeElement?.id === target, id);
    const rect = await page.locator(`#${id}`).boundingBox();
    assert.ok(rect.y >= 0 && rect.y < 1000, `${id} scrolled into view`);
  };
  async function openProject(p) {
    await page.goto(url + '/#projects');
    await page.locator('#import-file').setInputFiles({
      name: 'review-feedback-test.json',
      mimeType: 'application/json',
      buffer: Buffer.from(serializeBackup(p)),
    });
    await page.locator('.focus-panel').waitFor();
    return new URL(page.url()).hash.replace('/dashboard', '');
  }
  try {
    const p = newProject();
    for (const f of FIELDS)
      p.answers[f.id] = {
        status: 'known',
        value:
          f.type === 'date'
            ? '2027-04-04'
            : f.accept?.at(-1) || f.options?.at(-1)[0] || `Verified ${f.id}`,
      };
    p.answers.interim.value = 'no';
    p.answers.associate.value = 'no';
    p.answers.internalCandidate.value = 'no';
    p.answers.callMethod.value = 'vote';
    for (const q of QUALIFICATIONS)
      p.qualifications[q.id] = {
        meaning: 'Recorded',
        evidence: 'Recorded',
        disqualifying: 'Recorded',
        questions: 'Recorded',
      };
    delete p.answers.currentAuthority;
    const base = await openProject(p);
    await page.goto(`${url}/${base}/module/transition`);
    assert.match(await top.textContent(), /1 required item needs attention/);
    assert.match(await bottom.textContent(), /Who is authorized to lead during this transition/);
    assert.ok(
      await page
        .locator('#item-currentAuthority')
        .evaluate((el) => el.classList.contains('required-missing')),
    );
    await review.click();
    await focused('field-currentAuthority');
    assert.equal(
      await page.locator('#field-currentAuthority').getAttribute('aria-invalid'),
      'true',
    );
    assert.match(
      await page.locator('#module-review-announcement').textContent(),
      /Module not marked reviewed/,
    );
    await page.screenshot({ path: `${output}/required-field-focus.png` });
    await bottom.locator('[data-review-target="field-currentAuthority"]').click();
    await focused('field-currentAuthority');
    // Keyboard links work and live validation never replaces the focused input.
    await top.locator('[data-review-target="field-currentAuthority"]').focus();
    await page.keyboard.press('Enter');
    await focused('field-currentAuthority');
    await page.locator('#field-currentAuthority').fill('Leadership body, constitution article 4.');
    await focused('field-currentAuthority');
    assert.equal(
      await page.locator('#field-currentAuthority').getAttribute('aria-invalid'),
      'false',
    );
    assert.match(await bottom.textContent(), /Required answers are complete/);
    await review.click();
    assert.match(await page.locator('.module-header .badge').textContent(), /Reviewed/);
    // A nonempty answer may still require action: explain the condition precisely.
    await page.locator('#field-servicesCovered').selectOption('no');
    assert.match(await bottom.textContent(), /Current answer: “No”/);
    await review.click();
    await focused('field-servicesCovered');
    assert.doesNotMatch(await page.locator('#feedback').textContent(), /Module reviewed/);
    assert.match(await page.locator('#review-message-servicesCovered').textContent(), /“Yes”/);
    await page.setViewportSize({ width: 390, height: 844 });
    await review.click();
    await focused('field-servicesCovered');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${output}/required-field-mobile.png` });
    await bottom.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/required-checklist-mobile.png` });
    await page.evaluate(
      await readFile(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8'),
    );
    const audit = await page.evaluate(() =>
      axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
    );
    assert.deepEqual(
      audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
      [],
      'required-item feedback accessibility',
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#field-servicesCovered').selectOption('yes');
    // Conditional requirements appear and disappear immediately with their source answer.
    await page.locator('#field-interim').selectOption('yes');
    await page.locator('#field-interimTerms').fill('');
    assert.match(await bottom.textContent(), /Interim authority, duties/);
    await page.locator('#field-interim').selectOption('no');
    assert.equal(await page.locator('#field-interimTerms').count(), 0);
    assert.doesNotMatch(await bottom.textContent(), /Interim authority, duties/);
    // An apparently approved qualification check points inside the collapsed worksheet.
    await page.goto(`${url}/${base}/module/qualifications`);
    await page.locator('[data-qualification-card="q7"] summary').click();
    await page.locator('#q7-evidence').fill('');
    assert.match(await page.locator('[data-qualification-count]').textContent(), /^25 recorded/);
    await page.locator('[data-qualification-card="q7"] summary').click();
    await page.locator('#field-qualificationAdoption').selectOption('approved');
    await review.click();
    await focused('q7-evidence');
    assert.ok(await page.locator('[data-qualification-card="q7"]').evaluate((el) => el.open));
    assert.match(
      await page.locator('[data-qualification-card="q7"] .qual-mark').textContent(),
      /1 required prompt open/,
    );
    await page.locator('#q7-evidence').fill('Evidence agreed by the committee.');
    assert.match(await page.locator('[data-qualification-count]').textContent(), /^26 recorded/);
    assert.match(
      await page.locator('[data-qualification-card="q7"] .qual-mark').textContent(),
      /Recorded/,
    );
    assert.equal(
      await bottom.locator('[data-review-target="field-qualificationAdoption"]').count(),
      1,
    );
    await page.locator('#field-qualificationAdoption').selectOption('approved');
    assert.match(await bottom.textContent(), /Required answers are complete/);
    // Cross-field requirements identify the prerequisite instead of the already-filled check.
    await page.goto(`${url}/${base}/module/compensation`);
    await page.locator('#field-compStatus').selectOption('provisional');
    await page.locator('#field-compFinal').selectOption('approved');
    await review.click();
    await focused('field-compStatus');
    assert.match(
      await page.locator('#review-message-compStatus').textContent(),
      /Approved \/ final/,
    );
    await page.waitForFunction(
      () => !document.querySelector('#save-indicator').textContent.includes('Saving'),
    );
    assert.equal(
      await page.locator('[data-status-for="compStatus"]').textContent(),
      'Required · needs attention',
    );
    await page.locator('#field-compStatus').selectOption('approved');
    await page.locator('#field-compFinal').selectOption('approved');
    assert.match(await bottom.textContent(), /Required answers are complete/);
    // Exercise the same navigation and explanation contract across all nineteen modules.
    const empty = newProject();
    for (const [id, value] of Object.entries({
      interim: 'yes',
      associate: 'yes',
      internalCandidate: 'yes',
      sermonReview: 'yes',
      pastoralModel: 'bivocational',
    }))
      empty.answers[id] = { status: 'known', value };
    const emptyBase = await openProject(empty);
    for (const m of MODULES) {
      await page.goto(`${url}/${emptyBase}/module/${m.id}`);
      await page.locator('.module-header').waitFor();
      const issues = moduleReviewIssues(empty, m.id);
      assert.equal(await top.locator('li').count(), issues.length, `${m.id} top checklist`);
      assert.equal(await bottom.locator('li').count(), issues.length, `${m.id} bottom checklist`);
      for (const issue of issues)
        assert.ok((await bottom.textContent()).includes(FIELD_MAP[issue.fieldId].label), m.id);
      if (issues.length) {
        await review.click();
        await focused(issues[0].targetId);
        assert.equal(
          await page.locator(`#${issues[0].targetId}`).getAttribute('aria-invalid'),
          'true',
          m.id,
        );
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      'PASS named required-item feedback across all 19 modules, bottom-to-field scroll/focus, keyboard links, live correction, conditional fields, collapsed qualification prompts, compensation dependency, mobile and accessibility.',
    );
  } finally {
    await context.close();
  }
}
