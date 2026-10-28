// 発行された WOFF ID
const MY_WOFF_ID = "KkAAYi7e_cZvemizwWDjXA";

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const profileEl = document.getElementById("profile");
  const displayNameEl = document.getElementById("display-name");
  const userIdEl = document.getElementById("user-id");

  // WOFF SDK の初期化
  woff.init({ woffId: MY_WOFF_ID })
    .then(() => {
      // LINE WORKS 内の認証チェック
      if (!woff.isLoggedIn()) {
        statusEl.className = "status-msg error-msg";
        statusEl.innerText = "LINE WORKS アプリ内で実行してください（非ログイン状態です）。";
        return;
      }

      // プロフィール情報の取得
      return woff.getProfile();
    })
    .then((profile) => {
      if (!profile) return;

      // 表示の切り替え
      statusEl.style.display = "none";
      profileEl.style.display = "block";

      displayNameEl.innerText = profile.displayName || "ゲスト";
      userIdEl.innerText = profile.userId || "不明";
    })
    .catch((err) => {
      console.error("WOFF エラー詳細:", err);
      statusEl.className = "status-msg error-msg";
      statusEl.innerText = `WOFF読み込みエラー: ${err.message || err.code || "詳細不明"}`;
    });
});