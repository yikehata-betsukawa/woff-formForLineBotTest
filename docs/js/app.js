// 発行された WOFF ID
const MY_WOFF_ID = "KkAAYi7e_cZvemizwWDjXA";

// 画面上にエラーを直接赤字で出力する関数
function showDebugError(message) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.style.color = "red";
    statusEl.style.fontWeight = "bold";
    statusEl.innerText = "【エラー発生】\n" + message;
  }
}

// JavaScript の予期せぬエラーを全捕捉して画面に表示
window.onerror = function(msg, url, line) {
  showDebugError(`${msg}\n(Line: ${line})`);
  return false;
};

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const profileEl = document.getElementById("profile");
  const displayNameEl = document.getElementById("display-name");
  const userIdEl = document.getElementById("user-id");

  statusEl.innerText = "WOFF SDK 初期化中...";

  // 1. WOFF SDK が読み込めているか確認
  if (typeof woff === "undefined") {
    showDebugError("woff.sdk.js が読み込まれていません。ネットワーク等を確認してください。");
    return;
  }

  // 2. WOFF SDK 初期化
  woff.init({ woffId: MY_WOFF_ID })
    .then(() => {
      statusEl.innerText = "ログイン状態をチェック中...";

      // 3. ログインチェック
      if (!woff.isLoggedIn()) {
        showDebugError("非ログイン状態です。LINE WORKS 内で開いてください。");
        return;
      }

      statusEl.innerText = "プロフィールを取得中...";

      // 4. プロフィール取得
      return woff.getProfile();
    })
    .then((profile) => {
      if (!profile) return;

      statusEl.style.display = "none";
      profileEl.style.display = "block";

      displayNameEl.innerText = profile.displayName || "ゲスト";
      userIdEl.innerText = profile.userId || "不明";
    })
    .catch((err) => {
      // WOFF API のエラーメッセージを表示
      const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
      showDebugError(`WOFF APIエラー: ${errDetail}`);
    });
});