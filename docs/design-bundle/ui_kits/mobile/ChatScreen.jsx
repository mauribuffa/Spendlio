/* Spendlio mobile — AI financial assistant */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { IconButton, CategoryIcon, MoneyAmount } = DS;
  const { ScreenHeader, MIcon: I } = window;
  const D = window.SPENDLIO;

  const ANSWERS = {
    dining: { text: "You spent $182 on dining in May \u2014 down 12% from April. Your biggest was Olio ($49).",
      breakdown: [['dining', 'Dining', 182], ['groceries', 'Groceries', 310]] },
    biggest: { text: "Groceries is your biggest category this month at $310, just ahead of dining.",
      breakdown: [['groceries', 'Groceries', 310], ['dining', 'Dining', 182]] },
    budget: { text: "You're over on Shopping \u2014 $560 of a $500 budget. Everything else is on track.",
      breakdown: [['shopping', 'Shopping', 560]] },
    default: { text: "Here's what I found in your spending. Spent $2,480 this month against $3,200 of income \u2014 you're net positive by $720." },
  };

  function pick(q) {
    const s = q.toLowerCase();
    if (s.includes('dining')) return ANSWERS.dining;
    if (s.includes('biggest') || s.includes('category')) return ANSWERS.biggest;
    if (s.includes('budget') || s.includes('over')) return ANSWERS.budget;
    return ANSWERS.default;
  }

  function Bubble({ from, children }) {
    const ai = from === 'ai';
    return (
      <div style={{ display: 'flex', justifyContent: ai ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
        <div style={{ maxWidth: '82%', padding: '11px 14px', borderRadius: 18,
          borderBottomLeftRadius: ai ? 5 : 18, borderBottomRightRadius: ai ? 18 : 5,
          background: ai ? 'var(--surface-card)' : 'var(--action-primary)',
          color: ai ? 'var(--text-body)' : '#fff', fontSize: 14.5, lineHeight: 1.45,
          border: ai ? '1px solid var(--border-subtle)' : 'none',
          boxShadow: ai ? 'var(--shadow-xs)' : 'none' }}>
          {children}
        </div>
      </div>
    );
  }

  function Breakdown({ rows }) {
    const max = Math.max(...rows.map((r) => r[2]));
    return (
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([cat, label, val]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CategoryIcon category={cat} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{label}</span>
                <MoneyAmount value={-val} weight={600} size={12.5} />
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-inset)' }}>
                <div style={{ height: '100%', width: (val / max) * 100 + '%', borderRadius: 999,
                  background: 'var(--green-500)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function ChatScreen() {
    const [msgs, setMsgs] = React.useState([{ from: 'ai', ...ANSWERS.default, text:
      "Hi \u2014 ask me anything about your spending. For example, \u201chow much did I spend on dining this month?\u201d" }]);
    const [text, setText] = React.useState('');
    const scrollRef = React.useRef(null);

    React.useEffect(() => {
      window.lucide && lucide.createIcons();
      const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
    });

    function send(q) {
      const question = (q ?? text).trim();
      if (!question) return;
      const a = pick(question);
      setMsgs((m) => [...m, { from: 'me', text: question }, { from: 'ai', ...a }]);
      setText('');
    }

    return (
      <>
        <ScreenHeader
          eyebrow="Spendlio AI"
          title="Assistant"
          right={<IconButton variant="solid" size="md" label="History" icon={<I n="history" s={18} />} />}
        />
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 14px' }}>
          {msgs.map((m, i) => (
            <Bubble key={i} from={m.from}>
              <div>{m.text}</div>
              {m.breakdown && <Breakdown rows={m.breakdown} />}
            </Bubble>
          ))}
          {msgs.length <= 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {D.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ textAlign: 'left', cursor: 'pointer',
                  background: 'var(--surface-brand-sub)', border: '1px solid var(--green-100)',
                  color: 'var(--green-800)', borderRadius: 999, padding: '9px 14px', fontSize: 13.5,
                  fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I n="sparkles" s={15} /> {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 'none', padding: '10px 16px 12px', borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-sunken)',
            borderRadius: 999, padding: '0 6px 0 16px', height: 44 }}>
            <input value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about your money\u2026"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 15,
                fontFamily: 'var(--font-sans)', color: 'var(--text-strong)' }} />
          </div>
          <IconButton variant="brand" size="md" label="Send" onClick={() => send()} icon={<I n="arrow-up" s={20} />} />
        </div>
      </>
    );
  }

  window.ChatScreen = ChatScreen;
})();
