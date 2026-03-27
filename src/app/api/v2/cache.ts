import NodeCache from 'node-cache';

/** In-memory cache shared across requests within the same Node.js process. */
export const memCache = new NodeCache({ useClones: false, checkperiod: 120 });
