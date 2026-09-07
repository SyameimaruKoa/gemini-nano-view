/**
 * Gemini Nano AI Tools
 * Chrome Built-in AI の Summarizer API / Translator API を使って
 * テキストの要約・翻訳をオンデバイスで行うアプリ
 *
 * 対応: Chrome 138+ (Summarizer / Translator グローバル API)
 */

// ─── DOM 参照: グローバルナビ ────────────────────────
const navSummarizerBtn = document.getElementById('nav-summarizer');
const navTranslatorBtn = document.getElementById('nav-translator');
const pageSummarizer   = document.getElementById('page-summarizer');
const pageTranslator   = document.getElementById('page-translator');

// ─── DOM 参照: 要約 ──────────────────────────────────
const summarizerStatus = document.getElementById('summarizer-status-area');
const inputText        = document.getElementById('input-text');
const summarizeBtn     = document.getElementById('summarize-btn');
const summarizerResult = document.getElementById('summarizer-result-section');
const summarizerText   = document.getElementById('summarizer-result-text');

// 要約設定タブ
const tabSimpleBtn = document.getElementById('tab-simple');
const tabDetailBtn = document.getElementById('tab-detail');
const panelSimple  = document.getElementById('panel-simple');
const panelDetail  = document.getElementById('panel-detail');

// 詳細設定
const detailType   = document.getElementById('detail-type');
const detailFormat = document.getElementById('detail-format');
const detailLength = document.getElementById('detail-length');

// ─── DOM 参照: 翻訳 ──────────────────────────────────
const translatorStatus = document.getElementById('translator-status-area');
const sourceLang       = document.getElementById('source-lang');
const targetLang       = document.getElementById('target-lang');
const translateInput   = document.getElementById('translate-input');
const translateBtn     = document.getElementById('translate-btn');
const translatorResult = document.getElementById('translator-result-section');
const translatorText   = document.getElementById('translator-result-text');

// ─── ユーティリティ ──────────────────────────────────
function showStatus(el, message, type = 'info') {
  el.textContent = message;
  el.className = `status-area ${type}`;
}

function clearStatus(el) {
  el.textContent = '';
  el.className = 'status-area';
}

// ════════════════════════════════════════════════════
// グローバルナビ切り替え
// ════════════════════════════════════════════════════

function activatePage(pageId) {
  const isSummarizer = pageId === 'page-summarizer';

  navSummarizerBtn.classList.toggle('active', isSummarizer);
  navTranslatorBtn.classList.toggle('active', !isSummarizer);

  pageSummarizer.hidden = !isSummarizer;
  pageTranslator.hidden = isSummarizer;

  // 翻訳ページに切り替えたとき API を確認
  if (!isSummarizer) {
    checkTranslatorAvailability();
  }
}

navSummarizerBtn.addEventListener('click', () => activatePage('page-summarizer'));
navTranslatorBtn.addEventListener('click', () => activatePage('page-translator'));

// ════════════════════════════════════════════════════
// 要約
// ════════════════════════════════════════════════════

// ─── 要約設定タブ切り替え ────────────────────────────
function activateTab(tabId) {
  const isSimple = tabId === 'tab-simple';

  tabSimpleBtn.classList.toggle('active', isSimple);
  tabDetailBtn.classList.toggle('active', !isSimple);
  tabSimpleBtn.setAttribute('aria-selected', String(isSimple));
  tabDetailBtn.setAttribute('aria-selected', String(!isSimple));

  panelSimple.hidden = !isSimple;
  panelDetail.hidden = isSimple;
  panelSimple.classList.toggle('active', isSimple);
  panelDetail.classList.toggle('active', !isSimple);

  syncLength(tabId);
}

// 長さの値をタブ間で同期する
function syncLength(toTabId) {
  if (toTabId === 'tab-detail') {
    const checked = document.querySelector('input[name="length-simple"]:checked');
    if (checked) detailLength.value = checked.value;
  } else {
    const radio = document.querySelector(
      `input[name="length-simple"][value="${detailLength.value}"]`
    );
    if (radio) radio.checked = true;
  }
}

