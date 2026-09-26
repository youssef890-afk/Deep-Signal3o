export default function PageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute -top-[30%] -left-[20%] w-[700px] h-[700px] rounded-full blur-[160px]" style={{ background: 'var(--glow-1)' }} />
      <div className="absolute top-[20%] right-[-15%] w-[600px] h-[600px] rounded-full blur-[160px]" style={{ background: 'var(--glow-2)' }} />
      <div className="absolute bottom-[-25%] left-[10%] w-[650px] h-[650px] rounded-full blur-[160px]" style={{ background: 'var(--glow-3)' }} />
    </div>
  );
}
