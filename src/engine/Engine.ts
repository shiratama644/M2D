import { EventBus } from './EventBus';
import type {
  Feature,
  FeatureStatus,
  JournalEntry,
  EngineEventMap,
  EngineEventName,
  EngineHandler,
  EngineCommandName,
  EngineCommandHandler,
  EngineCommandMap,
  EngineCommandResult,
  SubscribeOptions,
} from './types';

const JOURNAL_LIMIT = 80;

export class Engine {
  readonly bus = new EventBus();
  private readonly features = new Map<string, Feature>();
  private readonly enabled = new Map<string, boolean>();
  private readonly cleanups = new Map<string, () => void>();
  private readonly commands = new Map<string, EngineCommandHandler>();
  private readonly journal: JournalEntry[] = [];
  private started = false;

  listFeatures(): Feature[] {
    return [...this.features.values()];
  }

  status(): FeatureStatus[] {
    return this.listFeatures().map((feature) => ({
      id: feature.id,
      label: feature.label,
      enabled: this.enabled.get(feature.id) !== false,
      mounted: this.cleanups.has(feature.id),
    }));
  }

  has(id: string): boolean {
    return this.features.has(id);
  }

  isEnabled(id: string): boolean {
    return this.enabled.get(id) !== false;
  }

  register(feature: Feature): this {
    if (this.features.has(feature.id)) {
      throw new Error(`Feature already registered: ${feature.id}`);
    }
    this.features.set(feature.id, feature);
    this.enabled.set(feature.id, true);
    if (this.started) this.mountOne(feature);
    return this;
  }

  setEnabled(id: string, enabled: boolean): this {
    if (!this.features.has(id)) throw new Error(`Unknown feature: ${id}`);
    this.enabled.set(id, enabled);
    if (this.started) {
      if (enabled) this.mountOne(this.features.get(id)!);
      else this.unmountOne(id);
    }
    void this.bus.emit('engine.feature', { id, enabled });
    return this;
  }

  on<K extends EngineEventName>(
    event: K,
    handler: EngineHandler<K>,
    options?: SubscribeOptions,
  ): () => void {
    return this.bus.on(event, handler, options);
  }

  async emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): Promise<void> {
    const result = await this.bus.emit(event, payload);
    this.pushJournal(event, result.ok, result.errors[0]);
    if (!result.ok && event !== 'engine.error') {
      await this.bus.emit('engine.error', {
        source: event,
        error: result.errors.join('; '),
      });
    }
  }

  bind<K extends EngineCommandName>(
    name: K,
    handler: EngineCommandHandler<K>,
  ): () => void {
    this.commands.set(name, handler as EngineCommandHandler);
    return () => {
      if (this.commands.get(name) === handler) this.commands.delete(name);
    };
  }

  async dispatch<K extends EngineCommandName>(
    name: K,
    payload?: EngineCommandMap[K],
  ): Promise<EngineCommandResult[K] | undefined> {
    const handler = this.commands.get(name) as EngineCommandHandler<K> | undefined;
    if (!handler) {
      if (name === 'download.start' || name === 'dependency.check') {
        await this.emit(name, undefined);
      }
      return undefined;
    }
    try {
      const result = await handler((payload ?? undefined) as EngineCommandMap[K]);
      this.pushJournal(name, true);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.pushJournal(name, false, message);
      await this.bus.emit('engine.error', { source: name, error: message });
      throw err;
    }
  }

  recentJournal(): JournalEntry[] {
    return [...this.journal];
  }

  start(): this {
    if (this.started) return this;
    this.started = true;
    for (const feature of this.sortedFeatures()) {
      if (this.isEnabled(feature.id)) this.mountOne(feature);
    }
    void this.bus.emit('engine.ready', { features: this.listFeatures().map((f) => f.id) });
    return this;
  }

  stop(): void {
    for (const id of [...this.cleanups.keys()].reverse()) {
      this.unmountOne(id);
    }
    this.bus.clear();
    this.commands.clear();
    this.journal.length = 0;
    this.started = false;
  }

  private sortedFeatures(): Feature[] {
    const pending = new Set(this.features.keys());
    const ordered: Feature[] = [];
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (!pending.has(id)) return;
      if (visiting.has(id)) throw new Error(`Circular feature dependency at ${id}`);
      visiting.add(id);
      const feature = this.features.get(id);
      if (!feature) return;
      for (const dep of feature.dependsOn ?? []) visit(dep);
      visiting.delete(id);
      pending.delete(id);
      ordered.push(feature);
    };

    for (const id of this.features.keys()) visit(id);
    return ordered;
  }

  private mountOne(feature: Feature): void {
    if (this.cleanups.has(feature.id)) return;
    const cleanup = feature.mount(this);
    this.cleanups.set(feature.id, cleanup ?? (() => undefined));
  }

  private unmountOne(id: string): void {
    const cleanup = this.cleanups.get(id);
    if (!cleanup) return;
    cleanup();
    this.cleanups.delete(id);
  }

  private pushJournal(event: string, ok: boolean, error?: string): void {
    this.journal.push({ event, at: Date.now(), ok, error });
    if (this.journal.length > JOURNAL_LIMIT) this.journal.shift();
  }
}

let singleton: Engine | null = null;

export function getEngine(): Engine {
  if (!singleton) singleton = new Engine();
  return singleton;
}

export function __resetEngine(): void {
  singleton?.stop();
  singleton = null;
}
