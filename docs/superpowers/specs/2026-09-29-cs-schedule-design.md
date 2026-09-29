# 鬼火CS 大会スケジュールページ 設計書

- 作成日: 2026-09-29
- 状態: 承認済み

## Context
鬼火CSの開催予定は DMPランキング（https://www.dmp-ranking.com/schedule.asp）の大会日程に大会名「鬼火」で検索しないと見られない。
これを**月ごとの大会スケジュール**として同じサイトの新ページ `schedule.html` に載せる。
dmp-ranking は随時更新されるため、**毎日 0:00 JST に取得し、変更があったときだけページを更新**する。

## 取得元
- `GET https://www.dmp-ranking.com/schedule.asp?Search=Search&Meisho=%8B%53%89%CE&EventFrom=YYYY/M/D`（Shift_JIS）
- `EventFrom` は **JST の当月1日**。当月の開催済み大会も表示するためで、履歴を貯める仕組みは作らない。月が替わると前月分は自然に消える
- dmp-ranking は CORS 制限があり、文字コードも Shift_JIS なので、ブラウザから直接は取得しない。GitHub Actions で取得して JSON をコミットする
- 結果は `<table id="main">` の中の `<tr style="cursor:pointer;">` の行。セル順は次のとおり
  - 承認 / 開催日 `26/10/04` / 都道府県 / 大会名（1文字ごとに `<wbr>`） / 店舗 / フォーマット / 参加形式 / 参加費 / 定員 / 開始 / ジャッジ / 参加表明
- 各セルに `event.asp?ShopID=..&EventID=..&Seq=..` への onClick がある

## 抽出ルール
- 承認が `◎` 以外（`未` など）の大会は載せない
- **開催地**: 大会名「鬼火CS in ○○」の ○○（NFKC 正規化後に `/^鬼火CS\s*in\s*(.+)$/i`）。この形に合わない大会名は名前全体を使う
- **フォーマット・参加形式・定員**: 表示どおり
- **受付時刻**: 開始の20分前〜開始（例: 開始 10:30 → `10:10〜10:30`）

## 表示（2026-09-29 追加）
- **開催日の色**: 土曜＝青、日曜＝赤、祝日＝黄色のマーカー背景（文字は黒）、平日＝黒。祝日は曜日より優先する
  - 黄色の文字は白背景では読めないため、マーカーにする
  - 祝日は `calendar.ts` で祝日法の現行ルールから計算する（春分・秋分は近似式、振替休日・国民の休日を含む）
- **参加表明**: 開催日14日前の 20:00 JST から大会開始時刻までを「参加表明受付中」として表示する
  - 受付前は「参加表明 9/20(日) 20:00〜」と表示する
  - 開始時刻を過ぎた大会は「開催済み」とし、行を薄く表示する
  - 判定はページを開いた時点の時刻で、ブラウザ側で行う
- 前提条件の表示はしない。「最終更新」だけを表示する

## 構成
- `src/schedule/parse.ts` — `parseSchedule(html)`：HTML → `ScheduleEvent[]`。`<table id="main"` が無ければ例外を投げる
- `src/schedule/schedule.ts` — `receptionWindow` / `groupByMonth` / `searchFromDate`（JST当月1日）/ `sameEvents` / `entryStatus`（参加表明の状況）
- `src/schedule/calendar.ts` — `holidayName` / `dayKind`（祝日・曜日の判定）
- `src/schedule/fetch.ts` — Node 専用の取得スクリプト（`npm run fetch-schedule`）
  - Shift_JIS を `TextDecoder` で変換してパースする
  - 既存の `events.json` と比べて、変わっていたときだけ `{ updatedAt, events }` を書き出す
  - 失敗したらファイルに触れずに exit 1 で終わる
- `src/schedule/events.json` — 取得結果（コミットする）
- `src/schedule/main.ts` + `src/schedule.html` — 月ごとのカードに表を描画する
  - 列は「開催日（曜日） / 開催地 / フォーマット / 参加形式 / 定員 / 受付」
  - 開催日は大会詳細へのリンクにする

```ts
type ScheduleEvent = {
  date: string;      // 'YYYY-MM-DD'
  venue: string;     // 開催地
  format: string;    // フォーマット
  entryType: string; // 参加形式
  capacity: number;  // 定員
  start: string;     // 'HH:MM'
  url: string;       // 大会詳細ページ
};
```

## 自動更新（`.github/workflows/deploy.yml`）
- `schedule: cron '0 15 * * *'`（0:00 JST）と `workflow_dispatch` では、先に `npm run fetch-schedule` を実行する
- `events.json` に差分があれば github-actions[bot] がコミットして push し、そのまま test → build → deploy まで行う。差分がなければビルドもデプロイもしない
- GITHUB_TOKEN による push は別のworkflowを起動しないので、二重にデプロイされることはない

## エラー時の動き
- 取得失敗、HTTP エラー、表が見つからない場合: exit 1 で終わる。`events.json` は更新しない。失敗は Actions の通知で分かる
- 検索結果が0件の場合: 正常な結果として扱う。ページには「予定されている大会はありません」と表示する

## 運用上の注意
- GitHub の cron は数分〜数十分遅れることがある
- リポジトリに60日間動きがないと、定期実行が停止されることがある

## テスト
- `parse.test.ts`: 実 HTML から切り出した行（`未` の行を含む）で、除外・開催地の抽出・各項目・URL を確認する。表が無い場合の例外も確認する
- `schedule.test.ts`: 受付時刻（`00:10` のような20分未満も）、月ごとのまとめと並び順、JST 月初（UTC 15:00 の境界）、差分判定を確認する
