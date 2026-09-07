# ✨ Gemini Nano AI Tools

Chrome の Built-in AI（Summarizer API / Translator API / Prompt API）を使って、テキストの要約・翻訳・対話をオンデバイスで実行する Web アプリケーション（PWA 対応）です。

すべての推論はローカルデバイス上の Gemini Nano で処理されるため、テキストデータが外部サーバーへ送信されることはありません。また、Service Worker によりオフライン環境でも動作します。

> [!NOTE]
> Gemini Nano のモデル本体は Chrome がブラウザプロセス側でキャッシュするため、モデル解放ボタンを押しても VRAM の使用量はすぐには減少しません。完全に VRAM を解放するには Chrome を終了してください。

---

## 主な機能

### 1. 📝 要約 (Summarizer API)

- 貼り付けたテキストをオンデバイスで要約。
- **シンプルタブ**: 要約の長さ（Short / Medium / Long）のみ選ぶクイック設定。
- **詳細設定タブ**:
  - **タイプ**: `key-points`（箇条書き）、`tldr`（要約文）、`teaser`（導入文）、`headline`（見出し）
  - **フォーマット**: `plain-text`、`markdown`
  - **長さ**: `short`、`medium`、`long`

### 2. 🌐 翻訳 (Translator API)

- テキストをオンデバイスで多言語翻訳。
- 対応言語: 日本語、英語、スペイン語、フランス語、ドイツ語、中国語（簡体・繁体）、韓国語、ロシア語、ヒンディー語、アラビア語など。
- 言語パック未ダウンロード時のダウンロード進捗表示。
- 翻訳モデルのインスタンスを破棄する「🗑️ モデルを解放」ボタン付き。

### 3. 💬 対話 (Prompt API / LanguageModel)

- `LanguageModel` によるオンデバイスチャット。
- **マルチセッション管理**: サイドバーから「＋ 新規チャット」を作成し、複数の会話を個別に切り替え・削除可能。
- 現在は不具合回避のため実装を廃止しています。修復し次第有効になります ~~**ストリーミング応答**: `promptStreaming()` によるリアルタイム出力と点滅カーソル表示。~~
- **履歴の永続化**: 会話履歴は `localStorage` に保存され、ブラウザを再起動しても `initialPrompts` により文脈を復元。
- タイトル自動設定（最初の発言の先頭20文字）。

### 4. 📱 オフライン / PWA 対応

- `manifest.json` および Service Worker (`sw.js`) によるアプリシェルのキャッシュ。
- オフライン時でもアプリの起動・オンデバイス AI の実行が可能。

---

## 動作環境

| 要件         | 詳細                                                         |
| ------------ | ------------------------------------------------------------ |
| ブラウザ     | Chrome 138 以降（デスクトップ版）                            |
| OS           | Windows 10/11、macOS 13+、Linux                              |
| ストレージ   | Chrome プロファイルがあるドライブに 22 GB 以上の空き容量     |
| ハードウェア | GPU: VRAM 4 GB 超（または CPU: RAM 16 GB 以上 / 4 コア以上） |
| ネットワーク | 初回の AI モデル・言語パックのダウンロード時のみ必要         |

---

## セットアップ

### 1. Chrome Flags の有効化

`chrome://flags` を開き、以下のフラグを **Enabled** に設定して Chrome を再起動します。

- `chrome://flags/#prompt-api-for-gemini-nano`
- `chrome://flags/#summarization-api-for-gemini-nano` (Summarizer を利用する場合)
- `chrome://flags/#translation-api` (Translator を利用する場合)

### 2. モデルのダウンロード

`chrome://components` を開き、**Optimization Guide On Device Model** の「アップデートを確認」をクリックしてダウンロードします。

### 3. 動作確認

Chrome DevTools のコンソールで以下を実行し、利用可能か確認します。

```js
// 要約 API
await Summarizer.availability();

// 翻訳 API (例: ja -> en)
await Translator.availability({ sourceLanguage: "ja", targetLanguage: "en" });

// 対話 API
await LanguageModel.availability({
  expectedInputs: [{ type: "text", languages: ["ja", "en"] }],
  expectedOutputs: [{ type: "text", languages: ["ja", "en"] }],
});
```

`"available"` または `"readily"` 等が返れば準備完了です。

---

## 起動方法

`index.html` をローカルサーバー経由（または直接 Chrome）で開きます。PWA や Service Worker を完全に機能させるには `localhost` 等の HTTP サーバー経由を推奨します。

```bash
# Node.js (npx) を使う場合
npx serve .

# Python を使う場合
python -m http.server 8000
```

ブラウザで `http://localhost:8000`（または該当ポート）にアクセスします。

---

## ファイル構成

```
summarizer-app/
├── index.html       # UI構造（要約・翻訳・対話の各ページ）
├── style.css        # 全体レイアウト・タブ・チャットUIスタイル
├── app.js           # Built-in AI (Summarizer / Translator / Prompt API) ロジック
├── sw.js            # Service Worker（オフラインキャッシュ管理）
├── manifest.json    # PWA マニフェスト設定
└── README.md        # プロジェクトドキュメント
```

---

## トラブルシューティング

### `Summarizer / Translator / LanguageModel is not defined`

Chrome のバージョンが対応バージョン未満か、`chrome://flags` の該当フラグが有効化されていない可能性があります。

### `The model process crashed too many times`

Gemini Nano のモデルプロセスがクラッシュしている状態です。

1. `chrome://crashes` でクラッシュレポートを確認・削除
2. Chrome を完全に終了（タスクマネージャーからバックグラウンドプロセス含め終了）して再起動
3. `chrome://on-device-internals` でモデルの状態を確認

### `unavailable` が返る

ハードウェア要件（VRAM 4GB 超、または RAM 16GB 以上、空き容量 22GB 以上）を満たしていないか、OS/デバイス制限で無効化されている可能性があります。

---

## 参考リンク

- [Prompt API - Chrome for Developers](https://developer.chrome.com/docs/ai/prompt-api)
- [Summarizer API - Chrome for Developers](https://developer.chrome.com/docs/ai/summarizer-api)
- [Translator API - Chrome for Developers](https://developer.chrome.com/docs/ai/translator-api)
- [Built-in AI Overview](https://developer.chrome.com/docs/ai/built-in)
