// 発行された WOFF ID
// machine_search.js の先頭付近
const WOFF_ID = "xexAR6FBXSKjXao8xQ7Wvg";

// バックエンド FastAPI のベース URL (サーバーの公開 HTTPS アドレスを指定)
// ★ ドメイン名のみを指定（末尾のスラッシュなし）
const API_BASE_URL = "https://dev-bcreer.betsukawa.co.jp";

// 画面上にデバッグ・エラーメッセージを表示する補助関数
function showDebugError(message) {
    const summaryEl = document.getElementById("resultSummary");
    const resultCard = document.getElementById("resultCard");
    
    if (resultCard) resultCard.style.display = "block";
    if (summaryEl) {
        summaryEl.style.color = "#d9534f";
        summaryEl.style.fontWeight = "bold";
        summaryEl.innerText = "【エラー】 " + message;
    }
}

// 予期せぬ JavaScript エラーのグローバルキャッチ
window.onerror = function (msg, url, line) {
    showDebugError(`${msg} (Line: ${line})`);
    return false;
};

// メイン初期化処理
async function initWoffApp() {
    try {
        // 1. 日付の初期設定 (本日 & 昨日)
        initDates();

        // 2. ラジオボタン切替イベントの登録 (*ngIf 同等ロジック)
        setupModeToggle();

        // 3. 検索ボタンのイベント登録
        const searchBtn = document.getElementById("searchBtn");
        if (searchBtn) {
            searchBtn.addEventListener("click", fetchData);
        }

        // 4. WOFF SDK 初期化
        if (typeof woff !== "undefined") {
            await woff.init({ woffId: WOFF_ID });
            console.log("WOFF 初期化成功");

            // ログインチェックとプロフィール取得（必要に応じてログ出力や画面表示に活用）
            if (woff.isLoggedIn()) {
                const profile = await woff.getProfile();
                console.log("ログインユーザー:", profile.displayName, profile.userId);
            }
        }
    } catch (err) {
        const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
        console.error("WOFF 初期化エラー:", errDetail);
    }
}

// 日付初期化処理
function initDates() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const startDateElem = document.getElementById("startDate");
    const endDateElem = document.getElementById("endDate");

    if (endDateElem) endDateElem.value = today;
    if (startDateElem) startDateElem.value = yesterday.toISOString().split('T')[0];
}

// 検索モードラジオボタンの切替制御
function setupModeToggle() {
    const radioButtons = document.querySelectorAll('input[name="searchMode"]');
    const dateArea = document.getElementById('dateArea');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            if (dateArea) {
                dateArea.style.display = (this.value === 'history') ? 'block' : 'none';
            }
        });
    });
}

// バックエンド API 呼び出し
async function fetchData() {
    const mode = document.querySelector('input[name="searchMode"]:checked').value;
    const sensorInput = document.getElementById("sensorInput");
    const sensorName = sensorInput ? sensorInput.value.trim() : "";

    if (!sensorName) {
        alert("センサー項目名を入力してください。");
        return;
    }

    let searchUrl = "";
    if (mode === "latest") {
        searchUrl = `${API_BASE_URL}/vision_api/woff/latest?sensor_name=${encodeURIComponent(sensorName)}`;
    } else {
        const start = document.getElementById("startDate").value;
        const end = document.getElementById("endDate").value;
        if (!start || !end) {
            alert("開始日と終了日を指定してください。");
            return;
        }
        searchUrl = `${API_BASE_URL}/vision_api/woff/search?sensor_name=${encodeURIComponent(sensorName)}&start_date=${start}&end_date=${end}`;
    }

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`HTTPステータスエラー: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            renderResult(mode, result);
        } else {
            showDebugError(result.message || "データの取得に失敗しました。");
        }
    } catch (err) {
        const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
        showDebugError("通信エラーが発生しました: " + errDetail);
    }
}

// 検索結果描画
function renderResult(mode, result) {
    const resultCard = document.getElementById("resultCard");
    const summary = document.getElementById("resultSummary");
    const container = document.getElementById("resultContent");

    if (resultCard) resultCard.style.display = "block";
    if (summary) {
        summary.style.color = "#555";
        summary.style.fontWeight = "normal";
    }

    if (mode === "latest") {
        summary.innerText = `⚡ ${result.sensor_name} (最新値)`;
        container.innerHTML = `
            <div style="background:#f8f9fa; border-left:4px solid #00c73c; padding:12px; border-radius:4px;">
                <p style="font-size:18px; font-weight:bold; margin:0 0 8px 0;">現在値: ${result.value} ${result.unit || ''}</p>
                <p style="font-size:12px; color:#666; margin:0;">更新日時: ${result.datetime}</p>
            </div>
        `;
    } else {
        summary.innerText = `📈 ${result.sensor_name} (${result.period})`;
        let tableHtml = `
            <table>
                <thead>
                    <tr><th>日時</th><th>値</th></tr>
                </thead>
                <tbody>
        `;
        if (result.data && result.data.length > 0) {
            result.data.forEach(item => {
                tableHtml += `<tr><td>${item.datetime}</td><td>${item.value} ${item.unit || ''}</td></tr>`;
            });
        } else {
            tableHtml += `<tr><td colspan="2">該当期間のデータが見つかりませんでした</td></tr>`;
        }
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;
    }
}

// DOM読み込み完了時に実行
document.addEventListener("DOMContentLoaded", initWoffApp);