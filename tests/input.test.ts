import { describe, expect, it } from 'vitest';
import { parsePlayers } from '../src/input';

describe('parsePlayers', () => {
  it('範囲内の整数を受け付ける（前後の空白は無視）', () => {
    expect(parsePlayers('25')).toEqual({ ok: true, value: 25 });
    expect(parsePlayers(' 128 ')).toEqual({ ok: true, value: 128 });
  });

  it('全角数字を受け付ける', () => {
    expect(parsePlayers('３２')).toEqual({ ok: true, value: 32 });
  });

  it('空欄はエラー', () => {
    expect(parsePlayers('')).toEqual({ ok: false, message: '参加人数を入力してください' });
  });

  it('整数以外はエラー', () => {
    for (const raw of ['30.5', 'abc', '-30', '1e2']) {
      expect(parsePlayers(raw)).toEqual({ ok: false, message: '整数で入力してください' });
    }
  });

  it('範囲外はエラー', () => {
    for (const raw of ['24', '129']) {
      expect(parsePlayers(raw)).toEqual({
        ok: false,
        message: '参加人数は25〜128人で入力してください',
      });
    }
  });
});
