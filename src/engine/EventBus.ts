import type { EngineEventMap, EngineEventName, EngineHandler, SubscribeOptions } from './types';

interface Entry {
  handler: (payload: never) => void | Promise<void>;
  priority: number;
}

export class EventBus {
  private listeners = new Map<string, Entry[]>();

  on<K extends EngineEventName>(
    event: K,
    handler: EngineHandler<K>,
    options: SubscribeOptions = {},
  ): () => void {
    const list = this.listeners.get(event) ?? [];
    list.push({ handler: handler as Entry['handler'], priority: options.priority ?? 0 });
    list.sort((a, b) => b.priority - a.priority);
    this.listeners.set(event, list);
    return () => this.off(event, handler);
  }

  off<K extends EngineEventName>(event: K, handler: EngineHandler<K>): void {
    const list = this.listeners.get(event);
    if (!list) return;
    this.listeners.set(
      event,
      list.filter((entry) => entry.handler !== handler),
    );
  }

  /**
   * Runs handlers by priority. A throwing handler is recorded and skipped
   * so later subscribers still run.
   */
  async emit<K extends EngineEventName>(
    event: K,
    payload: EngineEventMap[K],
  ): Promise<{ ok: boolean; errors: string[] }> {
    const handlers = [...(this.listeners.get(event) ?? [])];
    const errors: string[] = [];
    for (const entry of handlers) {
      try {
        await entry.handler(payload as never);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    return { ok: errors.length === 0, errors };
  }

  listenerCount(event: EngineEventName): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
