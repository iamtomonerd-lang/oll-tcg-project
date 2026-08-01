// 部品の内部で使う道具。カードデータ側からは使わない。

// 値が undefined の項目を落とす。
//
// 部品は「書かなかった設定」を undefined のまま組み立てるが、
// それをそのまま残すと { 期間: undefined } のような項目ができ、
// 手で書いたデータ（項目そのものが無い）と形が変わってしまう。
// 動作は同じでも、データを見比べるテストが落ちるので、ここで揃える。
export function 空の項目を落とす<T extends object>(もと: T): T {
  const 結果: Record<string, unknown> = {};
  for (const [名, 値] of Object.entries(もと)) {
    if (値 !== undefined) {
      結果[名] = 値;
    }
  }
  return 結果 as T;
}
