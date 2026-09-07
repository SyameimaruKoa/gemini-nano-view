/**
 * Gemini Nano AI Tools
 * Chrome Built-in AI の Summarizer / Translator / Prompt API を使って
 * テキストの要約・翻訳・対話をオンデバイスで行うアプリ
 *
 * 対応: Chrome 138+ (Summarizer / Translator / LanguageModel グローバル API)
 */

// ─── DOM 参照: グローバルナビ・ヘッダー ────────────────
const offlineBanner    = document.getElementById('offline-banner');
const navSummarizerBtn = document.getElementById('nav-summarizer');
const navTranslatorBtn = document.getElementById('nav-translator');
const navChatBtn       = document.getElementById('nav-chat');
const pageSummarizer   = document.getElementById('page-summarizer');
const pageTranslator   = document.getElementById('page-translator');
const pageChatEl       = document.getElementById('page-chat');

// ─── DOM 参照: 要約 ──────────────────────────────────
const summarizerStatus = document.getElementById('summarizer-status-area');
const inputText        = document.getElementById('input-text');
const summarizeBtn     = document.getElementById('summarize-btn');
const summarizerResult = document.getElementById('summarizer-result-section');
const summarizerText   = document.getElementById('summarizer-result-text');
const tabSimpleBtn     = document.getElementById('tab-simple');
const tabDetailBtn     = document.getElementById('tab-detail');
const panelSimple      = document.getElementById('panel-simple');
const panelDetail      = document.getElementById('panel-detail');
const detailType       = document.getElementById('detail-type');
const detailFormat     = document.getElementById('detail-format');
const detailLength     = document.getElementById('detail-length');

// ─── DOM 参照: 翻訳 ──────────────────────────────────
const translatorStatus = document.getElementById('translator-status-area');
const sourceLang       = document.getElementById('source-lang');
const targetLang       = document.getElementById('target-lang');
const translateInput   = document.getElementById('translate-input');
const translateBtn     = document.getElementById('translate-btn');
const translatorResult = document.getElementById('translator-result-section');
const translatorText   = document.getElementById('translator-result-text');

// ─── DOM 参照: 対話 ──────────────────────────────────
const chatStatusEl   = document.getElementById('chat-status-area');
const chatNewBtn     = document.getElementById('chat-new-btn');
const chatListEl     = document.getElementById('chat-list');
const chatMessagesEl = document.getElementById('chat-messages');
const chatInputEl    = document.getElementById('chat-input');
const chatSendBtn    = document.getElementById('chat-send-btn');
const chatDeleteBtn  = document.getElementById('chat-delete-btn');

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
  navSummarizerBtn.classList.toggle('active', pageId === 'page-summarizer');
  navTranslatorBtn.classList.toggle('active', pageId === 'page-translator');
  navChatBtn.classList.toggle('active',       pageId === 'page-chat');

  pageSummarizer.hidden = pageId !== 'page-summarizer';
  pageTranslator.hidden = pageId !== 'page-translator';
  pageChatEl.hidden     = pageId !== 'page-chat';

  if (pageId === 'page-translator') checkTranslatorAvailability();
  if (pageId === 'page-chat')       checkChatAvailability();
}

navSummarizerBtn.addEventListener('click', () => activatePage('page-summarizer'));
navTranslatorBtn.addEventListener('click', () => activatePage('page-translator'));
navChatBtn.addEventListener('click',       () => activatePage('page-chat'));

// ─── モデル解放 ──────────────────────────────────────
const releaseBtn = document.getElementById('release-btn');

function releaseAllModels() {
  destroyTranslator();
  showStatus(translatorStatus, '🗑️ 翻訳モデルを解放しました。', 'success');
  setTimeout(() => clearStatus(translatorStatus), 2500);
}

releaseBtn.addEventListener('click', releaseAllModels);

// ════════════════════════════════════════════════════
// 要約
// ════════════════════════════════════════════════════

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

