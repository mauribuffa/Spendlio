/* Spendlio web — Assistant (AI chat over your data) */
(function () {
  const DS = window.SpendlioDesignSystem_5a5954;
  const { CategoryIcon, MoneyAmount, Avatar } = DS;
  const { WIcon } = window;
  const D = window.SPENDLIO_WEB;

  const ANSWERS = {
    dining: { text: "You spent $182 on dining in May — down 12% from April. Your biggest was Olio ($49).",
      breakdown: [['dining', 'Dining', 182], ['groceries', 'Groceries', 310]] },
    biggest: { text: "Housing is your biggest category this month at $980, then Shopping at $560.",
      breakdown: [['housing', 'Housing', 980], ['shopping', 'Shopping', 560]] },
    budget: { text: "You're over on Shopping — $560 of a $500 budget. Everything else is on track.",
      breakdown: [['shopping', 'Shopping', 560]] },
    default: { text: "You spent $2,480 this month against $3,200 of income — net positive by $720." },
  };
  const pick = (q) => {
    const s = q.toLowerCase();
    if (s.includes('dining')) return ANSWERS.dining;
    if (s.includes('biggest') || s.includes('category')) return ANSWERS.biggest;
    if (s.includes('budget') || s.includes('over')) return ANSWERS.budget;
    return ANSWERS.default;
  };

  function Breakdown({ rows }) {
    const max = Math.max(...rows.map((r) => r[2]));
    return (
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
        {rows.map(([cat, label, val]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CategoryIcon category={cat} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{label}</span>
                <MoneyAmount value={-val} weight={600} size={12.5} />
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-inset)' }}>
                <div style={{ height: '100%', width: (val / max) * 100 + '%', borderRadius: 999, background: 'var(--green-500)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function Bubble({ from, children }) {
    const ai = from === 'ai';
    return (
      <div style={{ display: 'flex', gap: 12, justifyContent: ai ? 'flex-start' : 'flex-end', marginBottom: 14 }}>
        {ai && <span style={{ width: 34, height: 34, borderRadius: 999, flex: 'none', background: 'var(--green-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><WIcon n="sparkles" s={17} /></span>}
        <div style={{ maxWidth: 560, padding: '13px 16px', borderRadius: 16,
          borderTopLeftRadius: ai ? 4 : 16, borderTopRightRadius: ai ? 16 : 4,
          background: ai ? 'var(--surface-card)' : 'var(--action-primary)', color: ai ? 'var(--text-body)' : '#fff',
          fontSize: 14.5, lineHeight: 1.5, border: ai ? '1px solid var(--border-subtle)' : 'none', boxShadow: ai ? 'var(--shadow-xs)' : 'none' }}>
          <div>{children}</div>
        </div>
        {!ai && <Avatar name="Alex Rivera" size="sm" />}
      </div>
    );
  }

  function Assistant() {
    const [msgs, setMsgs] = React.useState([{ from: 'ai', text: "Hi — ask me anything about your spending. For example, “how much did I spend on dining this month?”" }]);
    const [text, setText] = React.useState('');
    const scrollRef = React.useRef(null);
    React.useEffect(() => { window.lucide && lucide.createIcons(); const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; });

    function send(q) {
      const question = (q ?? text).trim();
      if (!question) return;
      const a = pick(question);
      setMsgs((m) => [...m, { from: 'me', text: question }, { from: 'ai', ...a }]);
      setText('');
    }

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 820, margin: '0 auto', width: '100%' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {msgs.map((m, i) => (
            <Bubble key={i} from={m.from}>
              <div>{m.text}</div>
              {m.breakdown && <Breakdown rows={m.breakdown} />}
            </Bubble>
          ))}
          {msgs.length <= 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 46, marginTop: 4 }}>
              {D.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ cursor: 'pointer', background: 'var(--surface-brand-sub)',
                  border: '1px solid var(--green-100)', color: 'var(--green-800)', borderRadius: 999, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <WIcon n="sparkles" s={14} /> {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 'none', padding: '14px 28px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 760, margin: '0 auto' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-sunken)', borderRadius: 999, padding: '0 8px 0 18px', height: 48 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about your money…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--text-strong)' }} />
            </div>
            <button onClick={() => send()} aria-label="Send" style={{ width: 48, height: 48, borderRadius: 999, flex: 'none', background: 'var(--action-primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WIcon n="arrow-up" s={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.WebAssistant = Assistant;
})();
