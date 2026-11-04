const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanRow,
  cleanText,
  contentHash,
  parseCity,
  parseDate,
  parseNumber,
  parseTags,
} = require('../src/lib/clean');

function rawRow(overrides = {}) {
  return {
    Hotel_Address: ' s Gravesandestraat 55 Oost 1092 AA Amsterdam Netherlands',
    Hotel_Name: 'Hotel Arena',
    Review_Date: '8/3/2017',
    Positive_Review: ' Great location ',
    Negative_Review: ' Small room ',
    Reviewer_Score: '7.5',
    Tags: "[' Leisure trip ', ' Couple ', ' Double Room ', ' Stayed 2 nights ']",
    lat: '52.3605759',
    lng: '4.9159683',
    ...overrides,
  };
}

test('parseDate zero-pads single-digit month and day', () => {
  assert.equal(parseDate('8/3/2017'), '2017-08-03');
});

test('parseDate keeps two-digit month and day', () => {
  assert.equal(parseDate('12/31/2015'), '2015-12-31');
});

test('parseDate reads month first, not day first', () => {
  assert.equal(parseDate('7/31/2017'), '2017-07-31');
});

test('parseDate accepts a leap day only in a leap year', () => {
  assert.equal(parseDate('2/29/2016'), '2016-02-29');
  assert.equal(parseDate('2/29/2017'), null);
});

test('parseDate rejects invalid input', () => {
  for (const value of ['', 'NA', '13/1/2017', '0/1/2017', '2/30/2017', '4/0/2017', '2017-08-03', '8/3/17', undefined]) {
    assert.equal(parseDate(value), null, `expected null for ${value}`);
  }
});

test('cleanRow returns bad_date for an invalid date', () => {
  assert.deepEqual(cleanRow(rawRow({ Review_Date: '31/7/2017' })), { error: 'bad_date' });
});

test('cleanText treats placeholders and blanks as null', () => {
  assert.equal(cleanText(' No Negative '), null);
  assert.equal(cleanText(' No Positive'), null);
  assert.equal(cleanText('   '), null);
  assert.equal(cleanText(''), null);
});

test('cleanText trims real text and keeps the placeholder words inside a sentence', () => {
  assert.equal(cleanText(' No Negative comments at all '), 'No Negative comments at all');
});

test('cleanRow keeps a review with only a positive text', () => {
  const { review } = cleanRow(rawRow({ Negative_Review: ' No Negative' }));
  assert.equal(review.positive_text, 'Great location');
  assert.equal(review.negative_text, null);
});

test('cleanRow returns empty_review when both texts are empty', () => {
  const row = rawRow({ Positive_Review: 'No Positive', Negative_Review: ' No Negative ' });
  assert.deepEqual(cleanRow(row), { error: 'empty_review' });
});

test('cleanRow returns empty_review for a blank text beside a placeholder', () => {
  const row = rawRow({ Positive_Review: 'No Positive', Negative_Review: ' ' });
  assert.deepEqual(cleanRow(row), { error: 'empty_review' });
});

test('parseCity reads city and country from the end of the address', () => {
  assert.deepEqual(parseCity('Bergara 2 4 Eixample 08002 Barcelona Spain'), {
    city: 'Barcelona',
    country: 'Spain',
  });
});

test('parseCity handles a postcode between London and the country', () => {
  assert.deepEqual(parseCity('1 Inverness Terrace Westminster Borough London W2 3LB United Kingdom'), {
    city: 'London',
    country: 'United Kingdom',
  });
});

test('parseCity is not fooled by another city in the street name', () => {
  assert.deepEqual(parseCity('20 Rue d Amsterdam 9th arr 75009 Paris France'), {
    city: 'Paris',
    country: 'France',
  });
});

test('parseCity returns null for an unknown city', () => {
  assert.equal(parseCity('Unter den Linden 77 10117 Berlin Germany'), null);
  assert.equal(parseCity(''), null);
});

test('cleanRow returns no_city for an unknown city', () => {
  const row = rawRow({ Hotel_Address: 'Unter den Linden 77 10117 Berlin Germany' });
  assert.deepEqual(cleanRow(row), { error: 'no_city' });
});

