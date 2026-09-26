export default function PageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#090D16]">
      <div className="absolute -top-[30%] -left-[20%] w-[700px] h-[700px] rounded-full bg-purple-600/25 blur-[160px]" />
      <div className="absolute top-[20%] right-[-15%] w-[600px] h-[600px] rounded-full bg-cyan-500/20 blur-[160px]" />
      <div className="absolute bottom-[-25%] left-[10%] w-[650px] h-[650px] rounded-full bg-rose-500/15 blur-[160px]" />
    </div>
  );
}
