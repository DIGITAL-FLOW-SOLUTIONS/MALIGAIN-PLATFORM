/**
 * In-process SSE broadcast for Earn-with-Fun assets.
 * When the admin creates / updates / deletes an asset, call broadcast()
 * and all connected user SSE streams will receive the update event.
 */

export type EarnFunSSEPayload = {
  action: "created" | "updated" | "deleted";
  category: string;
  assetId?: number;
};

type Subscriber = (payload: EarnFunSSEPayload) => void;

const subscribers = new Set<Subscriber>();

export const earnFunSSE = {
  subscribe(fn: Subscriber): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  broadcast(payload: EarnFunSSEPayload): void {
    for (const fn of subscribers) {
      try { fn(payload); } catch { /* subscriber closed */ }
    }
  },

  get connectionCount(): number {
    return subscribers.size;
  },
};
