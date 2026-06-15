import type { CategoryKey } from '@spendlio/contracts';

/**
 * Rules-first categorization: a merchant/title keyword map that resolves the
 * common cases for free, so the LLM is only invoked for the long tail.
 *
 * Each entry maps a lowercase keyword (matched as a substring of the combined
 * merchant + title text) to a CategoryKey. Order is longest-keyword-first at
 * match time so e.g. "gas bill" beats a bare "gas" if both were present.
 */
const KEYWORD_CATEGORY: Record<string, CategoryKey> = {
  // dining
  coffee: 'dining',
  'blue bottle': 'dining',
  starbucks: 'dining',
  restaurant: 'dining',
  cafe: 'dining',
  mcdonald: 'dining',
  chipotle: 'dining',
  doordash: 'dining',
  'uber eats': 'dining',

  // transport
  uber: 'transport',
  lyft: 'transport',
  transit: 'transport',
  metro: 'transport',
  parking: 'transport',
  shell: 'transport',
  chevron: 'transport',

  // groceries
  'whole foods': 'groceries',
  grocer: 'groceries',
  aldi: 'groceries',
  safeway: 'groceries',
  'trader joe': 'groceries',
  kroger: 'groceries',
  costco: 'groceries',

  // housing
  rent: 'housing',
  mortgage: 'housing',
  landlord: 'housing',

  // utilities
  'electric bill': 'utilities',
  'water bill': 'utilities',
  'gas bill': 'utilities',
  utility: 'utilities',
  comcast: 'utilities',
  'internet bill': 'utilities',

  // shopping
  amazon: 'shopping',
  target: 'shopping',
  walmart: 'shopping',
  ikea: 'shopping',
  'best buy': 'shopping',

  // health
  pharmacy: 'health',
  clinic: 'health',
  hospital: 'health',
  cvs: 'health',
  walgreens: 'health',
  dentist: 'health',

  // subscriptions
  netflix: 'subscriptions',
  spotify: 'subscriptions',
  subscription: 'subscriptions',
  'youtube premium': 'subscriptions',
  icloud: 'subscriptions',
  patreon: 'subscriptions',

  // travel
  flight: 'travel',
  hotel: 'travel',
  airbnb: 'travel',
  airline: 'travel',
  expedia: 'travel',

  // entertainment
  cinema: 'entertainment',
  concert: 'entertainment',
  movie: 'entertainment',
  theater: 'entertainment',
  'steam games': 'entertainment',

  // income
  payroll: 'income',
  salary: 'income',
  deposit: 'income',
  paycheck: 'income',
  refund: 'income',
};

// Keywords sorted longest-first so the most specific match wins.
const SORTED_KEYWORDS = Object.keys(KEYWORD_CATEGORY).sort((a, b) => b.length - a.length);

/**
 * Deterministic, pure categorizer. Returns a CategoryKey when a keyword matches,
 * or `null` when unknown (the signal to escalate to the LLM).
 */
export function categorizeByRules(input: {
  title: string;
  merchant?: string;
}): CategoryKey | null {
  const haystack = `${input.merchant ?? ''} ${input.title}`.toLowerCase();
  for (const keyword of SORTED_KEYWORDS) {
    if (haystack.includes(keyword)) {
      return KEYWORD_CATEGORY[keyword]!;
    }
  }
  return null;
}
