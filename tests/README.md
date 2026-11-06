# 写真AIの検証

## 自動テスト

Node.js 22 以降で、リポジトリ直下から実行します。

```sh
node --test tests/*.test.cjs
```

モデルのダウンロードは不要です。以下を模擬モデルで確認します。

- 画像用・テキスト用モデルを分けて読み込み、q8 / WASM を指定する
- 候補名を最大8件ずつ処理し、同じ候補のテキスト特徴量を再利用する
- 写真を連続選択しても推論は直列に実行し、待機中は最新の写真のみ残す
- 上位5候補、読み込み・推論失敗後の再試行
- 3分のタイムアウト、古いジョブ・ワーカーからの通知の無視、画面を閉じた際の停止

## ブラウザテスト

Playwright 1.56.1 と Chromium を開発用にインストールして実行します。これらはアプリの実行時依存には追加しません。CIでのインストール手順は `.github/workflows/photo-ai-tests.yml` を参照してください。

```sh
node tests/browser-smoke.cjs
node tests/browser-smoke.cjs --real-model
```

既存の Chromium を使う場合は `CHROMIUM_PATH=/usr/bin/chromium` を指定できます。

通常モードはCDNへの通信を意図的に失敗させ、保存済み自治体・取り込み品目の文字検索・お気に入り・自治体切替・写真AI失敗後の再試行と文字検索への復帰を確認します。写真操作の前後でlocalStorageの保存値が同一であることも確認します。テストは独立したブラウザプロファイルの架空データで行い、利用者の保存データには触れません。

`--real-model` は追加で以下を確認します。CDN・Hugging Face・モデル配布先に接続できる環境が必要です。

1. 公開の猫の写真で、実際の `photo-worker.js` とMobileCLIP q8モデルをWASMで動かし、猫・犬・鳥のうち猫が最上位になること。
2. 同じ写真をアプリで選び、縮小・判別・5件のカタログ候補表示まで到達すること。

猫の写真はごみの品目写真ではないため、このテストは起動・推論・表示の疎通確認です。ごみの品目判別精度やiPhone Safariの動作を保証するテストではありません。

## モデル実装の根拠

配布元の[MobileCLIPモデルカード](https://huggingface.co/Xenova/mobileclip_s0)と[ONNXファイル一覧](https://huggingface.co/Xenova/mobileclip_s0/tree/main/onnx)に合わせ、`CLIPTextModelWithProjection` と `CLIPVisionModelWithProjection` を個別に読み込みます。一体型の `model_quantized.onnx` を要求する汎用pipelineは使いません。正規化したテキスト・画像特徴量の内積から候補を並べます。

## 今回のローカル検証結果

- Node.jsの模擬モデル・UI状態テスト6件：成功。
- Chromiumの通常モード：成功。文字検索・自治体切替・お気に入り・保存データの維持を確認。
- JavaScript構文チェック、差分の空白チェック：成功。
- 実モデルモード：公開の検証用写真の取得が実行環境のネットワーク制限でHTTP 403となり、推論は未実行。GitHub Actionsで同じ実モデルテストを実行する構成を追加。
- iPhone Safari実機：未検証。

アプリの `app.js`、`seed-data.js`、保存キー `gomi-dictionary-state-v1`、保存形式は変更していません。Service Workerの更新はアプリファイルのキャッシュ世代のみを変更します。
