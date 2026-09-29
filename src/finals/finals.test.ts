import { describe, expect, it } from 'vitest';
import { decideFinals } from './finals';

describe('decideFinals', () => {
  it('全勝3・1敗12: 18枠必要で16枠に収まらない → 16人・Byeなし・先攻ルール', () => {
    expect(decideFinals(3, 12)).toEqual({ advance: 16, byes: 0, twoLoss: 1, seedingRule: true });
  });

  it('全勝2・1敗10: 14枠で収まる → 全勝者2人がBye・14人進出', () => {
    expect(decideFinals(2, 10)).toEqual({ advance: 14, byes: 2, twoLoss: 2, seedingRule: false });
  });

  it('全勝1・1敗15: ①②が③より優先 → 16人・Byeなし', () => {
    expect(decideFinals(1, 15)).toEqual({ advance: 16, byes: 0, twoLoss: 0, seedingRule: true });
  });

  it('16人枠で全勝1人: 予選2位もByeになり 14人進出（Bye 2人）', () => {
    expect(decideFinals(1, 10)).toEqual({ advance: 14, byes: 2, twoLoss: 3, seedingRule: false });
    expect(decideFinals(1, 13)).toEqual({ advance: 14, byes: 2, twoLoss: 0, seedingRule: false });
  });

  it('16人枠で全勝1人でも、予選2位のByeで全勝・1敗が収まらないなら15人進出のまま（①優先）', () => {
    expect(decideFinals(1, 14)).toEqual({ advance: 15, byes: 1, twoLoss: 0, seedingRule: false });
  });

  it('8人枠で全勝1人は従来どおり 7人進出（Bye 1人）', () => {
    expect(decideFinals(1, 5)).toEqual({ advance: 7, byes: 1, twoLoss: 1, seedingRule: false });
  });

  it('全勝1・1敗7: 8人枠で9枠必要 → 8人・Byeなし', () => {
    expect(decideFinals(1, 7)).toEqual({ advance: 8, byes: 0, twoLoss: 0, seedingRule: true });
  });

  it('全勝4・1敗0: 8人枠にちょうど収まる → 4人がBye・4人進出', () => {
    expect(decideFinals(4, 0)).toEqual({ advance: 4, byes: 4, twoLoss: 0, seedingRule: false });
  });

  it('全勝0・1敗0: 8人枠・Byeなし', () => {
    expect(decideFinals(0, 0)).toEqual({ advance: 8, byes: 0, twoLoss: 8, seedingRule: false });
  });

  it('A=9 は16人枠になる', () => {
    expect(decideFinals(0, 9)).toEqual({ advance: 16, byes: 0, twoLoss: 7, seedingRule: false });
  });

  it('A=16 は16人枠の上限', () => {
    expect(decideFinals(0, 16)).toEqual({ advance: 16, byes: 0, twoLoss: 0, seedingRule: false });
  });

  it('A=17 以上はルール対象外で null', () => {
    expect(decideFinals(0, 17)).toBeNull();
    expect(decideFinals(5, 12)).toBeNull();
  });
});
