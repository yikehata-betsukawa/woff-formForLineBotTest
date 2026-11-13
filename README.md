# woff-formForLineBotTest

LINE WORKS の WOFF（LINE WORKS Front-end Framework）アプリ群を GitHub Pages（`/docs`）でホストするためのフロントエンドリポジトリです。  
各画面はそれぞれ異なる LINE WORKS アプリ（WOFF ID）およびバックエンド FastAPI に紐づいています。

- **公開ベース URL（GitHub Pages）:** `https://yikehata-betsukawa.github.io/woff-formForLineBotTest/`

---

## 1. アプリ・WOFF 紐づけ一覧

| 画面（HTML） | 用途・対象システム | WOFF ID | 接続先バックエンド API | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| **`drainage_search.html`** | **塗装設備・排水処理場 センサ監視**<br>（70項目の最新値・履歴データ検索） | `TF0C2aF3SEJFJpi6YixiGg` | `https://dev-bcreer.betsukawa.co.jp/vision_api_new/woff/...` | **本番・現行用**<br>（Bot ID: `13615513` / Port 8020） |
| **`machine_search.html`** | **環境センサー・設備検索（旧・参考版）**<br>（最新値・履歴検索＋トークルーム送信） | `xexAR6FBXSkjXao8xQ7Wvg` | `https://dev-bcreer.betsukawa.co.jp/vision_api/woff/...` | 従来環境（Port 8010 等）の Bot / WOFF アプリに紐づけ |
| **`index.html`** | **研修用 WOFF フォーム**<br>（プロフィール取得・備品申請等のテスト） | *(アプリ側の WOFF ID)* | なし（LINE WORKS トーク送信テスト用） | `app.js` / `style.css` を使用 |
| `sample_*.js` 関連 | WOFF SDK 動作確認用サンプル | *(各検証用 WOFF ID)* | なし | `woff.init` / `getDecodedIDToken` 等の単体検証用 |

---

## 2. フォルダ・ファイル構成

GitHub Pages の公開対象である `docs/` 配下の構成です。

```text
woff-formForLineBotTest/
├── README.md                         # 本ドキュメント（アプリ紐づけ・構成管理）
└── docs/                             # GitHub Pages 公開ルート
    ├── drainage_search.html          # 【現行】塗装設備・排水処理場 検索画面（HTML）
    ├── machine_search.html           # 【旧版】設備・環境センサー 検索画面（HTML）
    ├── index.html                    # 【研修】WOFF 入力フォーム画面（HTML）
    │
    ├── css/
    │   ├── drainage_search.css       # drainage_search.html 専用スタイルシート
    │   ├── machine_search.css        # machine_search.html 専用スタイルシート
    │   └── style.css                 # index.html（研修用フォーム）用スタイルシート
    │
    └── js/
        ├── drainage_search.js        # 【現行】排水処理場70項目検索ロジック（WOFF ID: TF0C2aF3SEJFJpi6YixiGg）
        ├── machine_search.js         # 【旧版】センサーツリー検索・Flex送信ロジック（WOFF ID: xexAR6FBXSkjXao8xQ7Wvg）
        ├── app.js                    # index.html（研修用フォーム）用ロジック
        ├── app_simple.js             # 研修用フォーム簡易版ロジック
        ├── sample_03.js              # WOFF SDK 検証サンプル
        ├── sample_form_index.js      # WOFF フォーム検証サンプル
        ├── sample_getDecodedIDToken.js # IDトークンデコード検証サンプル
        ├── sample_index.js           # WOFF 初期化検証サンプル
        └── sample02.js               # WOFF 動作検証サンプル