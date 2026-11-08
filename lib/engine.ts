import { SwissEphemeris } from '@swisseph/browser';
import wasmUrl from '../public/ephemeris/swisseph-1.4.0.wasm?url&inline';

// Embed the exact WASM bytes, so file:// never needs to fetch a sibling file.
export async function createEngine() {
  const engine = new SwissEphemeris();
  await engine.init(wasmUrl);
  return engine;
}