function syncLength(toTabId) {
  if (toTabId === 'tab-detail') {
    const checked = document.querySelector('input[name="length-simple"]:checked');
    if (checked) detailLength.value = checked.value;
  } else {
    const radio = document.querySelector(`input[name="length-simple"][value="${detailLength.value}"]`);
    if (radio) radio.checked = true;
  }
}

tabSimpleBtn.addEventListener('click', () => activateTab('tab-simple'));
tabDetailBtn.addEventListener('click', () => activateTab('tab-detail'));

function getSummarizerOptions() {
  if (panelSimple.classList.contains('active')) {
    const checked = document.querySelector('input[name="length-simple"]:checked');
    return { type: 'key-points', format: 'plain-text', length: checked ? checked.value : 'medium' };
  }
  return { type: detailType.value, format: detailFormat.value, length: detailLength.value };
}

async function checkSummarizerAvailability() {
  if (!('Summarizer' in self)) {
    showStatus(summarizerStatus, '⚠️ このブラウザは Summarizer API に対応していません。Chrome 138 以降をお使いください。', 'error');
    return;
  }
  try {
    const availability = await Summarizer.availability();
    if (availability === 'unavailable') {
      showStatus(summarizerStatus, '❌ この環境では Summarizer API を利用できません。必要要件: VRAM 4GB 超 または RAM 16GB 以上 / ストレージ 22GB 以上の空き', 'error');
      return;
    }
    summarizeBtn.disabled = false;
    if (availability === 'downloadable' || availability === 'downloading') {
      showStatus(summarizerStatus, '⬇️ AI モデルが未ダウンロードです。「要約する」を押すとダウンロードが始まります。', 'warning');
    } else {
      showStatus(summarizerStatus, '✅ Summarizer API が利用可能です。', 'success');
      setTimeout(() => clearStatus(summarizerStatus), 2500);
    }
  } catch (err) {
    showStatus(summarizerStatus, `❌ API の確認中にエラーが発生しました: ${err.message}`, 'error');
  }
}

