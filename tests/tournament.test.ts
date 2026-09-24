import { describe, expect, it } from 'vitest';
import { calculate, MAX_PLAYERS, MIN_PLAYERS } from '../src/tournament';

describe('calculate', () => {
  it('64人: 5回戦で確定終了、全勝2・1敗10 → 14人進出・Bye2・2敗から2人', () => {
    const r = calculate(64);
    expect(r.prob5).toBe(1);
    expect(r.prob6).toBe(0);
    expect(r.finals).toEqual([{ advance: 14, byes: 2, twoLoss: 2, seedingRule: false, prob: 1 }]);
    expect(r.outOfScopeProb).toBe(0);
  });

  it('128人: 6回戦で確定、全勝2・1敗12 → 14人進出・Bye2・2敗から0人', () => {
    const r = calculate(128);
    expect(r.prob5).toBe(0);
    expect(r.prob6).toBe(1);
    expect(r.finals).toEqual([{ advance: 14, byes: 2, twoLoss: 0, seedingRule: false, prob: 1 }]);
  });

  it('25人: 進出人数・Bye・2敗進出人数の組み合わせごとの確率', () => {
    const r = calculate(25);
    expect(r.finals).toEqual([
      { advance: 7, byes: 1, twoLoss: 1, seedingRule: false, prob: 0.03125 },
      { advance: 7, byes: 1, twoLoss: 2, seedingRule: false, prob: 0.5703125 },
      { advance: 7, byes: 1, twoLoss: 3, seedingRule: false, prob: 0.2109375 },
      { advance: 8, byes: 0, twoLoss: 2, seedingRule: false, prob: 0.0546875 },
      { advance: 8, byes: 0, twoLoss: 3, seedingRule: false, prob: 0.1328125 },
    ]);
  });

  it('90人: 5回戦終了と6回戦の両方が起こりうる', () => {
    const r = calculate(90);
    expect(r.prob6).toBeCloseTo(0.7890625, 12);
    expect(r.prob5).toBeCloseTo(1 - 0.7890625, 12);
    expect(r.finals.map((f) => [f.advance, f.byes, f.twoLoss, f.seedingRule])).toEqual([
      [14, 2, 4, false],
      [14, 2, 5, false],
      [15, 1, 4, false],
      [15, 1, 5, false],
      [15, 1, 6, false],
      [16, 0, 0, true],
    ]);
    const probs = [0.158203125, 0.142578125, 0.158203125, 0.263671875, 0.06640625, 0.2109375];
    r.finals.forEach((f, i) => expect(f.prob).toBeCloseTo(probs[i], 12));
  });

  it('全人数で確率の整合性が取れ、対象外ケースは起きない', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const r = calculate(players);
      expect(r.prob5 + r.prob6).toBeCloseTo(1, 12);
      const finalsTotal = r.finals.reduce((s, f) => s + f.prob, 0);
      expect(finalsTotal + r.outOfScopeProb).toBeCloseTo(1, 12);
      expect(r.outOfScopeProb).toBe(0);
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
