/**
 * Validate nickname (2-12 characters, no special chars)
 */
export function isValidNickname(nickname: string): boolean {
  return nickname.length >= 2 && nickname.length <= 12 && /^[가-힣a-zA-Z0-9_]+$/.test(nickname);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
