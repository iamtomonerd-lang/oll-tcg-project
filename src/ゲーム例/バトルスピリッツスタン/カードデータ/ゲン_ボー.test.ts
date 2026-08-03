import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ゲン_ボーを作成 } from './ゲン_ボー.js';
import { BP管理 } from '../管理/BP管理.js';
import { シンボルルール } from '../カードの情報/シンボル.js';
import { 効果ルール } from '../カードの情報/効果.js';
import { 試合 } from '../試合.js';
import { 効果インタプリタ } from '../../../効果解釈/インタプリタ.js';
import { バトスピ接続 } from '../効果語彙/バトスピ接続.js';

// 効果はデータになったので、実際に走らせて確かめる
function ゲン_ボーの環境を作る() {
  const 試合インスタンス = new 試合();
  試合インスタンス.プレイヤーを準備する('p1', 'プレイヤー1');
  試合インスタンス.プレイヤーを準備する('p2', 'プレイヤー2');
  試合インスタンス.ボイドを準備する();
  試合インスタンス.デッキを設定する('p1', [ゲン_ボーを作成('p1-deck-1')]);
  試合インスタンス.デッキを設定する('p2', [ゲン_ボーを作成('p2-deck-1')]);
  試合インスタンス.準備を行う('p1');
  試合インスタンス.準備を行う('p2');

  const 自身 = ゲン_ボーを作成('genbo-field');
  試合インスタンス.ゾーン管理.フィールドを取得(試合インスタンス.ゲーム, 'p1')!.カードを追加(自身);
  試合インスタンス.BP管理.Lvに対応したBPに更新(自身, 1);

  const インタプリタ = new 効果インタプリタ(new バトスピ接続(試合インスタンス));
  return { 試合: 試合インスタンス, インタプリタ, 自身 };
}

test('ゲン_ボー: card definition is correct', () => {
  const card = ゲン_ボーを作成('genbo-1');
  const cardData = card.名称 as any;

  // 画面に出る名前はカード画像どおりの「ゲン＝ボー」。
  // ファイル名と関数名がアンダースコアなのは、全角＝がJSの識別子に使えないため。
  // （最奥：風牙岩 も同じ理由で 最奥_風牙岩.ts になっている）
  assert.equal(card.名称.表示名, 'ゲン＝ボー');
  assert.equal(cardData.カードナンバー, '26RSD01-002');
  assert.equal(cardData.コスト, 3);
});

test('ゲン_ボー: Lv info is correct', () => {
  const card = ゲン_ボーを作成('genbo-1');
  const lvList = (card.名称 as any).Lv;

  assert.equal(lvList.length, 2);
  assert.equal(lvList[0].level, 1);
  assert.equal(lvList[0].bp, 3000);
  assert.equal(lvList[1].level, 2);
  assert.equal(lvList[1].bp, 5000);
  assert.equal(lvList[1].真界放, true);
});

test('ゲン_ボー: 効果がデータとして宣言されている', () => {
  const card = ゲン_ボーを作成('genbo-1');
  const 効果一覧 = new 効果ルール().効果を取得(card);

  assert.equal(効果一覧.length, 1);
  const 効果 = 効果一覧[0];
  assert.deepEqual(効果.Lv, [2]);
  assert.equal(効果.種別, '常在');
  assert.equal(効果.状態, 'アタック中');
  assert.deepEqual(効果.条件, { 自身: { 真界放: true } });
  assert.deepEqual(効果.処理, [{ BP変更: { 対象: '自身', 値: 2000 } }]);
});

test('ゲン_ボー: アタック中でなければ効果は発動しない', () => {
  const { 試合: 試合インスタンス, インタプリタ, 自身 } = ゲン_ボーの環境を作る();
  // アタック中フラグを立てない
  試合インスタンス.Lv管理.Lvを上げる(自身, 2);
  const 前のBP = 試合インスタンス.BP管理.現在のBPを取得(自身);

  const 効果 = new 効果ルール().効果を取得(自身)[0];
  // 状態の要求は効果実行器が見るため、ここでは実行器経由で確かめる
  const 積んだ = 試合インスタンス.効果実行器.事象を通知する('アタック時', 自身);

  assert.equal(積んだ, 0, '常在効果は事象で誘発しない');
  assert.equal(試合インスタンス.BP管理.現在のBPを取得(自身), 前のBP);
  assert.ok(効果);
  assert.ok(インタプリタ);
});

// 常在効果は「実行する」ものではなく「ずっと働いている」もの。
// インタプリタに流して確かめるとBPを二重に足してしまうため、
// 実際の経路（現在のBPを取得）で確かめる。
test('ゲン_ボー: Lv2かつアタック中ならBP+2000される', () => {
  const { 試合: 試合インスタンス, 自身 } = ゲン_ボーの環境を作る();
  試合インスタンス.Lv管理.Lvを上げる(自身, 2);

  const 素のBP = 試合インスタンス.BP管理.現在のBPを取得(自身);
  自身.状態を設定('アタック中', true);
  assert.equal(試合インスタンス.BP管理.現在のBPを取得(自身), 素のBP + 2000);

  自身.状態をクリア('アタック中');
  assert.equal(
    試合インスタンス.BP管理.現在のBPを取得(自身),
    素のBP,
    'アタックが終われば元のBPに戻る'
  );
});

test('ゲン_ボー: Lv1では真界放条件を満たさずBPが上がらない', () => {
  const { 試合: 試合インスタンス, 自身 } = ゲン_ボーの環境を作る();
  // Lvを上げないので真界放状態ではない

  const 素のBP = 試合インスタンス.BP管理.現在のBPを取得(自身);
  自身.状態を設定('アタック中', true);
  assert.equal(試合インスタンス.BP管理.現在のBPを取得(自身), 素のBP);
});

test('ゲン_ボー: has EX symbol for succession call', () => {
  const card = ゲン_ボーを作成('genbo-1');
  const symbolRule = new シンボルルール();

  const hasEX = symbolRule.EXシンボルを持つ(card);
  assert.equal(hasEX, true);

  const exSymbolCount = symbolRule.EXシンボル数を取得(card);
  assert.equal(exSymbolCount, 1);
});
