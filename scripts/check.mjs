import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
for (const file of await readdir('dist', { recursive: true }))
  if (file.endsWith('.js')) {
    const r = spawnSync(process.execPath, ['--check', `dist/${file}`], { stdio: 'inherit' });
    assert.equal(r.status, 0, `${file} syntax`);
  }
const html = await readFile('dist/index.html', 'utf8');
for (const [, path] of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) await access('dist/' + path);
assert(html.includes('Content-Security-Policy'));
for (const file of [
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/domain-model.md',
  'docs/architecture.md',
  'docs/source-content-audit.md',
  'docs/content-model.md',
  'docs/theology-and-scope.md',
  'docs/privacy.md',
  'docs/artifact-generation.md',
  'docs/deployment.md',
  'docs/roadmap.md',
  'docs/collaboration-architecture.md',
  'docs/roadmap-collaboration.md',
  'docs/collaboration-battle-test.md',
  'CODE_OF_CONDUCT.md',
  'CHANGELOG.md',
  'examples/fellowship-baptist.example.json',
])
  await access(file);
console.log(
  'JavaScript syntax, entrypoint assets, security policy, and repository documents verified.',
);
