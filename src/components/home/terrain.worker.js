// Builds part of the Arrakis terrain off the main thread (mesh, one baked-light cascade, or the sand height field) so the first screen never janks.
import { runJob } from './buildTerrain';

self.onmessage = (e) => {
  const r = runJob(e.data);
  self.postMessage(r, r.job === 'mesh' ? [r.pos.buffer, r.nor.buffer, r.idx.buffer, r.crests.buffer] : r.job === 'height' ? [r.height.data.buffer] : [r.cascade.data.buffer]);
  self.close();              // one job per worker; closing here spares the page from terminating it
};
