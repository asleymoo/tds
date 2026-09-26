import { buildLane } from '../shared/build-lane.mjs';

await buildLane({ entry: 'src/index.js', outdir: 'dist' });
