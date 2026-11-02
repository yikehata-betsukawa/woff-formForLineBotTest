const WOFF_ID = "xexAR6FBXSKjXao8xQ7Wvg";
const API_BASE_URL = "https://YOUR_FASTAPI_SERVER_DOMAIN"; // FastAPI サーバーの公開ドメイン

document.addEventListener("DOMContentLoaded", function () {
    // 1. WOFF SDK 初期化
    woff.init({ woffId: WOFF_ID })
        .then(() => {
            console.log("WOFF 初期化成功");
            initDates();
        })
        .catch((err) => {
            console.error("WOFF 初期化失敗:", err);
            initDates();
        });

    // 2. ラジオボタン切替で日付フォームの表示/非表示を制御
    const radioButtons = document.querySelectorAll('input[name="searchMode"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            const dateArea = document.getElementById('dateArea');
            if (this.value === 'history') {
                dateArea.style.display = 'block';
            } else {
                dateArea.style.display = 'none';
            }
        });
    });

    // 3. 検索ボタンイベント
    document.getElementById("searchBtn").addEventListener("click", fetchData);
});

function initDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("endDate").value = today;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    document.getElementById("startDate").value = yesterday.toISOString().split('T')[0];
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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
            <div class="latest-box">
                <p style="font-size: 18px; font-weight: bold; margin: 0 0 8px 0;">現在値: ${result.value} ${result.unit || ''}</p>
                <p style="font-size: 12px; color: #666; margin: 0;">更新日時: ${result.datetime}</p>
            </div>
        `;
    } else {
        summary.innerText = `📈 ${result.sensor_name} (${result.period})`;
        let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>日時</th>
                        <th>値</th>
                    </tr>
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