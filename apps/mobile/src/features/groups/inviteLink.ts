import Share from 'react-native-share';

/**
 * Temporary host for invite links (a static page that opens the app, or sends people to the Play Store).
 * Replace with the real domain once it exists. Android App Links and iOS Universal Links both
 * need this exact host to serve their verification files.
 */
export const INVITE_HOST = 'kharchiva-invite.netlify.app';
export const ANDROID_PACKAGE = 'com.kharchivamobile';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const INVITE_SCHEME = 'kharchiva';

export function buildInviteLink(code: string): string {
  return `https://${INVITE_HOST}/join/${encodeURIComponent(code)}`;
}

/** Code from our own invite link (https on the invite host, or kharchiva://). Null for any other URL. */
export function parseInviteLink(url: string): string | null {
  const text = url.trim();
  const own = new RegExp(`^(?:https://${INVITE_HOST.replace(/\./g, '\\.')}|${INVITE_SCHEME}://)/?join/([A-Za-z0-9_-]{6,64})/?(?:[?#].*)?$`);
  return text.match(own)?.[1] ?? null;
}

/** Pulls the invite code out of a pasted link (any host, so older links still work) or a bare code. */
export function parseInviteCode(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const fromLink = text.match(/^(?:https?:\/\/[^/]+|kharchiva:\/\/)\/?join\/([A-Za-z0-9_-]{6,64})\/?(?:[?#].*)?$/);
  if (fromLink) return fromLink[1];
  return /^[A-Za-z0-9_-]{6,64}$/.test(text) ? text : null;
}

export function inviteMessage(groupTitle: string, code: string): string {
  return `Join "${groupTitle}" on Kharchiva and split expenses together.\n${buildInviteLink(code)}\n\nInvite code: ${code}`;
}

/** Opens the share sheet (WhatsApp, SMS, anything installed). */
export async function shareInvite(groupTitle: string, code: string): Promise<void> {
  await Share.open({
    title: `Join ${groupTitle}`,
    message: inviteMessage(groupTitle, code),
    failOnCancel: false,
  });
}
