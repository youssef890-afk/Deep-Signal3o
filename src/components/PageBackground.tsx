export default function PageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#2d0f26] to-[#3d1a0f]" />
      <div className="absolute -top-[30%] -left-[20%] w-[600px] h-[600px] rounded-full bg-purple-600/30 blur-[140px]" />
      <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full bg-pink-500/25 blur-[140px]" />
      <div className="absolute bottom-[-25%] left-[20%] w-[550px] h-[550px] rounded-full bg-orange-500/20 blur-[140px]" />
    </div>
  );
}