export default function PageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: 'linear-gradient(115deg, var(--glow-1), transparent 48%, var(--glow-2))',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
        }}
      />
    </div>
  );
}