async function summarize() {
  const text = inputText.value.trim();
  if (!text) { showStatus(summarizerStatus, '⚠️ テキストを入力してください。', 'warning'); inputText.focus(); return; }
  const options = getSummarizerOptions();
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = '要約中...';
  summarizerResult.hidden = true;
  summarizerText.textContent = '';
  showStatus(summarizerStatus, '⏳ 準備中...', 'info');
  let summarizer = null;
  try {
    summarizer = await Summarizer.create({
      type: options.type, format: options.format, length: options.length,
      outputLanguage: 'ja', expectedInputLanguages: ['ja', 'en'],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          showStatus(summarizerStatus, `⬇️ モデルをダウンロード中... ${Math.round(e.loaded * 100)}%`, 'info');
        });
      },
    });
    showStatus(summarizerStatus, '🤖 推論中...', 'info');
    const summary = await summarizer.summarize(text);
    summarizerText.textContent = summary;
    summarizerResult.hidden = false;
    showStatus(summarizerStatus, '✅ 要約が完了しました。', 'success');
    summarizerResult.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch (err) {
    showStatus(summarizerStatus, `❌ 要約中にエラーが発生しました: ${err.message}`, 'error');
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

function getEffectiveSourceLang() {
  return sourceLang.value === 'auto' ? 'en' : sourceLang.value;
}

let cachedTranslator = null;
let cachedSrc = null;
let cachedTgt = null;

function destroyTranslator() {
  if (cachedTranslator) { cachedTranslator.destroy(); cachedTranslator = null; cachedSrc = null; cachedTgt = null; }
}

async function checkTranslatorAvailability() {
  destroyTranslator();
  if (!('Translator' in self)) {
    showStatus(translatorStatus, '⚠️ このブラウザは Translator API に対応していません。Chrome 138 以降をお使いください。', 'error');
    translateBtn.disabled = true; return;
  }
  try {
    const src = getEffectiveSourceLang();
    const tgt = targetLang.value;
    if (src === tgt) { showStatus(translatorStatus, '⚠️ ソース言語と翻訳先が同じです。', 'warning'); translateBtn.disabled = true; return; }
    const availability = await Translator.availability({ sourceLanguage: src, targetLanguage: tgt });
    if (availability === 'unavailable') {
      showStatus(translatorStatus, `❌ ${src} → ${tgt} の翻訳はこの環境で利用できません。`, 'error');
      translateBtn.disabled = true; return;
    }
    translateBtn.disabled = false;
    if (availability === 'downloadable' || availability === 'downloading') {
      showStatus(translatorStatus, '⬇️ 言語パックが未ダウンロードです。「翻訳する」を押すとダウンロードが始まります。', 'warning');
    } else {
      showStatus(translatorStatus, '✅ Translator API が利用可能です。', 'success');
      setTimeout(() => clearStatus(translatorStatus), 2500);
    }
  } catch (err) {
    showStatus(translatorStatus, `❌ API の確認中にエラーが発生しました: ${err.message}`, 'error');
    translateBtn.disabled = true;
  }
}

sourceLang.addEventListener('change', checkTranslatorAvailability);
targetLang.addEventListener('change', checkTranslatorAvailability);

async function translate() {
  const text = translateInput.value.trim();
  if (!text) { showStatus(translatorStatus, '⚠️ テキストを入力してください。', 'warning'); translateInput.focus(); return; }
  const src = getEffectiveSourceLang();
  const tgt = targetLang.value;
  translateBtn.disabled = true;
  translateBtn.textContent = '翻訳中...';
  translatorResult.hidden = true;
  translatorText.textContent = '';
  showStatus(translatorStatus, '⏳ 準備中...', 'info');
  try {
    if (!cachedTranslator || cachedSrc !== src || cachedTgt !== tgt) {
      destroyTranslator();
      cachedTranslator = await Translator.create({
        sourceLanguage: src, targetLanguage: tgt,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            showStatus(translatorStatus, `⬇️ 言語パックをダウンロード中... ${Math.round(e.loaded * 100)}%`, 'info');
          });
        },
      });
      cachedSrc = src; cachedTgt = tgt;
    }
    showStatus(translatorStatus, '🌐 翻訳中...', 'info');
    const result = await cachedTranslator.translate(text);
    translatorText.textContent = result;
    translatorResult.hidden = false;
    showStatus(translatorStatus, '✅ 翻訳が完了しました。', 'success');
    translatorResult.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch (err) {
    destroyTranslator();
    showStatus(translatorStatus, `❌ 翻訳中にエラーが発生しました: ${err.message}`, 'error');
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = '翻訳する';
  }
}

translateBtn.addEventListener('click', translate);

// ════════════════════════════════════════════════════
// 対話（チャット）
// ════════════════════════════════════════════════════

const chats = new Map(); // id → { id, title, session, messages: [{role, content}] }
let activeChatId   = null;
let chatAvailable  = false;
let chatInitialized = false;

const STORAGE_KEY = 'ai-tools-chats';

// ─── ストレージ ──────────────────────────────────────
function saveChatsToStorage() {
  const data = [...chats.values()].map(({ id, title, messages }) => ({ id, title, messages }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function loadChatsFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let saved;
  try { saved = JSON.parse(raw); } catch { return; }
  if (!Array.isArray(saved) || saved.length === 0) return;

  showStatus(chatStatusEl, '💬 チャット履歴を復元中...', 'info');
  for (const { id, title, messages } of saved) {
    try {
      const session = await createSession(messages);
      chats.set(id, { id, title, session, messages: [...messages] });
      addSidebarItem(id, title);
    } catch (err) {
      console.warn(`チャット ${id} の復元に失敗:`, err);
    }
  }
  clearStatus(chatStatusEl);
  if (chats.size > 0) activateChat([...chats.keys()][0]);
}

// ─── セッション生成 ──────────────────────────────────
async function createSession(initialMessages = []) {
  const initPrompts = [
    { role: 'system', content: 'You are a helpful and friendly assistant. Always respond in the same language as the user\'s message. If the user writes in Japanese, respond in Japanese.' },
    ...initialMessages.map(({ role, content }) => ({ role, content })),
  ];

  const session = await LanguageModel.create({
    initialPrompts: initPrompts,
    expectedInputs:  [{ type: 'text', languages: ['ja', 'en'] }],
    expectedOutputs: [{ type: 'text', languages: ['ja', 'en'] }],
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        showStatus(chatStatusEl, `⬇️ モデルをダウンロード中... ${Math.round(e.loaded * 100)}%`, 'info');
      });
    },
  });

  session.addEventListener('contextoverflow', () => {
    showStatus(chatStatusEl, '⚠️ コンテキストが上限に達しました。古いメッセージが削除されます。', 'warning');
    setTimeout(() => clearStatus(chatStatusEl), 4000);
  });

  return session;
}

