// Keywords per aspect, picked from the most common words in the reviews.
// Multi-word phrases are fine; each entry must match as whole words.
const ASPECTS = {
  location: ['location', 'located', 'close to', 'near', 'walk', 'walking', 'metro', 'tube', 'station', 'central', 'transport'],
  staff: ['staff', 'reception', 'receptionist', 'service', 'concierge', 'manager', 'employees', 'helpful', 'friendly', 'rude'],
  cleanliness: ['clean', 'cleaned', 'cleaning', 'dirty', 'dust', 'dusty', 'stain', 'stains', 'smell', 'smelly', 'hygiene', 'spotless', 'mould', 'mold'],
  room: ['spacious', 'small room', 'tiny', 'cramped', 'room size', 'size of the room', 'room was small', 'rooms are small', 'shabby', 'dated', 'outdated', 'modern', 'decor', 'furniture', 'renovated'],
  bed: ['bed', 'beds', 'mattress', 'pillow', 'pillows', 'sleep'],
  bathroom: ['bathroom', 'shower', 'toilet', 'bath', 'towels', 'sink', 'water pressure', 'hot water'],
  breakfast: ['breakfast', 'buffet'],
  food: ['restaurant', 'food', 'dinner', 'meal', 'menu', 'bar', 'coffee'],
  noise: ['noise', 'noisy', 'quiet', 'loud', 'soundproof', 'thin walls', 'traffic'],
  wifi: ['wifi', 'wi fi', 'internet'],
  value: ['price', 'prices', 'expensive', 'value', 'money', 'overpriced', 'cheap', 'pricey', 'worth', 'cost'],
  facilities: ['facilities', 'pool', 'gym', 'spa', 'sauna', 'lift', 'lifts', 'elevator', 'elevators', 'parking'],
  temperature: ['air conditioning', 'aircon', 'air con', 'heating', 'too hot', 'too cold', 'temperature', 'radiator', 'stuffy'],
};

// \b = word boundary, so "bar" matches "the bar" but not "barely".
const PATTERNS = Object.entries(ASPECTS).map(([aspect, words]) => ({
  aspect,
    regex: new RegExp(`\\b(${words.join('|')})s?\\b`, 'i'),
}));

// Negative texts that only say "there was nothing bad", e.g. "Nothing the staff were lovely".
const NON_ANSWER = /^(nothing|none|n a|no complaints|all good)\b/i;

const SNIPPET_WORDS = 6;

// The keyword plus up to 6 words either side, kept as evidence of the mention.
function snippet(text, start, end) {
  const before = text.slice(0, start).split(' ').filter(Boolean).slice(-SNIPPET_WORDS);
  const after = text.slice(end).split(' ').filter(Boolean).slice(0, SNIPPET_WORDS);
  return [...before, text.slice(start, end), ...after].join(' ');
}

// Every aspect found in one text, at most once each.
function findAspects(text, polarity) {
  if (!text) return [];
  const clean = text.replace(/\s+/g, ' ').trim();

  const mentions = [];
  for (const { aspect, regex } of PATTERNS) {
    const match = clean.match(regex);
    if (match) {
      const sentence = snippet(clean, match.index, match.index + match[0].length);
      mentions.push({ aspect, polarity, sentence });
    }
  }
  return mentions;
}

// All mentions for one review: positive text counts as +1, negative text as -1.
function extractMentions(review) {
  const negative = NON_ANSWER.test(review.negative_text?.trim() ?? '') ? null : review.negative_text;
  return [...findAspects(review.positive_text, 1), ...findAspects(negative, -1)];
}

// Signs that the guest mixed good and bad in one box, where "+1 for the positive box" may be wrong.
const CONTRAST = /\b(but|however|except|although|though|unfortunately)\b/i;
const PRAISE = /\b(great|lovely|excellent|amazing|perfect|fantastic|wonderful)\b/i;

// Why the rules may have got this review wrong, or null if they can be trusted.
function flagReason(review, mentions) {
  const negative = review.negative_text?.trim() ?? '';
  if (mentions.length === 0) return 'no_aspects';
  if (CONTRAST.test(review.positive_text ?? '')) return 'mixed_positive';
  if (NON_ANSWER.test(negative)) return negative.split(/\s+/).length > 4 ? 'skipped_nonanswer' : null;
  if (PRAISE.test(negative)) return 'praise_in_negative';
  return null;
}

module.exports = { ASPECTS, extractMentions, findAspects, flagReason };