tabSimpleBtn.addEventListener('click', () => activateTab('tab-simple'));
tabDetailBtn.addEventListener('click', () => activateTab('tab-detail'));

// ─── 要約設定値取得 ──────────────────────────────────
function getSummarizerOptions() {
  if (panelSimple.classList.contains('active')) {
    const checked = document.querySelector('input[name="length-simple"]:checked');
    return {
      type:   'key-points',
      format: 'plain-text',
      length: checked ? checked.value : 'medium',
    };
  }
  return {
    type:   detailType.value,
    format: detailFormat.value,
    length: detailLength.value,
  };
}

// ─── 要約 API 確認 ───────────────────────────────────
async function checkSummarizerAvailability() {
  if (!('Summarizer' in self)) {
    showStatus(summarizerStatus,
      '⚠️ このブラウザは Summarizer API に対応していません。Chrome 138 以降をお使いください。',
      'error'
    );
    return;
  }
  try {
    const availability = await Summarizer.availability();
    if (availability === 'unavailable') {
      showStatus(summarizerStatus,
        '❌ この環境では Summarizer API を利用できません。' +
        '必要要件: VRAM 4GB 超 または RAM 16GB 以上 / ストレージ 22GB 以上の空き',
        'error'
      );
      return;
    }
    summarizeBtn.disabled = false;
    if (availability === 'downloadable' || availability === 'downloading') {
      showStatus(summarizerStatus,
        '⬇️ AI モデルが未ダウンロードです。「要約する」を押すとダウンロードが始まります。',
        'warning'
      );
    } else {
      showStatus(summarizerStatus, '✅ Summarizer API が利用可能です。', 'success');
      setTimeout(() => clearStatus(summarizerStatus), 2500);
    }
  } catch (err) {
    showStatus(summarizerStatus,
      `❌ API の確認中にエラーが発生しました: ${err.message}`, 'error'
    );
  }
}

// ─── 要約実行 ────────────────────────────────────────
async function summarize() {
  const text = inputText.value.trim();
  if (!text) {
    showStatus(summarizerStatus, '⚠️ テキストを入力してください。', 'warning');
    inputText.focus();
    return;
  }

  const options = getSummarizerOptions();
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = '要約中...';
  summarizerResult.hidden = true;
  summarizerText.textContent = '';
  showStatus(summarizerStatus, '⏳ 準備中...', 'info');

  let summarizer = null;
  try {
    // フェーズ1: モデルの準備
    summarizer = await Summarizer.create({
      type:   options.type,
      format: options.format,
      length: options.length,
      outputLanguage: 'ja',
      expectedInputLanguages: ['ja', 'en'],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          showStatus(summarizerStatus, `⬇️ モデルをダウンロード中... ${percent}%`, 'info');
        });
      },
    });

    // フェーズ2: 推論中
    showStatus(summarizerStatus, '🤖 推論中...', 'info');
    const summary = await summarizer.summarize(text);

    // フェーズ3: 完了
    summarizerText.textContent = summary;
    summarizerResult.hidden = false;
    showStatus(summarizerStatus, '✅ 要約が完了しました。', 'success');
    summarizerResult.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch (err) {
    showStatus(summarizerStatus,
      `❌ 要約中にエラーが発生しました: ${err.message}`, 'error'
    );
  } finally {
    if (summarizer) summarizer.destroy();
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = '要約する';
  }
}

summarizeBtn.addEventListener('click', summarize);

// ════════════════════════════════════════════════════
// 翻訳
// ════════════════════════════════════════════════════

// Translator API は 'auto' をサポートしないため
// ソースが 'auto' の場合は 'en' をフォールバックとして使用する
function getEffectiveSourceLang() {
  return sourceLang.value === 'auto' ? 'en' : sourceLang.value;
}

// インスタンスキャッシュ（同じ言語ペアは使い回す）
let cachedTranslator = null;
let cachedSrc = null;
let cachedTgt = null;

