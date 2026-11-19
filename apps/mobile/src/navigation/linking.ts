import { createRef, useEffect } from 'react';
import { Linking } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { parseInviteLink } from '../features/groups/inviteLink';
import type { RootStackParamList } from './types';

export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>();

let pendingCode: string | null = null;

function openInvite(code: string) {
  if (navigationRef.current?.isReady()) navigationRef.current.navigate('JoinGroup', { code });
  else pendingCode = code;
}

/** Called by the navigator once it can accept navigation, to open a link that arrived during start-up. */
export function onNavigationReady() {
  if (pendingCode) {
    const code = pendingCode;
    pendingCode = null;
    navigationRef.current?.navigate('JoinGroup', { code });
  }
}

/**
 * Opens the join screen when the app is started or resumed from an invite link:
 * https://<invite host>/join/<code> (Android App Links, later iOS Universal Links)
 * or kharchiva://join/<code> (what the landing page falls back to).
 */
export function useInviteLinks() {
  useEffect(() => {
    let active = true;
    Linking.getInitialURL()
      .then(url => {
        const code = url ? parseInviteLink(url) : null;
        if (active && code) openInvite(code);
      })
      .catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const code = parseInviteLink(url);
      if (code) openInvite(code);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
