import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Format date string to Korean relative time
 * e.g., "3시간 전", "어제", "3월 25일"
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  }
  if (isYesterday(date)) {
    return '어제';
  }
  return format(date, 'M월 d일', { locale: ko });
}

/**
 * Format number with Korean locale (e.g., 1,234)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * Format currency in Korean won
 */
export function formatWon(amount: number): string {
  return `₩${formatNumber(amount)}`;
}

/**
 * Format distance in meters/km
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format seconds into MM:SS
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format XP with + prefix
 */
export function formatXp(xp: number): string {
  return `+${formatNumber(xp)} XP`;
}
