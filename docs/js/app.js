// 発行された WOFF ID
const MY_WOFF_ID = "KkAAYi7e_cZvemizwWDjXA";
let currentUserProfile = null;

// 画面上にエラーメッセージを表示する関数
function showDebugError(message) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.classList.add("error-msg");
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
  const formEl = document.getElementById("woff-form"); // フォーム要素

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
       scope: "openid user.read",
       // （上記コードを開放するときはDeveloper Console 側の「OAuth Scopes」に openid を追加すること）
       redirectUri: window.location.origin + window.location.pathname // 現在のURLを明示的に指定
    });

    // 3. ログインチェック
    if (!woff.isLoggedIn()) {
      statusEl.innerText = "ログイン画面へ移動中...";
      woff.login(); // ← LINE WORKS のログイン画面（OAuth）へリダイレクト
      // showDebugError("非ログイン状態です。\nLINE WORKS アプリ内のトーク画面から開いてください。");
      return;
    }

    statusEl.innerText = "プロフィールを取得中...";

    // 4. プロフィール取得とグローバル変数への保持
    currentUserProfile = await woff.getProfile();

    if (currentUserProfile) {
      statusEl.style.display = "none";
      profileEl.style.display = "block";

      displayNameEl.innerText = currentUserProfile.displayName || "ゲスト";
      userIdEl.innerText = currentUserProfile.userId || "不明";
    }
  } catch (err) {
    const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
    showDebugError(`WOFF 処理エラー: ${errDetail}`);
  }
}

// 5. FastAPI へデータを送信する処理
async function handleFormSubmit(event) {
  event.preventDefault(); // フォーム送信時のページリロードを防止

  const resultEl = document.getElementById("result-message");
  const submitBtn = document.getElementById("submit-btn");

  if (!currentUserProfile) {
    alert("ユーザー情報が取得できていません。再読み込みしてください。");
    return;
  }

  // フォームの入力項目を取得（HTML側の id に合わせて調整してください）
  const titleVal = document.getElementById("title") ? document.getElementById("title").value : "";
  const detailVal = document.getElementById("detail") ? document.getElementById("detail").value : "";

  // FastAPI に送信する Payload（JSONデータ）の作成
  const payload = {
    userId: currentUserProfile.userId,
    displayName: currentUserProfile.displayName,
    title: titleVal,
    detail: detailVal
  };

  submitBtn.disabled = true;
  if (resultEl) {
    resultEl.className = "result-msg";
    resultEl.innerText = "送信中...";
  }

  try {
    // ★ ここに FastAPI のエンドポイント URL を指定します
    const FASTAPI_ENDPOINT = "https://your-fastapi-server.com/api/send-message";

    const response = await fetch(FASTAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP エラー! ステータス: ${response.status}`);
    }

    const data = await response.json();
    if (resultEl) {
      resultEl.classList.add("success");
      resultEl.innerText = "正常に送信されました！";
    }
  } catch (err) {
    console.error("送信エラー:", err);
    if (resultEl) {
      resultEl.classList.add("error");
      resultEl.innerText = "送信に失敗しました: " + err.message;
    }
  } finally {
    submitBtn.disabled = false;
  }
}

// DOM読み込み完了後に実行
document.addEventListener("DOMContentLoaded", () => {
  initWoffApp();

  // フォームの送信イベントをキャッチ
  const formEl = document.getElementById("woff-form");
  if (formEl) {
    formEl.addEventListener("submit", handleFormSubmit);
  }
});