export function Field({ label, error, children, style }) {
  return (
    <div style={style}>
      {label && <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</label>}
      {children}
      {error && <div style={{ fontSize: 11, color: 'var(--color-text-danger)', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

export function Grid({ cols = 2, children, gap = 12 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap }}>
      {children}
    </div>
  );
}

export function Card({ title, desc, children }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      {title && <div style={{ fontSize: 15, fontWeight: 500, marginBottom: desc ? 4 : 14 }}>{title}</div>}
      {desc && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{desc}</div>}
      {children}
    </div>
  );
}

export function NumInput({ value, onChange, min = 0, style }) {
  return (
    <input type="number" min={min} value={value ?? ''} onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', fontSize: 12, padding: '3px 6px', border: 'none', background: 'transparent', ...style }} />
  );
}

export function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', fontSize: 12, padding: '3px 6px', border: 'none', background: 'transparent', ...style }} />
  );
}

export function Select({ value, onChange, options, style }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', fontSize: 12, padding: '3px 4px', border: 'none', background: 'transparent', ...style }}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

export function TableWrap({ children }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        {children}
      </table>
    </div>
  );
}

const thStyle = { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontWeight: 500, padding: '6px 8px', textAlign: 'left', border: '0.5px solid var(--color-border-tertiary)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '3px 6px', border: '0.5px solid var(--color-border-tertiary)' };

export function Th({ children, center }) {
  return <th style={{ ...thStyle, textAlign: center ? 'center' : 'left' }}>{children}</th>;
}
export function Td({ children, total }) {
  return <td style={{ ...tdStyle, ...(total ? { fontWeight: 500, color: '#185FA5', background: '#E6F1FB' } : {}) }}>{children}</td>;
}

export function AddRowBtn({ onClick, label = '+ Adicionar linha' }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, color: '#185FA5', background: 'none', border: '0.5px dashed #185FA5', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', marginTop: 4 }}>
      {label}
    </button>
  );
}

export function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '14px 0 8px' }}>{children}</div>;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={{ background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', border: '0.5px solid var(--color-border-danger)', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 12 }}>{message}</div>;
}