test('parseTags reads trip and traveller types', () => {
  assert.deepEqual(parseTags("[' Leisure trip ', ' Couple ', ' Double Room ']"), {
    trip_type: 'leisure',
    traveller_type: 'couple',
  });
  assert.deepEqual(parseTags("[' Business trip ', ' Solo traveler ', ' Single Room ']"), {
    trip_type: 'business',
    traveller_type: 'solo',
  });
});

test('parseTags maps every traveller tag in the dataset', () => {
  const expected = {
    'Group': 'group',
    'Family with young children': 'family',
    'Family with older children': 'family',
    'Travelers with friends': 'friends',
  };
  for (const [tag, travellerType] of Object.entries(expected)) {
    assert.equal(parseTags(`[' ${tag} ']`).traveller_type, travellerType);
  }
});

test('parseTags finds tags behind a leading "With a pet"', () => {
  assert.deepEqual(parseTags("[' With a pet ', ' Leisure trip ', ' Couple ']"), {
    trip_type: 'leisure',
    traveller_type: 'couple',
  });
});

test('parseTags returns null when a type is absent', () => {
  assert.deepEqual(parseTags("[' Couple ', ' Double Room ']"), {
    trip_type: null,
    traveller_type: 'couple',
  });
  assert.deepEqual(parseTags('[]'), { trip_type: null, traveller_type: null });
  assert.deepEqual(parseTags(undefined), { trip_type: null, traveller_type: null });
});

test('parseTags does not read room names as traveller types', () => {
  assert.equal(parseTags("[' Family Room ', ' Stayed 1 night ']").traveller_type, null);
  assert.equal(parseTags("[' Cosy Family ', ' Group Room ']").traveller_type, null);
});

test('parseNumber returns null for missing or NA coordinates', () => {
  assert.equal(parseNumber('NA'), null);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber(undefined), null);
  assert.equal(parseNumber('-0.1425'), -0.1425);
});

test('cleanRow keeps a review with missing lat and lng', () => {
  const { hotel } = cleanRow(rawRow({ lat: 'NA', lng: 'NA' }));
  assert.equal(hotel.lat, null);
  assert.equal(hotel.lng, null);
});

test('cleanRow returns the full cleaned hotel and review', () => {
  const result = cleanRow(rawRow());
  assert.deepEqual(result.hotel, {
    name: 'Hotel Arena',
    address: 's Gravesandestraat 55 Oost 1092 AA Amsterdam Netherlands',
    city: 'Amsterdam',
    country: 'Netherlands',
    lat: 52.3605759,
    lng: 4.9159683,
  });
  assert.equal(result.review.review_date, '2017-08-03');
  assert.equal(result.review.reviewer_score, 7.5);
  assert.equal(result.review.positive_text, 'Great location');
  assert.equal(result.review.negative_text, 'Small room');
  assert.equal(result.review.trip_type, 'leisure');
  assert.equal(result.review.traveller_type, 'couple');
  assert.match(result.review.content_hash, /^[0-9a-f]{40}$/);
});

test('content_hash ignores whitespace around values and untracked columns', () => {
  const first = cleanRow(rawRow());
  const second = cleanRow(rawRow({ Hotel_Name: ' Hotel Arena ', Positive_Review: 'Great location', Reviewer_Score: '9' }));
  assert.equal(first.review.content_hash, second.review.content_hash);
});

test('content_hash changes with any hashed field', () => {
  const base = cleanRow(rawRow()).review.content_hash;
  assert.notEqual(cleanRow(rawRow({ Hotel_Name: 'Hotel Other' })).review.content_hash, base);
  assert.notEqual(cleanRow(rawRow({ Review_Date: '8/4/2017' })).review.content_hash, base);
  assert.notEqual(cleanRow(rawRow({ Positive_Review: 'Nice' })).review.content_hash, base);
  assert.notEqual(cleanRow(rawRow({ Negative_Review: 'Noisy' })).review.content_hash, base);
});

test('content_hash keeps field boundaries', () => {
  assert.notEqual(contentHash('h', 'd', 'ab', 'c'), contentHash('h', 'd', 'a', 'bc'));
  assert.notEqual(contentHash('h', 'd', 'x', null), contentHash('h', 'd', null, 'x'));
});
