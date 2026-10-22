import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePrice } from './format.ts';

test('parsePrice accepts dot or comma decimals', () => {
  assert.equal(parsePrice('9.99'), 9.99);
  assert.equal(parsePrice('9,99'), 9.99);
  assert.equal(parsePrice(' 12 '), 12);
  assert.equal(parsePrice('15.'), 15);
});

test('parsePrice rejects junk', () => {
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('abc'), null);
  assert.equal(parsePrice('1.234'), null);
  assert.equal(parsePrice('-3'), null);
});
