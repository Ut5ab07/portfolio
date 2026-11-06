// Builds the fog's noise field off the main thread, so preparing the Profile scene never holds up the page.
import { noiseField } from './noiseField';

self.onmessage = (e) => {
  const steps = noiseField(e.data);
  let r = steps.next();
  while (!r.done) r = steps.next();
  self.postMessage(r.value, [r.value.buffer]);
  self.close();              // one job per worker
};