// キャッシュを破棄する
function destroyTranslator() {
  if (cachedTranslator) {
    cachedTranslator.destroy();
    cachedTranslator = null;
    cachedSrc = null;
    cachedTgt = null;
  }
}

// ─── 翻訳 API 確認 ───────────────────────────────────
async function checkTranslatorAvailability() {
  // 言語ペアが変わったらキャッシュを破棄
  destroyTranslator();

  if (!('Translator' in self)) {
    showStatus(translatorStatus,
      '⚠️ このブラウザは Translator API に対応していません。Chrome 138 以降をお使いください。',
      'error'
    );
    translateBtn.disabled = true;
    return;
  }
  try {
    const src = getEffectiveSourceLang();
    const tgt = targetLang.value;

    // ソースとターゲットが同じ場合は無効
    if (src === tgt) {
      showStatus(translatorStatus, '⚠️ ソース言語と翻訳先が同じです。', 'warning');
      translateBtn.disabled = true;
      return;
    }

    const availability = await Translator.availability({
      sourceLanguage: src,
      targetLanguage: tgt,
    });

    if (availability === 'unavailable') {
      showStatus(translatorStatus,
        `❌ ${src} → ${tgt} の翻訳はこの環境で利用できません。`, 'error'
      );
      translateBtn.disabled = true;
      return;
    }

    translateBtn.disabled = false;

    if (availability === 'downloadable' || availability === 'downloading') {
      showStatus(translatorStatus,
        '⬇️ 言語パックが未ダウンロードです。「翻訳する」を押すとダウンロードが始まります。',
        'warning'
      );
    } else {
      showStatus(translatorStatus, '✅ Translator API が利用可能です。', 'success');
      setTimeout(() => clearStatus(translatorStatus), 2500);
    }
  } catch (err) {
    showStatus(translatorStatus,
      `❌ API の確認中にエラーが発生しました: ${err.message}`, 'error'
    );
    translateBtn.disabled = true;
  }
}

// 言語選択変更時に再確認
sourceLang.addEventListener('change', checkTranslatorAvailability);
targetLang.addEventListener('change', checkTranslatorAvailability);

// ─── 翻訳実行 ────────────────────────────────────────
async function translate() {
  const text = translateInput.value.trim();
  if (!text) {
    showStatus(translatorStatus, '⚠️ テキストを入力してください。', 'warning');
    translateInput.focus();
    return;
  }

  const src = getEffectiveSourceLang();
  const tgt = targetLang.value;

  translateBtn.disabled = true;
  translateBtn.textContent = '翻訳中...';
  translatorResult.hidden = true;
  translatorText.textContent = '';
  showStatus(translatorStatus, '⏳ 準備中...', 'info');

  try {
    // 同じ言語ペアならインスタンスを使い回す
    if (!cachedTranslator || cachedSrc !== src || cachedTgt !== tgt) {
      // 古いインスタンスを破棄してから新規作成
      destroyTranslator();

      cachedTranslator = await Translator.create({
        sourceLanguage: src,
        targetLanguage: tgt,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const percent = Math.round(e.loaded * 100);
            showStatus(translatorStatus,
              `⬇️ 言語パックをダウンロード中... ${percent}%`, 'info'
            );
          });
        },
      });
      cachedSrc = src;
      cachedTgt = tgt;
    }

    // フェーズ2: 翻訳中
    showStatus(translatorStatus, '🌐 翻訳中...', 'info');
    const result = await cachedTranslator.translate(text);

    // フェーズ3: 完了
    translatorText.textContent = result;
    translatorResult.hidden = false;
    showStatus(translatorStatus, '✅ 翻訳が完了しました。', 'success');
    translatorResult.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch (err) {
    // エラー時はキャッシュを破棄して次回クリーンに再作成できるようにする
    destroyTranslator();
    showStatus(translatorStatus,
      `❌ 翻訳中にエラーが発生しました: ${err.message}`, 'error'
    );
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = '翻訳する';
  }
}

translateBtn.addEventListener('click', translate);

// ─── 初期化 ──────────────────────────────────────────
checkSummarizerAvailability();
