import { describe, expect, it } from 'vitest';
import { calculate, MAX_PLAYERS, MIN_PLAYERS } from '../src/tournament';

describe('calculate', () => {
  it('64人: 5回戦で確定終了、全勝2・1敗10 → 14人進出・Bye2', () => {
    const r = calculate(64);
    expect(r.prob5).toBe(1);
    expect(r.prob6).toBe(0);
    expect(r.records6).toEqual([]);
    expect(r.records5[0]).toEqual({ wins: 5, losses: 0, counts: [{ count: 2, prob: 1 }] });
    expect(r.records5[1]).toEqual({ wins: 4, losses: 1, counts: [{ count: 10, prob: 1 }] });
    expect(r.records5).toHaveLength(6);
    expect(r.finals).toEqual([{ advance: 14, byes: 2, seedingRule: false, prob: 1 }]);
    expect(r.outOfScopeProb).toBe(0);
  });

  it('128人: 6回戦で確定、全勝2・1敗12 → 14人進出・Bye2', () => {
    const r = calculate(128);
    expect(r.prob5).toBe(0);
    expect(r.prob6).toBe(1);
    expect(r.records5).toEqual([]);
    expect(r.records6[0]).toEqual({ wins: 6, losses: 0, counts: [{ count: 2, prob: 1 }] });
    expect(r.records6[1]).toEqual({ wins: 5, losses: 1, counts: [{ count: 12, prob: 1 }] });
    expect(r.records6).toHaveLength(7);
    expect(r.finals).toEqual([{ advance: 14, byes: 2, seedingRule: false, prob: 1 }]);
  });

  it('25人: 進出7人(Bye1) 81.25% / 8人(Byeなし) 18.75%', () => {
    const r = calculate(25);
    expect(r.finals).toEqual([
      { advance: 7, byes: 1, seedingRule: false, prob: 0.8125 },
      { advance: 8, byes: 0, seedingRule: false, prob: 0.1875 },
    ]);
  });

  it('90人: 5回戦終了と6回戦の両方が起こりうる', () => {
    const r = calculate(90);
    expect(r.prob6).toBeCloseTo(0.7890625, 12);
    expect(r.prob5).toBeCloseTo(1 - 0.7890625, 12);
    expect(r.records5.length).toBe(6);
    expect(r.records6.length).toBe(7);
  });

  it('全人数で確率の整合性が取れ、対象外ケースは起きない', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const r = calculate(players);
      expect(r.prob5 + r.prob6).toBeCloseTo(1, 12);
      const finalsTotal = r.finals.reduce((s, f) => s + f.prob, 0);
      expect(finalsTotal + r.outOfScopeProb).toBeCloseTo(1, 12);
      expect(r.outOfScopeProb).toBe(0);
      for (const row of [...r.records5, ...r.records6]) {
        expect(row.counts.reduce((s, c) => s + c.prob, 0)).toBeCloseTo(1, 12);
      }
    }
  });

  it('全人数の計算が1秒未満で終わる', () => {
    const start = performance.now();
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) calculate(players);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('範囲外・非整数は RangeError', () => {
    expect(() => calculate(24)).toThrow(RangeError);
    expect(() => calculate(129)).toThrow(RangeError);
    expect(() => calculate(30.5)).toThrow(RangeError);
  });
});
