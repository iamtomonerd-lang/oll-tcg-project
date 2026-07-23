const API_BASE = '';

let gameState = null;

const initBtn = document.getElementById('initBtn');
const resetBtn = document.getElementById('resetBtn');

initBtn.addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_BASE}/api/ゲーム/初期化`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('ゲーム初期化失敗');
    }

    const result = await response.json();
    if (result.成功) {
      console.log(result.メッセージ);
      initBtn.style.display = 'none';
      resetBtn.style.display = 'inline-block';
      await updateGameState();
    }
  } catch (error) {
    console.error('エラー:', error);
    alert('ゲーム初期化に失敗しました');
  }
});

resetBtn.addEventListener('click', () => {
  location.reload();
});

async function updateGameState() {
  try {
    const response = await fetch(`${API_BASE}/api/ゲーム/状態`);
    if (!response.ok) {
      throw new Error('ゲーム状態取得失敗');
    }

    gameState = await response.json();

    if (!gameState.初期化済み) {
      document.querySelector('.game-info').textContent = 'ゲーム開始ボタンでゲームを始めてください';
      return;
    }

    renderGameState();
  } catch (error) {
    console.error('エラー:', error);
  }
}

function renderGameState() {
  if (!gameState || !gameState.初期化済み) {
    return;
  }

  const playerA = gameState.プレイヤーA;
  const playerB = gameState.プレイヤーB;

  // プレイヤー情報
  document.getElementById('playerA-name').textContent = playerA.名前;
  document.getElementById('playerB-name').textContent = playerB.名前;

  // ライフ表示
  updateLifeBar('playerA', playerA.ライフ, 20);
  updateLifeBar('playerB', playerB.ライフ, 20);

  // 場のカード
  renderCards('playerA-field', playerA.場のカード);
  renderCards('playerB-field', playerB.場のカード);

  // ゲーム中央の情報
  const gameInfo = document.querySelector('.game-info');
  gameInfo.innerHTML = `
    <div>
      <p>${playerA.名前}: 手札 ${playerA.手札枚数} 枚</p>
      <p>${playerB.名前}: 手札 ${playerB.手札枚数} 枚</p>
    </div>
  `;
}

function updateLifeBar(playerId, currentLife, maxLife) {
  const lifeBar = document.getElementById(`${playerId}-life`);
  const lifeText = document.getElementById(`${playerId}-life-text`);

  const percentage = Math.max(0, (currentLife / maxLife) * 100);
  lifeBar.style.width = percentage + '%';
  lifeText.textContent = `${currentLife} / ${maxLife}`;

  // ライフが少ないときは色を変える
  if (currentLife <= 5) {
    lifeBar.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ff8e72 100%)';
  } else if (currentLife <= 10) {
    lifeBar.style.background = 'linear-gradient(90deg, #ffa500 0%, #ffb347 100%)';
  } else {
    lifeBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
  }
}

function renderCards(containerId, cards) {
  const container = document.getElementById(containerId);

  if (!cards || cards.length === 0) {
    container.innerHTML = '<div class="empty-zone">カードが無い</div>';
    return;
  }

  container.innerHTML = cards.map(card => `
    <div class="card">
      <div class="card-name">${card.名前}</div>
      <div class="card-stats">
        <div class="card-stat">
          <strong>HP</strong><br>${card.HP}
        </div>
        <div class="card-stat">
          <strong>ATK</strong><br>${card.攻撃力}
        </div>
      </div>
    </div>
  `).join('');
}

// 初期化
updateGameState();

// 定期的に状態を更新
setInterval(updateGameState, 2000);
