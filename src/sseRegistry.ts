import { EventEmitter } from 'events';

class SseRegistry extends EventEmitter {}

declare global {
  var sseRegistry: SseRegistry | undefined;
}

if (!globalThis.sseRegistry) {
  globalThis.sseRegistry = new SseRegistry();
}

const sseRegistryInstance = globalThis.sseRegistry;
export default sseRegistryInstance;
