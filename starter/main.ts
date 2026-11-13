// roblox-up-and-coming-forecast-01's house baseline (Node 22, standard library only): persistence, the forecast that
// the Up-and-Coming chart will not move. It reads the last snapshot of /input/history.ndjson, the chart as it stood
// when the history ends (its up_and_coming rows), and /input/task.json (the places scored and the output file), and
// writes /output/forecast.json, one forecast for every read of the scored window:
//   - place 1: 0.5 on the game at #1 then, 0.3 on the game at #2;
//   - place k, from 2 to 10: 0.5 on the game at #k then, 0.15 on each of the games at #k-1 and #k+1;
//   - the other 0.2 of each place is left unnamed, shared by every game of the read's chart it does not name there;
//   - its top 10 is the chart's top 10 as it stood, in its order.
// The game at #2 gets the most over the ten places, 0.3 + 0.5 + 0.15 = 0.95: no game is given more than 1 in all, as a
// game holds one place at a time (the rules ask no such thing; each place is scored on its own). A prize needs a score
// strictly above the best house entry's: this one's, or the house model forecast's.
//
// Outside the grader's container, MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR stand in for /input and /output:
//   mkdir -p out && MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
/** On the game at #k for place k. */
const P_STAY = 0.5;
/** Place 1's share for the game at #2 (it has no #0). */
const P_FIRST_NEXT = 0.3;
/** On each of the games at #k-1 and #k+1 for place k from 2. */
const P_NEIGHBOUR = 0.15;

interface Row {
  rank: number;
  universe_id: number;
}

const task = JSON.parse(readFileSync(join(INPUT_DIR, 'task.json'), 'utf8')) as { places: number; output: string };
const lines = readFileSync(join(INPUT_DIR, 'history.ndjson'), 'utf8').split('\n').filter((l) => l !== '');
const last = JSON.parse(lines[lines.length - 1]!) as { up_and_coming: Row[] };
const chart = [...last.up_and_coming].sort((a, b) => a.rank - b.rank).map((r) => r.universe_id);
const probabilities: Array<{ universe_id: number; place: number; p: number }> = [];
for (let place = 1; place <= task.places && place <= chart.length; place++) {
  probabilities.push({ universe_id: chart[place - 1]!, place, p: P_STAY });
  if (place === 1) {
    if (chart[1] !== undefined) probabilities.push({ universe_id: chart[1], place, p: P_FIRST_NEXT });
    continue;
  }
  probabilities.push({ universe_id: chart[place - 2]!, place, p: P_NEIGHBOUR });
  if (chart[place] !== undefined) probabilities.push({ universe_id: chart[place], place, p: P_NEIGHBOUR });
}
writeFileSync(join(OUTPUT_DIR, task.output), `${JSON.stringify({ probabilities, top10: chart.slice(0, task.places) })}\n`);
