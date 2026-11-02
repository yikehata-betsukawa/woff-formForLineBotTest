const WOFF_ID = "xexAR6FBXSKjXao8xQ7Wvg";
const API_BASE_URL = "https://YOUR_FASTAPI_SERVER_DOMAIN"; // FastAPI サーバーの公開 HTTPS URL

document.addEventListener("DOMContentLoaded", function () {
    // 日付の初期設定 (本日 & 昨日)
    initDates();

    // WOFF SDK 初期化
    if (typeof woff !== "undefined") {
        woff.init({ woffId: WOFF_ID })
            .then(() => console.log("WOFF 初期化成功"))
            .catch((err) => console.error("WOFF 初期化失敗:", err));
    }

    // ★ Angular の *ngIf 相当の表示切り替えロジック
    const radioButtons = document.querySelectorAll('input[name="searchMode"]');
    const dateArea = document.getElementById('dateArea');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'history') {
                dateArea.style.display = 'block';  // カレンダー表示
            } else {
                dateArea.style.display = 'none';   // 非表示
            }
        });
    });

    // 検索ボタンクリックイベント
    document.getElementById("searchBtn").addEventListener("click", fetchData);
});

function initDates() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startDateElem = document.getElementById("startDate");
    const endDateElem = document.getElementById("endDate");

    if (endDateElem) endDateElem.value = today;
    if (startDateElem) startDateElem.value = yesterday.toISOString().split('T')[0];
}

async function fetchData() {
    const mode = document.querySelector('input[name="searchMode"]:checked').value;
    const sensorName = document.getElementById("sensorInput").value.trim();

    if (!sensorName) {
        alert("センサー項目名を入力してください。");
        return;
    }

    let searchUrl = "";
    if (mode === "latest") {
        searchUrl = `${API_BASE_URL}/woff_api/latest?sensor_name=${encodeURIComponent(sensorName)}`;
    } else {
        const start = document.getElementById("startDate").value;
        const end = document.getElementById("endDate").value;
        if (!start || !end) {
            alert("開始日と終了日を指定してください。");
            return;
        }
        searchUrl = `${API_BASE_URL}/woff_api/search?sensor_name=${encodeURIComponent(sensorName)}&start_date=${start}&end_date=${end}`;
    }

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result.status === "success") {
            renderResult(mode, result);
        } else {
            alert("データの取得に失敗しました。");
        }
    } catch (err) {
        console.error("Fetch エラー:", err);
        alert("通信エラーが発生しました: " + err.message);
    }
}

function renderResult(mode, result) {
    document.getElementById("resultCard").style.display = "block";
    const summary = document.getElementById("resultSummary");
    const container = document.getElementById("resultContent");

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