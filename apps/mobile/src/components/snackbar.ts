/**
 * App-wide snackbar: a short message that slides up above the bottom bar.
 * Use it for the result of an action (saved, deleted, failed). Field validation
 * stays inline next to the field.
 */
export type SnackbarTone = 'success' | 'error' | 'info';

export type SnackbarOptions = {
  message: string;
  tone?: SnackbarTone;
  /** Optional button, e.g. "Kholo" to open a downloaded file. */
  action?: { label: string; onPress: () => void };
  /** Defaults to 3s, or 5s when there is an action to tap. */
  durationMs?: number;
};

type Listener = (options: SnackbarOptions) => void;

const listeners = new Set<Listener>();

export function showSnackbar(options: SnackbarOptions) {
  listeners.forEach(listener => listener(options));
}

export function subscribeToSnackbar(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
