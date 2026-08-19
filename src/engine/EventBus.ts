import type { EngineEventMap, EngineEventName, EngineHandler } from './types';

type AnyHandler = (payload: never) => void | Promise<void>;

export class EventBus {
  private listeners = new Map<string, Set<AnyHandler>>();

  on<K extends EngineEventName>(event: K, handler: EngineHandler<K>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler as AnyHandler);
    this.listeners.set(event, set);
    return () => this.off(event, handler);
  }

  off<K extends EngineEventName>(event: K, handler: EngineHandler<K>): void {
    this.listeners.get(event)?.delete(handler as AnyHandler);
  }

  async emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): Promise<void> {
    const handlers = [...(this.listeners.get(event) ?? [])];
    for (const handler of handlers) {
      await handler(payload as never);
    }
  }

  listenerCount(event: EngineEventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