// ─── API 対応確認 ────────────────────────────────────
async function checkChatAvailability() {
  if (chatInitialized) return;
  chatInitialized = true;

  if (!('LanguageModel' in self)) {
    showStatus(chatStatusEl, '⚠️ このブラウザは Prompt API に対応していません。Chrome 138 以降をお使いください。', 'error');
    return;
  }

  try {
    const availability = await LanguageModel.availability({
      expectedInputs:  [{ type: 'text', languages: ['ja', 'en'] }],
      expectedOutputs: [{ type: 'text', languages: ['ja', 'en'] }],
    });

    if (availability === 'unavailable') {
      showStatus(chatStatusEl, '❌ この環境では Prompt API を利用できません。必要要件: VRAM 4GB 超 または RAM 16GB 以上', 'error');
      return;
    }

    chatAvailable = true;
    chatNewBtn.disabled = false;

    if (availability === 'downloadable' || availability === 'downloading') {
      showStatus(chatStatusEl, '⬇️ AI モデルが未ダウンロードです。「新規チャット」を押すとダウンロードが始まります。', 'warning');
    } else {
      showStatus(chatStatusEl, '✅ Prompt API が利用可能です。', 'success');
      setTimeout(() => clearStatus(chatStatusEl), 2500);
    }

    await loadChatsFromStorage();
  } catch (err) {
    showStatus(chatStatusEl, `❌ API の確認中にエラーが発生しました: ${err.message}`, 'error');
  }
}

// ─── サイドバー項目 ──────────────────────────────────
function addSidebarItem(id, title) {
  const li = document.createElement('li');
  li.className = 'chat-list-item';
  li.dataset.id = id;
  li.textContent = title;
  li.addEventListener('click', () => activateChat(id));
  chatListEl.appendChild(li);
}

function updateSidebarTitle(id, title) {
  const li = chatListEl.querySelector(`[data-id="${id}"]`);
  if (li) li.textContent = title;
}

// ─── チャット作成 ────────────────────────────────────
async function createChat() {
  if (!chatAvailable) return;
  chatNewBtn.disabled = true;
  showStatus(chatStatusEl, '⏳ セッションを作成中...', 'info');
  try {
    const id = `chat-${Date.now()}`;
    const title = `チャット ${chats.size + 1}`;
    const session = await createSession([]);
    chats.set(id, { id, title, session, messages: [] });
    addSidebarItem(id, title);
    saveChatsToStorage();
    activateChat(id);
    clearStatus(chatStatusEl);
  } catch (err) {
    showStatus(chatStatusEl, `❌ セッションの作成に失敗しました: ${err.message}`, 'error');
  } finally {
    chatNewBtn.disabled = false;
  }
}

// ─── チャット切り替え ────────────────────────────────
function activateChat(id) {
  activeChatId = id;
  chatListEl.querySelectorAll('.chat-list-item').forEach((li) => {
    li.classList.toggle('active', li.dataset.id === id);
  });
  chatMessagesEl.innerHTML = '';
  const chat = chats.get(id);
  if (!chat) return;
  if (chat.messages.length === 0) {
    renderEmptyChat();
  } else {
    chat.messages.forEach(({ role, content }) => renderBubble(role, content));
    scrollChatToBottom();
  }
  chatInputEl.disabled = false;
  chatSendBtn.disabled = false;
  chatDeleteBtn.disabled = false;
  chatInputEl.focus();
}

