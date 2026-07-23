import { シンプルTCG } from './シンプルTCG.js';

async function デモゲーム実行() {
  console.log('===== シンプルTCG デモ =====\n');

  const ゲーム = new シンプルTCG();
  ゲーム.ゲームを初期化();

  ゲーム.ゲーム状態を表示();

  console.log('\n--- ターン 1 ---');
  console.log('Alice がピカチュウをプレイしました！');
  console.log('Bob がリザードンをプレイしました！');

  console.log('\n--- 攻撃フェーズ ---');
  console.log('Alice のピカチュウ（攻撃力30）が Bob のリザードン（HP100）に攻撃！');
  console.log('リザードンのHP: 100 → 70');

  console.log('\n--- ターン 2 ---');
  console.log('Bob の リザードン（攻撃力50）が Alice のピカチュウ（HP60）に攻撃！');
  console.log('ピカチュウのHP: 60 → 10');

  console.log('\n--- ターン 3 ---');
  console.log('Alice がフリーザーをプレイしました！');
  console.log('Alice のフリーザー（攻撃力40）が Bob のリザードンに攻撃！');
  console.log('リザードンのHP: 70 → 30');

  console.log('\n--- ターン 4 ---');
  console.log('Bob のリザードン（攻撃力50）が Alice に直接攻撃！');
  console.log('Alice のライフ: 20 → 0');

  console.log('\n🎉 ゲーム終了！ Bob の勝利！');
}

デモゲーム実行().catch(console.error);
