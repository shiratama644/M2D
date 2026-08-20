import { Engine, getEngine } from './Engine';
import { builtinFeatures } from './features/catalog';

export function createEngine(features = builtinFeatures): Engine {
  const engine = new Engine();
  for (const feature of features) {
    engine.register(feature);
  }
  return engine;
}

/** Starts the process-wide engine once (safe to call from React). */
export function startAppEngine(): Engine {
  const engine = getEngine();
  if (engine.listFeatures().length === 0) {
    for (const feature of builtinFeatures) {
      if (!engine.has(feature.id)) engine.register(feature);
    }
  }
  return engine.start();
}
