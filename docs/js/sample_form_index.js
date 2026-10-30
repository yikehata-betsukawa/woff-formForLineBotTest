const MY_WOFF_ID = "YOUR_WOFF_ID"; // ご自身のWOFF ID
let currentUserProfile = null;

window.onload = async function () {
  const statusEl = document.getElementById("status");
  const contentEl = document.getElementById("content");
  const userNameEl = document.getElementById("userName");

  try {
    // 1. WOFF 初期化
    await woff.init({
      woffId: MY_WOFF_ID,
      scope: "openid user.read",
      redirectUri: window.location.origin + window.location.pathname
    });

    // 2. ログインチェック
    if (!woff.isLoggedIn()) {
      statusEl.innerText = "ログイン画面へ移動中...";
      woff.login();
      return;
    }

    // 3. プロフィール取得
    currentUserProfile = await woff.getProfile();
    userNameEl.innerText = currentUserProfile.displayName;
    
    // 初期化成功：フォームを表示
    statusEl.style.display = "none";
    contentEl.style.display = "block";

  } catch (error) {
    console.error("WOFF Error:", error);
    statusEl.innerText = "【エラー発生】 WOFF 処理エラー: " + JSON.stringify(error);
  }
};

// 4. フォーム送信イベントの制御
document.getElementById("woffForm").addEventListener("submit", async function (e) {
  e.preventDefault(); // ページのリロードを防止

  const submitBtn = document.getElementById("submitBtn");
  const resultEl = document.getElementById("resultMessage");
  
  submitBtn.disabled = true;
  resultEl.innerText = "送信中...";

  // フォーム入力値の取得
  const formData = {
    userId: currentUserProfile.userId,        // WOFFから取得したユーザーID
    userName: currentUserProfile.displayName, // WOFFから取得したユーザー名
    title: document.getElementById("title").value,
    detail: document.getElementById("detail").value
  };

  console.log("送信データ:", formData);

  try {
    // 【ステップ2で連携】ここでバックエンドAPIへデータをPOSTします
    /*
    const response = await fetch("https://YOUR_BACKEND_API_ENDPOINT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    */

    // 一旦フロントエンドの確認用に成功メッセージを表示
    resultEl.style.color = "green";
    resultEl.innerText = "送信が完了しました！（※現在はコンソール出力のみ）";
    
  } catch (err) {
    resultEl.style.color = "red";
    resultEl.innerText = "送信エラーが発生しました。";
  } finally {
    submitBtn.disabled = false;
  }
});