const test = require('node:test');
const assert = require('node:assert/strict');
const { extractMentions, findAspects, flagReason } = require('../src/aspects');


const aspectsOf = (mentions) => mentions.map((m) => m.aspect).sort();

test('findAspects finds several aspects in one text', () => {
  const mentions = findAspects('Great location and the staff were so helpful', 1);
  assert.deepEqual(aspectsOf(mentions), ['location', 'staff']);
});

test('findAspects gives each mention the polarity it was called with', () => {
  for (const m of findAspects('The breakfast was too expensive', -1)) {
    assert.equal(m.polarity, -1);
  }
});

test('findAspects ignores case', () => {
  assert.deepEqual(aspectsOf(findAspects('BREAKFAST', 1)), ['breakfast']);
});

test('findAspects matches whole words only', () => {
  assert.deepEqual(findAspects('barely had time to unpack', 1), []);
  assert.deepEqual(aspectsOf(findAspects('drinks at the bar', 1)), ['food']);
});

test('findAspects matches multi-word phrases', () => {
  assert.deepEqual(aspectsOf(findAspects('the wi fi kept dropping', -1)), ['wifi']);
  assert.deepEqual(aspectsOf(findAspects('no air conditioning in july', -1)), ['temperature']);
});

test('findAspects returns one mention per aspect even if repeated', () => {
  const mentions = findAspects('staff at reception and staff at the bar', 1);
  assert.equal(mentions.filter((m) => m.aspect === 'staff').length, 1);
});

test('findAspects returns nothing for empty or unmatched text', () => {
  assert.deepEqual(findAspects(null, 1), []);
  assert.deepEqual(findAspects('', 1), []);
  assert.deepEqual(findAspects('Everything', 1), []);
});

test('findAspects keeps up to 6 words either side as the sentence', () => {
  const text = 'one two three four five six seven breakfast eight nine ten eleven twelve thirteen fourteen';
  const [mention] = findAspects(text, 1);
  assert.equal(mention.sentence, 'two three four five six seven breakfast eight nine ten eleven twelve thirteen');
});

test('findAspects collapses extra spaces in the sentence', () => {
  const [mention] = findAspects('  the   shower  was cold ', -1);
  assert.equal(mention.sentence, 'the shower was cold');
});

test('extractMentions marks positive text +1 and negative text -1', () => {
  const mentions = extractMentions({
    positive_text: 'Lovely staff',
    negative_text: 'Room was small and noisy',
  });
  assert.deepEqual(
    mentions.map((m) => [m.aspect, m.polarity]),
    [['staff', 1], ['room', -1], ['noise', -1]]
  );
});

test('extractMentions skips negative texts that are non-answers', () => {
  const mentions = extractMentions({
    positive_text: null,
    negative_text: 'Nothing the staff were lovely',
  });
  assert.deepEqual(mentions, []);
});

test('extractMentions still reads negatives that only start with similar words', () => {
  const mentions = extractMentions({ positive_text: null, negative_text: 'Noisy street at night' });
  assert.deepEqual(aspectsOf(mentions), ['noise']);
});

test('extractMentions handles a review with no matches', () => {
  assert.deepEqual(extractMentions({ positive_text: 'Everything', negative_text: null }), []);
});


test('flagReason flags reviews where the rules found nothing', () => {
  const review = { positive_text: 'Looks lovely', negative_text: null };
  assert.equal(flagReason(review, extractMentions(review)), 'no_aspects');
});

test('flagReason flags contrast words in the positive text', () => {
  const review = { positive_text: 'The bed was comfy but there was no air con', negative_text: null };
  assert.equal(flagReason(review, extractMentions(review)), 'mixed_positive');
});

test('flagReason flags long non-answers that were skipped', () => {
  const review = { positive_text: 'Great location', negative_text: 'Nothing the staff were lovely' };
  assert.equal(flagReason(review, extractMentions(review)), 'skipped_nonanswer');
});

test('flagReason trusts short non-answers', () => {
  const review = { positive_text: 'Great location', negative_text: 'Nothing' };
  assert.equal(flagReason(review, extractMentions(review)), null);
});

test('flagReason flags praise words in the negative text', () => {
  const review = { positive_text: 'Lovely staff', negative_text: 'The pool was closed but looked great' };
  assert.equal(flagReason(review, extractMentions(review)), 'praise_in_negative');
});

test('flagReason trusts a plain review', () => {
  const review = { positive_text: 'Friendly staff', negative_text: 'Small room' };
  assert.equal(flagReason(review, extractMentions(review)), null);
});
