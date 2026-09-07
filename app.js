/**
 * Gemini Nano Summarizer App
 * Chrome Built-in AI の Summarizer API を使って
 * テキストを要約するシンプルなアプリ
 *
 * 対応: Chrome 138+ (Summarizer グローバル API)
 */

// ─── DOM 参照 ───────────────────────────────────────
const statusArea    = document.getElementById('status-area');
const inputText     = document.getElementById('input-text');
const summarizeBtn  = document.getElementById('summarize-btn');
const resultSection = document.getElementById('result-section');
const resultText    = document.getElementById('result-text');

// タブ
const tabSimpleBtn  = document.getElementById('tab-simple');
const tabDetailBtn  = document.getElementById('tab-detail');
const panelSimple   = document.getElementById('panel-simple');
const panelDetail   = document.getElementById('panel-detail');

// 詳細設定
const detailType    = document.getElementById('detail-type');
const detailFormat  = document.getElementById('detail-format');
const detailLength  = document.getElementById('detail-length');

// ─── ユーティリティ ──────────────────────────────────
function showStatus(message, type = 'info') {
  statusArea.textContent = message;
  statusArea.className = `status-area ${type}`;
}

function clearStatus() {
  statusArea.textContent = '';
  statusArea.className = 'status-area';
}

// ─── タブ切り替え ────────────────────────────────────
function activateTab(tabId) {
  const isSimple = tabId === 'tab-simple';

  // ボタンの状態を更新
  tabSimpleBtn.classList.toggle('active', isSimple);
  tabDetailBtn.classList.toggle('active', !isSimple);
  tabSimpleBtn.setAttribute('aria-selected', String(isSimple));
  tabDetailBtn.setAttribute('aria-selected', String(!isSimple));

  // パネルの表示を切り替え
  panelSimple.hidden = !isSimple;
  panelDetail.hidden = isSimple;
  panelSimple.classList.toggle('active', isSimple);
  panelDetail.classList.toggle('active', !isSimple);

  // 長さの値を引き継ぐ
  syncLength(tabId);
}

// 長さの値をタブ間で同期する
function syncLength(toTabId) {
  if (toTabId === 'tab-detail') {
    // シンプル → 詳細: ラジオの選択値を select に反映
    const checked = document.querySelector('input[name="length-simple"]:checked');
    if (checked) detailLength.value = checked.value;
  } else {
    // 詳細 → シンプル: select の値を対応するラジオに反映
    const radio = document.querySelector(
      `input[name="length-simple"][value="${detailLength.value}"]`
    );
    if (radio) radio.checked = true;
  }
}

tabSimpleBtn.addEventListener('click', () => activateTab('tab-simple'));
tabDetailBtn.addEventListener('click', () => activateTab('tab-detail'));

// ─── 設定値取得 ──────────────────────────────────────
function getSummarizerOptions() {
  if (panelSimple.classList.contains('active')) {
    // シンプルタブ: 長さのみ、他はデフォルト値
    const checked = document.querySelector('input[name="length-simple"]:checked');
    return {
      type:   'key-points',
      format: 'plain-text',
      length: checked ? checked.value : 'medium',
    };
  } else {
    // 詳細タブ: すべての設定値を使用
    return {
      type:   detailType.value,
      format: detailFormat.value,
      length: detailLength.value,
    };
  }
}

// ─── API 対応確認（ページ読み込み時） ────────────────
async function checkAvailability() {
  if (!('Summarizer' in self)) {
    showStatus(
      '⚠️ このブラウザは Summarizer API に対応していません。Chrome 138 以降をお使いください。',
      'error'
    );
    return;
  }

  try {
    const availability = await Summarizer.availability();

    if (availability === 'unavailable') {
      showStatus(
        '❌ この環境では Summarizer API を利用できません。' +
        '必要要件: VRAM 4GB 超 または RAM 16GB 以上 / ストレージ 22GB 以上の空き',
        'error'
      );
      return;
    }

    summarizeBtn.disabled = false;

    if (availability === 'downloadable' || availability === 'downloading') {
      showStatus(
        '⬇️ AI モデルが未ダウンロードです。「要約する」を押すとダウンロードが始まります。',
        'warning'
      );
    } else {
      // 'available'
      showStatus('✅ Summarizer API が利用可能です。', 'success');
      setTimeout(clearStatus, 2500);
    }
  } catch (err) {
    showStatus(`❌ API の確認中にエラーが発生しました: ${err.message}`, 'error');
  }
}

// ─── 要約処理 ────────────────────────────────────────
async function summarize() {
  const text = inputText.value.trim();

  if (!text) {
    showStatus('⚠️ テキストを入力してください。', 'warning');
    inputText.focus();
    return;
  }

  const options = getSummarizerOptions();

  summarizeBtn.disabled = true;
  summarizeBtn.textContent = '要約中...';
  resultSection.hidden = true;
  resultText.textContent = '';
  showStatus('⏳ 準備中...', 'info');

  let summarizer = null;

  try {
    // フェーズ1: モデルの準備（ダウンロードが必要な場合は進捗表示）
    summarizer = await Summarizer.create({
      type:   options.type,
      format: options.format,
      length: options.length,
      outputLanguage: 'ja',
      expectedInputLanguages: ['ja', 'en'],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          showStatus(`⬇️ モデルをダウンロード中... ${percent}%`, 'info');
        });
      },
    });

    // フェーズ2: 推論中
    showStatus('🤖 推論中...', 'info');
    const summary = await summarizer.summarize(text);

    // フェーズ3: 完了
    resultText.textContent = summary;
    resultSection.hidden = false;
    showStatus('✅ 要約が完了しました。', 'success');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch (err) {
    showStatus(`❌ 要約中にエラーが発生しました: ${err.message}`, 'error');
  } finally {
    if (summarizer) summarizer.destroy();
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = '要約する';
  }
}

// ─── 初期化 ──────────────────────────────────────────
summarizeBtn.addEventListener('click', summarize);
checkAvailability();
