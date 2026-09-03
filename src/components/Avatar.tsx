import { getInitials } from '@/utils/format';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  ring?: boolean;
  onClick?: () => void;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-28 h-28 text-3xl',
};

export default function Avatar({ src, name, size = 'md', ring = false, onClick }: AvatarProps) {
  const base = `${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold overflow-hidden shrink-0 transition-all duration-200`;
  const ringClass = ring ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-black' : '';
  const clickClass = onClick ? 'cursor-pointer hover:opacity-80' : '';

  return (
    <div className={`${base} ${ringClass} ${clickClass}`} onClick={onClick}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 w-full h-full flex items-center justify-center">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
