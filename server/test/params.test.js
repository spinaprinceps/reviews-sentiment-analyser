const test = require('node:test');
const assert = require('node:assert');
const { text, id, isoDate } = require('../src/lib/params');

test('text trims and treats blanks and non-strings as missing', () => {
  assert.equal(text('  Paris '), 'Paris');
  assert.equal(text('   '), null);
  assert.equal(text(['a', 'b']), null);
});

test('id accepts positive whole numbers only', () => {
  assert.equal(id('42'), 42);
  assert.equal(id('0'), null);
  assert.equal(id('4.5'), null);
  assert.equal(id('abc'), null);
});

test('isoDate accepts real YYYY-MM-DD dates only', () => {
  assert.equal(isoDate('2026-12-01'), '2026-12-01');
  assert.equal(isoDate('2024-02-29'), '2024-02-29');
  assert.equal(isoDate('2026-02-30'), null);
  assert.equal(isoDate('01/12/2026'), null);
  assert.equal(isoDate(20261201), null);
});
