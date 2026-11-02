// Developer Console で発行された WOFF ID
const WOFF_ID = "xexAR6FBXSKjXao8xQ7Wvg";

// バックエンド FastAPI のベース URL (サーバーの公開 HTTPS アドレスを指定)
const API_BASE_URL = "https://YOUR_FASTAPI_SERVER_DOMAIN";

document.addEventListener("DOMContentLoaded", function () {
    // 1. WOFF SDK 初期化
    woff.init({ woffId: WOFF_ID })
        .then(() => {
            console.log("WOFF 初期化成功");
            initDates();
        })
        .catch((err) => {
            console.error("WOFF 初期化失敗:", err);
            initDates(); // エラー時も開発用に日付だけ補完
        });

    // 2. 検索ボタンのイベント登録
    document.getElementById("searchBtn").addEventListener("click", fetchData);
});

// 初期日付（本日・昨日）の設定
function initDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("endDate").value = today;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    document.getElementById("startDate").value = yesterday.toISOString().split('T')[0];
}

// データ検索 API 呼び出し
async function fetchData() {
    const sensor = document.getElementById("sensorSelect").value;
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    if (!start || !end) {
        alert("開始日と終了日を指定してください。");
        return;
    }

    const searchUrl = `${API_BASE_URL}/woff_api/search?sensor_name=${encodeURIComponent(sensor)}&start_date=${start}&end_date=${end}`;

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            renderResult(result);
        } else {
            alert("データの取得に失敗しました。");
        }
    } catch (err) {
        console.error("Fetch エラー:", err);
        alert("通信エラーが発生しました: " + err.message);
    }
}

// 検索結果の描画
function renderResult(result) {
    document.getElementById("resultCard").style.display = "block";
    document.getElementById("resultSummary").innerText = `${result.sensor_name} (${result.period})`;

    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    if (result.data && result.data.length > 0) {
        result.data.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${item.datetime}</td><td>${item.value} ${item.unit || ''}</td>`;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = "<tr><td colspan='2'>該当期間のデータが見つかりませんでした</td></tr>";
    }
}