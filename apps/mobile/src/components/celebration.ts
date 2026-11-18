/** Tiny pub/sub so any screen can trigger the save celebration shown at the app root. */
export type CelebrationEvent = {
  type: 'expense' | 'income';
  category: string;
  amountPaise: number;
  /** Other entries saved in the same go (voice entry can save several). */
  extraCount?: number;
};

type Listener = (event: CelebrationEvent) => void;

const listeners = new Set<Listener>();

export function celebrate(event: CelebrationEvent) {
  listeners.forEach(listener => listener(event));
}

export function subscribeToCelebrations(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
