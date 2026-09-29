import { describe, expect, it } from 'vitest';
import { parseSchedule } from './parse';

// dmp-ranking.com/schedule.asp の検索結果（2026-09-29 取得）から切り出した行
function row(approval: string, date: string, name: string, capacity: string, start: string, link: string): string {
  const td = (inner: string) =>
    `<td align="center" style="border:solid 1px #444444;" onClick="location.href='${link}';">\n\t\t\t\t\t\t${inner}\n\t\t\t\t\t</td>`;
  const spaced = [...name].join('<wbr>');
  return `
				<tr style="cursor:pointer;">
					${td(`<nobr>\n\t\t\t\t\t\t<span class="tx1214" style="color:#ffff00;">${approval}</span>\n\t\t\t\t\t\t</nobr>`)}
					${td(date)}
					${td('<nobr><span class="tx1113">東京</span></nobr>')}
					${td(spaced)}
					${td('い<wbr>わ<wbr>や<wbr>書<wbr>店')}
					${td('<nobr>\n\t\t\t\t\t\t\t<span class="tx1012">オリジナル</span>\n\t\t\t\t\t\t</nobr>')}
					${td('<nobr>\n\t\t\t\t\t\t個人\n\t\t\t\t\t\t</nobr>')}
					${td('\\1500')}
					${td(capacity)}
					${td(start)}
					${td('○')}
					${td('★')}
				</tr>`;
}

function page(rows: string[]): string {
  return `<html><body>
			<table id="main" border="0" width="100%" cellpadding="4" cellspacing="0" class="tx1214">
				<tr>
					<th align="center">承認</th><th align="center">開催日</th>
				</tr>
${rows.join('\n')}
			</table>
		</body></html>`;
}

const HARERUYA = row('◎', '26/10/04', '鬼火CS in 晴れる屋3', '108', '17:10', 'event.asp?ShopID=342&EventID=344&Seq=2');
const SHINJUKU = row('◎', '26/10/04', '鬼火CS in 竜星の嵐新宿店', '80', '10:30', 'event.asp?ShopID=388&EventID=344&Seq=1');
const UNAPPROVED = row('未', '26/11/28', '鬼火CS in 竜星のPAO秋葉原ロケット無線店', '128', '00:00', 'event.asp?ShopID=9999&EventID=351&Seq=1');

describe('parseSchedule', () => {
  it('承認済みの大会を表示どおりの項目で取り出す', () => {
    expect(parseSchedule(page([HARERUYA]))).toEqual([
      {
        date: '2026-10-04',
        venue: '晴れる屋3',
        format: 'オリジナル',
        entryType: '個人',
        capacity: 108,
        start: '17:10',
        url: 'https://www.dmp-ranking.com/event.asp?ShopID=342&EventID=344&Seq=2',
      },
    ]);
  });

  it('承認が「◎」以外（未など）の大会は除外する', () => {
    const events = parseSchedule(page([HARERUYA, UNAPPROVED, SHINJUKU]));
    expect(events.map((e) => e.venue)).toEqual(['晴れる屋3', '竜星の嵐新宿店']);
  });

  it('全角の「ＣＳ　ｉｎ」でも開催地を取り出す', () => {
    const events = parseSchedule(page([row('◎', '26/10/04', '鬼火ＣＳ　ｉｎ　晴れる屋３', '108', '17:10', 'event.asp?ShopID=1&EventID=1&Seq=1')]));
    expect(events[0].venue).toBe('晴れる屋3');
  });

  it('「鬼火CS in ○○」の形でない大会名は名前全体を開催地にする', () => {
    const events = parseSchedule(page([row('◎', '26/10/04', '鬼火CS 特別編', '64', '10:30', 'event.asp?ShopID=1&EventID=1&Seq=1')]));
    expect(events[0].venue).toBe('鬼火CS 特別編');
  });

  it('検索結果が0件なら空配列', () => {
    expect(parseSchedule(page([]))).toEqual([]);
  });

  it('結果の表が見つからない（サイトの構造が変わった）ときは例外を投げる', () => {
    expect(() => parseSchedule('<html><body>メンテナンス中</body></html>')).toThrow();
  });
});
