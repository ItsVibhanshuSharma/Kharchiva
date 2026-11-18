/**
 * Placeholder profile until real sign-in stores the user's details.
 * Login and profile setup are demo-only for now.
 */
export const profileData = {
  name: 'Vibhanshu Sharma',
  phone: '+91 98765 43210',
} as const;

/** Matches android versionName / package version shown to the user. */
export const APP_VERSION = '1.0';

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}
