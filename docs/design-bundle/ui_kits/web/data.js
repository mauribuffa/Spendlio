// Spendlio web — dashboard mock data
window.SPENDLIO_WEB = (function () {
  const months = [
    { m: 'Dec', spend: 2180, income: 3200 },
    { m: 'Jan', spend: 2620, income: 3200 },
    { m: 'Feb', spend: 2310, income: 3200 },
    { m: 'Mar', spend: 2890, income: 3400 },
    { m: 'Apr', spend: 2810, income: 3200 },
    { m: 'May', spend: 2480, income: 3200 },
  ];

  const categories = [
    { key: 'housing',    label: 'Housing',    value: 980, color: '#C24A3E' },
    { key: 'groceries',  label: 'Groceries',  value: 310, color: '#1B6E4F' },
    { key: 'dining',     label: 'Dining',     value: 420, color: '#BE8A30' },
    { key: 'transport',  label: 'Transport',  value: 96,  color: '#3A6BAB' },
    { key: 'shopping',   label: 'Shopping',   value: 560, color: '#7C5CBF' },
    { key: 'subscriptions', label: 'Subscriptions', value: 114, color: '#D2864B' },
  ];

  const budgets = [
    { category: 'dining',    label: 'Dining',    spent: 420, limit: 500 },
    { category: 'groceries', label: 'Groceries', spent: 310, limit: 400 },
    { category: 'transport', label: 'Transport', spent: 96,  limit: 200 },
    { category: 'shopping',  label: 'Shopping',  spent: 560, limit: 500 },
    { category: 'subscriptions', label: 'Subscriptions', spent: 114, limit: 120 },
  ];

  const txns = [
    { id: 1, title: 'Whole Foods Market', category: 'groceries', account: 'Card ••4821', date: 'May 31', split: 'Maya', amount: -58.20, status: 'split' },
    { id: 2, title: 'Salary — Acme Inc', category: 'income', account: 'Checking ••2210', date: 'May 31', amount: 3200.00, income: true, status: 'income' },
    { id: 3, title: 'Lisbon Airbnb', category: 'travel', account: 'Card ••4821', date: 'May 30', split: 'Trip to Lisbon', amount: -142.50, status: 'split' },
    { id: 4, title: 'Lyft', category: 'transport', account: 'Card ••4821', date: 'May 30', amount: -18.30, status: 'cleared' },
    { id: 5, title: 'Netflix', category: 'subscriptions', account: 'Card ••4821', date: 'May 27', amount: -15.49, status: 'recurring' },
    { id: 6, title: 'Trader Joe\u2019s', category: 'groceries', account: 'Card ••4821', date: 'May 27', amount: -41.08, status: 'cleared' },
    { id: 7, title: 'Pharmacy', category: 'health', account: 'Card ••2210', date: 'May 26', amount: -24.99, status: 'cleared' },
    { id: 8, title: 'Olio (dinner)', category: 'dining', account: 'Card ••4821', date: 'May 25', split: 'Sam', amount: -49.00, status: 'split' },
  ];

  const people = [
    { name: 'Maya Okafor', group: 'Roommates', dir: 'owes_you', amount: 42.00, color: '#BE8A30' },
    { name: 'Sam Reed', group: 'Dinner · Olio', dir: 'you_owe', amount: 24.50, color: '#3A6BAB' },
    { name: 'Lee Park', group: 'Trip to Lisbon', dir: 'owes_you', amount: 44.00, color: '#7C5CBF' },
    { name: 'Ari Cohen', group: 'Roommates', dir: 'settled', amount: 0, color: '#2E9D9A' },
  ];

  // Multi-currency accounts (the "bank tabs"); balances in each account's own currency.
  const accounts = [
    { id: 'a1', name: 'Everyday card', type: 'card',     mask: '4821', currency: 'USD', balance: 2480.50 },
    { id: 'a2', name: 'Savings',       type: 'savings',  mask: null,   currency: 'USD', balance: 5200.00 },
    { id: 'a3', name: 'Pesos wallet',  type: 'cash',     mask: null,   currency: 'ARS', balance: 385000.00 },
    { id: 'a4', name: 'Mercado Pago',  type: 'checking', mask: null,   currency: 'ARS', balance: 120500.00 },
  ];
  const fx = { base: 'USD', asOf: 'May 31, 2026', rates: { USD: 1, ARS: 0.00100 } };

  const recap = {
    month: 'May', spent: 2480, income: 3200, netSaved: 720, vsPrev: -12, settled: 2,
    top: [
      { category: 'housing', label: 'Housing', value: 980 },
      { category: 'shopping', label: 'Shopping', value: 560 },
      { category: 'dining', label: 'Dining', value: 420 },
      { category: 'groceries', label: 'Groceries', value: 310 },
    ],
    highlight: 'You spent $182 eating out — your calmest month since February. Keep it up.',
  };

  const suggestions = [
    'How much did I spend on dining in May?',
    'What\u2019s my biggest category this month?',
    'Am I over budget anywhere?',
  ];

  return { months, categories, budgets, txns, people, accounts, fx, recap, suggestions };
})();
