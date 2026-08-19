import { EventBus } from './EventBus';
import type { Feature, EngineEventMap, EngineEventName, EngineHandler } from './types';

export class Engine {
  readonly bus = new EventBus();
  private readonly features = new Map<string, Feature>();
  private readonly unmounts: Array<() => void> = [];
  private started = false;

  listFeatures(): Feature[] {
    return [...this.features.values()];
  }

  has(id: string): boolean {
    return this.features.has(id);
  }

  register(feature: Feature): this {
    if (this.features.has(feature.id)) {
      throw new Error(`Feature already registered: ${feature.id}`);
    }
    this.features.set(feature.id, feature);
    if (this.started) {
      const cleanup = feature.mount(this);
      if (cleanup) this.unmounts.push(cleanup);
    }
    return this;
  }

  on<K extends EngineEventName>(event: K, handler: EngineHandler<K>): () => void {
    return this.bus.on(event, handler);
  }

  async emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): Promise<void> {
    await this.bus.emit(event, payload);
  }

  start(): this {
    if (this.started) return this;
    this.started = true;
    for (const feature of this.features.values()) {
      const cleanup = feature.mount(this);
      if (cleanup) this.unmounts.push(cleanup);
    }
    void this.bus.emit('engine.ready', { features: this.listFeatures().map((f) => f.id) });
    return this;
  }

  stop(): void {
    while (this.unmounts.length) {
      this.unmounts.pop()?.();
    }
    this.bus.clear();
    this.started = false;
  }
}

let singleton: Engine | null = null;

export function getEngine(): Engine {
  if (!singleton) {
    singleton = new Engine();
  }
  return singleton;
}

/** Test helper — discards the process-wide engine. */
export function __resetEngine(): void {
  singleton?.stop();
  singleton = null;
}
