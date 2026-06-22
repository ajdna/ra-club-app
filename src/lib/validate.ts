/** Shared, framework-free validators used on both client and server. */

/** Basic but solid email shape check. */
export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** E.164 phone: "+" then 8–15 digits, first digit non-zero. e.g. +919812345678 */
export function isE164(v: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(v.trim());
}
