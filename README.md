# Gemini Nano Summarizer

Chrome の Built-in AI（Summarizer API）を使って、テキストをオンデバイスで要約するシンプルな Web アプリです。

---

## 動作環境

| 要件 | 詳細 |
|------|------|
| ブラウザ | Chrome 138 以降（デスクトップ版） |
| OS | Windows 10/11、macOS 13+、Linux |
| ストレージ | Chrome プロファイルのドライブに 22 GB 以上の空き |
| GPU | VRAM 4 GB 超（または CPU: RAM 16 GB 以上 / 4 コア以上） |
| ネットワーク | モデルの初回ダウンロード時に必要 |

> Chrome for Android / iOS は現時点で未対応です。

---

## セットアップ

### 1. Gemini Nano を有効化する

`chrome://flags` を開き、以下のフラグを **Enabled** に設定して Chrome を再起動します。

```
chrome://flags/#prompt-api-for-gemini-nano
```

### 2. モデルをダウンロードする

`chrome://components` を開き、**Optimization Guide On Device Model** の「アップデートを確認」をクリックします。ダウンロードが完了するまで待ちます。

### 3. 動作確認

DevTools のコンソールで以下を実行し、`"available"` が返れば準備完了です。

```js
await Summarizer.availability();
```

---

## 起動方法

`index.html` を Chrome で直接開くか、ローカルサーバー経由で開きます。

```bash
# Node.js がある場合
npx serve .
```

---

## 使い方

1. テキストエリアに要約したいテキストを貼り付ける
2. 設定タブで要約の設定を選ぶ
3. **「要約する」** ボタンを押す
4. 推論完了後、画面下部に要約結果が表示される

---

## 設定オプション

### シンプルタブ

長さだけを選べます。タイプとフォーマットは自動的に最適な値が使われます。

| 設定 | 値 |
|------|----|
| タイプ | key-points（箇条書き）固定 |
| フォーマット | plain-text 固定 |
| 長さ | Short / **Medium**（デフォルト） / Long |

### 詳細設定タブ

3つの設定をすべて選択できます。タブを切り替えると長さの設定が引き継がれます。

#### タイプ

| 値 | 内容 | short | medium | long |
|----|------|-------|--------|------|
| `key-points` | 重要ポイントを箇条書きで抽出 | 3項目 | 5項目 | 7項目 |
| `tldr` | 要点を短くまとめる | 1文 | 3文 | 5文 |
| `teaser` | 興味を引く導入文 | 1文 | 3文 | 5文 |
| `headline` | 記事の見出し形式 | 12語 | 17語 | 22語 |

#### フォーマット

| 値 | 内容 |
|----|------|
| `plain-text` | プレーンテキスト |
| `markdown` | Markdown 形式 |

#### 長さ

`short` / `medium` / `long` の3段階。

---

## ファイル構成

```
summarizer-app/
├── index.html   # UI構造
├── style.css    # スタイル
├── app.js       # Summarizer API のロジック
└── README.md    # このファイル
```

---

## トラブルシューティング

### `Summarizer is not defined`
Chrome のバージョンが 138 未満です。Chrome を最新版にアップデートしてください。

### `The model process crashed too many times`
Gemini Nano のモデルプロセスがクラッシュしています。以下を試してください。

1. `chrome://crashes` を開いてクラッシュレポートをすべて削除
2. Chrome を完全終了して再起動
3. `chrome://on-device-internals` でモデルの状態を確認
4. `chrome://components` からモデルを再ダウンロード

### `unavailable` が返る
ハードウェア要件（VRAM / RAM / ストレージ）を満たしていない可能性があります。動作環境の要件を確認してください。

---

## 参考

- [Summarizer API - Chrome for Developers](https://developer.chrome.com/docs/ai/summarizer-api)
- [Built-in AI のはじめ方](https://developer.chrome.com/docs/ai/get-started)
