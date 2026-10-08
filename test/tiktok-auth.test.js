const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'public/tiktok-auth/callback.js'), 'utf8');

function runCallback(search) {
  const elements = Object.fromEntries(
    ['status', 'result', 'authorization-code', 'copy-code', 'copy-status']
      .map((id) => [id, { textContent: '', hidden: id === 'result', addEventListener() {} }])
  );
  const replacements = [];
  vm.runInNewContext(script, {
    URLSearchParams,
    window: {
      location: { search, pathname: '/tiktok-auth/' },
      history: { replaceState: (...args) => replacements.push(args) },
    },
    document: { getElementById: (id) => elements[id] },
    navigator: { clipboard: { writeText: async () => {} } },
  });
  return { elements, replacements };
}

test('captures the one-time code and immediately removes query parameters', () => {
  const { elements, replacements } = runCallback('?code=single-use-secret&state=pilot');
  assert.equal(replacements.length, 1);
  assert.equal(replacements[0][2], '/tiktok-auth/');
  assert.equal(elements['authorization-code'].textContent, 'single-use-secret');
  assert.equal(elements.result.hidden, false);
});

test('does not show a code on a failed authorization', () => {
  const { elements, replacements } = runCallback('?error=access_denied');
  assert.equal(replacements[0][2], '/tiktok-auth/');
  assert.equal(elements.result.hidden, true);
  assert.equal(elements['authorization-code'].textContent, '');
});

test('hosting prevents referrer and external resource leakage', () => {
  const headers = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'))
    .hosting.headers.find((entry) => entry.source === '/tiktok-auth/**').headers;
  const values = Object.fromEntries(headers.map((header) => [header.key, header.value]));
  assert.equal(values['Referrer-Policy'], 'no-referrer');
  assert.match(values['Content-Security-Policy'], /default-src 'none'/);
  assert.match(values['Content-Security-Policy'], /script-src 'self'/);
});
