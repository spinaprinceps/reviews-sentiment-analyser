const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMentions } = require('../src/llm');

test('validateMentions turns polarity words into +1 and -1', () => {
  const entries = [{
    review_id: 1,
    mentions: [
      { aspect: 'staff', polarity: 'positive', evidence: 'staff were lovely' },
      { aspect: 'temperature', polarity: 'negative', evidence: 'no air con' },
    ],
  }];
  assert.deepEqual(validateMentions(entries, [1]), [
    { review_id: 1, aspect: 'staff', polarity: 1, sentence: 'staff were lovely' },
    { review_id: 1, aspect: 'temperature', polarity: -1, sentence: 'no air con' },
  ]);
});

test('validateMentions drops aspects that are not in our list', () => {
  const entries = [{ review_id: 1, mentions: [{ aspect: 'vibe', polarity: 'positive', evidence: 'cool vibe' }] }];
  assert.deepEqual(validateMentions(entries, [1]), []);
});

test('validateMentions drops unknown polarity and missing evidence', () => {
  const entries = [{
    review_id: 1,
    mentions: [
      { aspect: 'staff', polarity: 'neutral', evidence: 'staff' },
      { aspect: 'staff', polarity: 'positive' },
    ],
  }];
  assert.deepEqual(validateMentions(entries, [1]), []);
});

test('validateMentions ignores review ids that were not in the batch', () => {
  const entries = [{ review_id: 99, mentions: [{ aspect: 'staff', polarity: 'positive', evidence: 'x' }] }];
  assert.deepEqual(validateMentions(entries, [1, 2]), []);
});

test('validateMentions keeps one mention per review, aspect and polarity', () => {
  const entries = [{
    review_id: 1,
    mentions: [
      { aspect: 'staff', polarity: 'positive', evidence: 'friendly staff' },
      { aspect: 'staff', polarity: 'positive', evidence: 'helpful reception' },
      { aspect: 'staff', polarity: 'negative', evidence: 'rude manager' },
    ],
  }];
  assert.equal(validateMentions(entries, [1]).length, 2);
});

test('validateMentions trims evidence', () => {
  const entries = [{ review_id: 1, mentions: [{ aspect: 'bed', polarity: 'positive', evidence: '  comfy bed  ' }] }];
  assert.equal(validateMentions(entries, [1])[0].sentence, 'comfy bed');
});

test('validateMentions handles a review with no mentions', () => {
  assert.deepEqual(validateMentions([{ review_id: 1, mentions: [] }], [1]), []);
});

test('validateMentions rejects output that is not a list', () => {
  assert.throws(() => validateMentions({ review_id: 1 }, [1]), /did not return a list/);
});
