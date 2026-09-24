import { describe, expect, it } from 'vitest';
import { formatPercent } from '../src/format';

describe('formatPercent', () => {
  it('小数1桁で表示し、末尾の .0 は省く', () => {
    expect(formatPercent(0.8125)).toBe('81.3%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('0より大きく0.1%未満 / 99.9%より大きく100%未満は丸めずに記号で示す', () => {
    expect(formatPercent(0.0004)).toBe('<0.1%');
    expect(formatPercent(0.9996)).toBe('>99.9%');
  });
});
