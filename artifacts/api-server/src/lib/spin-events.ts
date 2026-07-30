import { EventEmitter } from "events";

/**
 * In-process event bus for real-time spin balance updates.
 * When a spin or deposit is processed, emit `wallet:{userId}` to push
 * an SSE update to any connected client.
 */
export const spinEventBus = new EventEmitter();
spinEventBus.setMaxListeners(500);
