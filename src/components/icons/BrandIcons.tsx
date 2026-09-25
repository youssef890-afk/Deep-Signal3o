interface IconProps {
  className?: string;
  size?: number;
}

export function DSLogo({ className = '', size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="dsLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3D71" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="14" fill="url(#dsLogoGrad)" />
      <rect x="4" y="4" width="40" height="40" rx="14" fill="url(#dsLogoGrad)" opacity="0.3" filter="blur(8px)" />
      <path d="M16 30 Q20 22 24 26 Q28 30 32 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="32" cy="18" r="2.5" fill="white" />
    </svg>
  );
}

export function DSHome({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 11L12 3L21 11V20C21 20.55 20.55 21 20 21H15V15C15 14.45 14.55 14 14 14H10C9.45 14 9 14.45 9 15V21H4C3.45 21 3 20.55 3 20V11Z" 
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function DSSearch({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DSChat({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 12C21 16.97 17.19 21 12.5 21C11.29 21 10.14 20.77 9.09 20.35L3 21L4.5 15.72C3.55 14.71 3 13.41 3 12C3 7.03 6.81 3 11.5 3C16.19 3 21 7.03 21 12Z" 
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="8" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="16" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function DSRooms({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M5 11C5 14.87 8.13 18 12 18C15.87 18 19 14.87 19 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M12 18V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 21H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DSProfile({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M4 21C4 17.13 7.13 14 11 14H13C16.87 14 20 17.13 20 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
