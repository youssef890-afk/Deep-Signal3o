export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'الآن';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} د`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} أ`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `منذ ${weeks} أسب`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  
  const years = Math.floor(days / 365);
  return `منذ ${years} سنة`;
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('ar-MA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(name: string): string {
  if (!name) return 'م';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
