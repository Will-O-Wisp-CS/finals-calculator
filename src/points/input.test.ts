import { describe, expect, it } from 'vitest';
import { parsePointsForm, parsePositiveInt } from './input';

describe('parsePositiveInt', () => {
  it('1以上の整数を受け付ける（前後の空白は無視）', () => {
    expect(parsePositiveInt(' 12 ', '順位')).toEqual({ ok: true, value: 12 });
    expect(parsePositiveInt('1000', '参加人数')).toEqual({ ok: true, value: 1000 });
  });

  it('全角数字を受け付ける', () => {
    expect(parsePositiveInt('６４', '参加人数')).toEqual({ ok: true, value: 64 });
  });

  it('空欄はラベル付きのエラー', () => {
    expect(parsePositiveInt('', '順位')).toEqual({ ok: false, message: '順位を入力してください' });
  });

  it('整数以外はエラー', () => {
    for (const raw of ['3.5', 'abc', '-3', '1e2']) {
      expect(parsePositiveInt(raw, '順位')).toEqual({ ok: false, message: '整数で入力してください' });
    }
  });

  it('0 はエラー', () => {
    expect(parsePositiveInt('0', '参加人数')).toEqual({
      ok: false,
      message: '参加人数は1以上で入力してください',
    });
  });
});

describe('parsePointsForm', () => {
  it('両方正しければ値を返す', () => {
    expect(parsePointsForm('10', '25')).toEqual({ ok: true, rank: 10, players: 25 });
  });

  it('順位＝参加人数は許可', () => {
    expect(parsePointsForm('25', '25')).toEqual({ ok: true, rank: 25, players: 25 });
  });

  it('フィールドごとのエラーを返す', () => {
    expect(parsePointsForm('', 'x')).toEqual({
      ok: false,
      rankError: '順位を入力してください',
      playersError: '整数で入力してください',
    });
    expect(parsePointsForm('3', '')).toEqual({
      ok: false,
      rankError: '',
      playersError: '参加人数を入力してください',
    });
  });

  it('順位が参加人数より大きいとエラー', () => {
    expect(parsePointsForm('30', '25')).toEqual({
      ok: false,
      rankError: '順位は参加人数以下で入力してください',
      playersError: '',
    });
  });
});
