// 発行された WOFF ID
const MY_WOFF_ID = "KkAAYi7e_cZvemizwWDjXA";

// 画面上にエラーメッセージを表示する関数
function showDebugError(message) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.style.color = "red";
    statusEl.style.fontWeight = "bold";
    statusEl.innerText = "【エラー発生】\n" + message;
  }
}

// 予期せぬ JavaScript エラーのキャッチ
window.onerror = function(msg, url, line) {
  showDebugError(`${msg}\n(Line: ${line})`);
  return false;
};

// WOFF の初期化メイン処理
async function initWoffApp() {
  const statusEl = document.getElementById("status");
  const profileEl = document.getElementById("profile");
  const displayNameEl = document.getElementById("display-name");
  const userIdEl = document.getElementById("user-id");

  // 1. woff オブジェクトがロードされるまで最大3秒待機する
  let retryCount = 0;
  while (typeof woff === "undefined" && retryCount < 30) {
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms 待機
    retryCount++;
  }

  if (typeof woff === "undefined") {
    showDebugError("WOFF SDK の読み込みに失敗しました。ネットワーク状況を確認してください。");
    return;
  }

  try {
    statusEl.innerText = "WOFF SDK 初期化中...";

    // 2. SDK 初期化
    await woff.init({
       woffId: MY_WOFF_ID,
       //scope: ["openid", "user.read"] // ← PC/外部ブラウザ用に OIDC スコープを明示
       // （このコードを開放するときはDeveloper Console 側の「OAuth Scopes」に openid を追加すること）
    });

    // 3. ログインチェック
    if (!woff.isLoggedIn()) {
      statusEl.innerText = "ログイン画面へ移動中...";
      woff.login(); // ← LINE WORKS のログイン画面（OAuth）へリダイレクト
      // showDebugError("非ログイン状態です。\nLINE WORKS アプリ内のトーク画面から開いてください。");
      return;
    }

    statusEl.innerText = "プロフィールを取得中...";

    // 4. プロフィール取得
    const profile = await woff.getProfile();

    if (profile) {
      statusEl.style.display = "none";
      profileEl.style.display = "block";

      displayNameEl.innerText = profile.displayName || "ゲスト";
      userIdEl.innerText = profile.userId || "不明";
    }
  } catch (err) {
    const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
    showDebugError(`WOFF 処理エラー: ${errDetail}`);
  }
}

// DOM読み込み完了後に実行（load処理）
document.addEventListener("DOMContentLoaded", initWoffApp);