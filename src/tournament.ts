import { decideFinals } from './finals';
import { advance, type Outcome } from './swiss';

export const MIN_PLAYERS = 25;
export const MAX_PLAYERS = 128;
/** 5回戦終了時の (4-1 + 5-0) がこれを超えたら6回戦 */
const SIXTH_ROUND_THRESHOLD = 16;

export interface CountProb {
  count: number;
  prob: number;
}

export interface RecordRow {
  wins: number;
  losses: number;
  counts: CountProb[];
}

export interface FinalsRow {
  advance: number;
  byes: number;
  seedingRule: boolean;
  prob: number;
}

export interface TournamentResult {
  prob5: number;
  prob6: number;
  records5: RecordRow[];
  records6: RecordRow[];
  finals: FinalsRow[];
  outOfScopeProb: number;
}

export function calculate(players: number): TournamentResult {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    throw new RangeError(`players must be an integer between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
  }

  let dist: Outcome[] = [{ state: [players], prob: 1 }];
  for (let r = 0; r < 5; r++) dist = advance(dist);
  const needsSixth = (o: Outcome) => o.state[4] + o.state[5] > SIXTH_ROUND_THRESHOLD;
  const ended5 = dist.filter((o) => !needsSixth(o));
  const ended6 = advance(dist.filter(needsSixth));

  const finals = new Map<string, FinalsRow>();
  let outOfScopeProb = 0;
  const endings: [Outcome[], number][] = [
    [ended5, 5],
    [ended6, 6],
  ];
  for (const [outcomes, rounds] of endings) {
    for (const o of outcomes) {
      const f = decideFinals(o.state[rounds], o.state[rounds - 1]);
      if (f === null) {
        outOfScopeProb += o.prob;
        continue;
      }
      const key = `${f.advance}|${f.byes}|${f.seedingRule}`;
      const row = finals.get(key);
      if (row) row.prob += o.prob;
      else finals.set(key, { ...f, prob: o.prob });
    }
  }

  return {
    prob5: sumProb(ended5),
    prob6: sumProb(ended6),
    records5: recordRows(ended5, 5),
    records6: recordRows(ended6, 6),
    finals: [...finals.values()].sort(
      (a, b) => a.advance - b.advance || a.byes - b.byes || Number(a.seedingRule) - Number(b.seedingRule),
    ),
    outOfScopeProb,
  };
}

function sumProb(outcomes: Outcome[]): number {
  return outcomes.reduce((s, o) => s + o.prob, 0);
}

/** 終了回戦数を条件とした、成績ごとの人数分布 */
function recordRows(outcomes: Outcome[], rounds: number): RecordRow[] {
  const total = sumProb(outcomes);
  if (total === 0) return [];
  const rows: RecordRow[] = [];
  for (let wins = rounds; wins >= 0; wins--) {
    const byCount = new Map<number, number>();
    for (const o of outcomes) {
      const count = o.state[wins];
      byCount.set(count, (byCount.get(count) ?? 0) + o.prob / total);
    }
    const counts = [...byCount]
      .map(([count, prob]) => ({ count, prob }))
      .sort((a, b) => a.count - b.count);
    rows.push({ wins, losses: rounds - wins, counts });
  }
  return rows;
}