function renderEmptyChat() {
  const el = document.createElement('div');
  el.className = 'chat-empty';
  el.textContent = 'メッセージを入力してください';
  chatMessagesEl.appendChild(el);
}

// ─── チャット削除 ────────────────────────────────────
function deleteChat() {
  if (!activeChatId) return;
  const id = activeChatId;
  const chat = chats.get(id);
  if (chat?.session) chat.session.destroy();
  chats.delete(id);
  const li = chatListEl.querySelector(`[data-id="${id}"]`);
  if (li) li.remove();
  saveChatsToStorage();
  if (chats.size > 0) {
    activateChat([...chats.keys()][0]);
  } else {
    activeChatId = null;
    chatMessagesEl.innerHTML = '';
    renderEmptyChat();
    chatInputEl.disabled = true;
    chatSendBtn.disabled = true;
    chatDeleteBtn.disabled = true;
  }
}

// ─── 吹き出し描画 ────────────────────────────────────
function renderBubble(role, content) {
  const empty = chatMessagesEl.querySelector('.chat-empty');
  if (empty) empty.remove();
  const el = document.createElement('div');
  el.className = `message ${role === 'user' ? 'user' : 'ai'}`;
  el.textContent = content;
  chatMessagesEl.appendChild(el);
  return el;
}

function scrollChatToBottom() {
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// ─── メッセージ送信 ──────────────────────────────────
async function sendMessage() {
  const text = chatInputEl.value.trim();
  if (!text || !activeChatId) return;
  const chat = chats.get(activeChatId);
  if (!chat) return;

  chatInputEl.value = '';
  chatInputEl.disabled = true;
  chatSendBtn.disabled = true;

  chat.messages.push({ role: 'user', content: text });
  renderBubble('user', text);
  scrollChatToBottom();

  // 最初のメッセージからタイトルを自動設定
  if (chat.messages.length === 1) {
    const title = text.slice(0, 20) + (text.length > 20 ? '…' : '');
    chat.title = title;
    updateSidebarTitle(activeChatId, title);
  }

  const aiBubble = renderBubble('ai', '');
  aiBubble.classList.add('streaming');
  scrollChatToBottom();

  let fullText = '';
  try {
    const stream = chat.session.promptStreaming(text);
    for await (const chunk of stream) {
      if (chunk.startsWith(fullText)) {
        fullText = chunk; // 累積テキストの場合
      } else {
        fullText += chunk; // 差分（delta）の場合
      }
      aiBubble.textContent = fullText;
      scrollChatToBottom();
    }
  } catch (err) {
    aiBubble.textContent = `エラー: ${err.message}`;
    showStatus(chatStatusEl, `❌ 応答中にエラーが発生しました: ${err.message}`, 'error');
  } finally {
    aiBubble.classList.remove('streaming');
    if (fullText) {
      chat.messages.push({ role: 'assistant', content: fullText });
      saveChatsToStorage();
    }
    chatInputEl.disabled = false;
    chatSendBtn.disabled = false;
    chatInputEl.focus();
  }
}

// ─── イベントリスナー ────────────────────────────────
chatNewBtn.addEventListener('click', createChat);
chatSendBtn.addEventListener('click', sendMessage);
chatDeleteBtn.addEventListener('click', deleteChat);

chatInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ─── オフライン状態の監視 ─────────────────────────────
function updateOnlineStatus() {
  if (offlineBanner) {
    offlineBanner.hidden = navigator.onLine;
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ─── 初期化 ──────────────────────────────────────────
checkSummarizerAvailability();

// ─── Service Worker 登録 ─────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('Service Worker の登録に失敗しました:', err);
  });
}