/**
 * Tells open screens that entries changed outside their own flow, e.g. from the
 * quick-add window or the voice sheet. Both run in the same JS runtime as the main
 * app, so a plain in-memory event is enough.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyEntriesChanged() {
  listeners.forEach(listener => listener());
}

export function subscribeToEntryChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
