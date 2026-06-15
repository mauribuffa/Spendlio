// Spendlio mobile — shared mock data (plain script, attaches to window)
window.SPENDLIO = (function () {
  const people = {
    you:  { name: 'You',          color: '#1B6E4F' },
    maya: { name: 'Maya Okafor',  color: '#BE8A30' },
    sam:  { name: 'Sam Reed',     color: '#3A6BAB' },
    lee:  { name: 'Lee Park',     color: '#7C5CBF' },
    ari:  { name: 'Ari Cohen',    color: '#2E9D9A' },
  };

  const activity = [
    { day: 'Today', items: [
      { id: 't1', title: 'Whole Foods', category: 'groceries', merchant: 'Card ••4821', sub: 'Split with Maya', amount: -58.20, meta: '2:14 PM' },
      { id: 't2', title: 'Blue Bottle Coffee', category: 'dining', merchant: 'Card ••4821', amount: -6.75, meta: '9:02 AM' },
    ]},
    { day: 'Yesterday', items: [
      { id: 't3', title: 'Lisbon Airbnb', category: 'travel', sub: 'Trip to Lisbon · your share', amount: -142.50, meta: '8:40 PM' },
      { id: 't4', title: 'Lyft', category: 'transport', merchant: 'Card ••4821', amount: -18.30, meta: '7:55 PM' },
      { id: 't5', title: 'Salary', category: 'income', merchant: 'Acme Inc', amount: 3200.00, meta: '12:00 PM', income: true },
    ]},
    { day: 'Mon, May 27', items: [
      { id: 't6', title: 'Trader Joe\u2019s', category: 'groceries', merchant: 'Card ••4821', amount: -41.08, meta: '6:30 PM' },
      { id: 't7', title: 'Netflix', category: 'subscriptions', sub: 'Recurring', amount: -15.49, meta: '3:00 PM' },
      { id: 't8', title: 'Pharmacy', category: 'health', merchant: 'Card ••2210', amount: -24.99, meta: '11:10 AM' },
    ]},
  ];

  const budgets = [
    { category: 'dining',    label: 'Dining',    spent: 420, limit: 500 },
    { category: 'groceries', label: 'Groceries', spent: 310, limit: 400 },
    { category: 'transport', label: 'Transport', spent: 96,  limit: 200 },
    { category: 'shopping',  label: 'Shopping',  spent: 560, limit: 500 },
  ];

  const balances = [
    { person: 'maya', direction: 'owes_you', amount: 42.00, group: 'Roommates' },
    { person: 'sam',  direction: 'you_owe',  amount: 24.50, group: 'Dinner · Olio' },
    { person: 'lee',  direction: 'owes_you', amount: 44.00, group: 'Trip to Lisbon' },
    { person: 'ari',  direction: 'settled',  amount: 0,     group: 'Roommates' },
  ];

  const groups = [
    { name: 'Roommates',      members: ['you','maya','ari'],        net: -42.00 },
    { name: 'Trip to Lisbon', members: ['you','maya','sam','lee'],  net: 86.00 },
    { name: 'Dinner · Olio',  members: ['you','sam'],               net: -24.50 },
  ];

  const chat = [
    { from: 'ai', text: "Hi \u2014 ask me anything about your spending. For example, \u201chow much did I spend on dining this month?\u201d" },
  ];

  const suggestions = [
    'How much did I spend on dining in May?',
    'What\u2019s my biggest category this month?',
    'Am I over budget anywhere?',
  ];

  // Multi-currency accounts (the "bank tabs"). Balances are in each account's own currency.
  const accounts = [
    { id: 'a1', name: 'Everyday card', type: 'card',     mask: '4821', currency: 'USD', balance: 2480.50 },
    { id: 'a2', name: 'Savings',       type: 'savings',  mask: null,   currency: 'USD', balance: 5200.00 },
    { id: 'a3', name: 'Pesos wallet',  type: 'cash',     mask: null,   currency: 'ARS', balance: 385000.00 },
    { id: 'a4', name: 'Mercado Pago',  type: 'checking', mask: null,   currency: 'ARS', balance: 120500.00 },
  ];

  // Base/display currency + reference rates (1 unit of currency = rate × base). Demo only.
  const fx = { base: 'USD', asOf: 'May 31, 2026', rates: { USD: 1, ARS: 0.00100 } };

  return { people, activity, budgets, balances, groups, chat, suggestions, accounts, fx };
})();
