// 今回の WOFF ID
const WOFF_ID = "TF0C2aF3SEJFJpi6YixiGg";

// バックエンド FastAPI のベース URL
const API_BASE_URL = "https://dev-bcreer.betsukawa.co.jp";

let allItems = [];
let categories = [];
let currentSearchResult = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

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

window.onerror = function (msg, url, line) {
    showDebugError(`${msg} (Line: ${line})`);
    return false;
};

document.addEventListener("DOMContentLoaded", initWoffApp);

async function initWoffApp() {
    try {
        // 1. WOFF SDK 初期化（Scopeエラーを防ぐため woff.login() は呼ばない）
        if (typeof woff !== "undefined") {
            try {
                await woff.init({ woffId: WOFF_ID });
                console.log("WOFF 初期化成功");
            } catch (initErr) {
                console.warn("WOFF SDK初期化スキップ:", initErr);
            }
        }

        // 2. 日時の初期設定 (1日前 〜 現在)
        initDates();

        // 3. ラジオボタン切替イベント
        setupModeToggle();

        // 4. 2段プルダウンの初期データ読み込み＆イベント登録
        await fetchSensorItems();
        setupDropdownEvents();

        // 5. 検索ボタン・ページネーション登録
        const searchBtn = document.getElementById("searchBtn");
        if (searchBtn) searchBtn.addEventListener("click", fetchData);

        const prevBtn = document.getElementById("prevPageBtn");
        const nextBtn = document.getElementById("nextPageBtn");
        if (prevBtn) prevBtn.addEventListener("click", () => changePage(-1));
        if (nextBtn) nextBtn.addEventListener("click", () => changePage(1));

    } catch (err) {
        const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
        console.error("WOFF 初期化エラー:", errDetail);
    }
}

// 70項目とカテゴリ一覧を取得
async function fetchSensorItems() {
    const groupSelect = document.getElementById("groupSelect");
    try {
        const res = await fetch(`${API_BASE_URL}/vision_api_new/woff/items`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();

        categories = result.categories || [];
        allItems = result.items || [];

        groupSelect.innerHTML = "";
        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.key;
            opt.textContent = cat.label;
            groupSelect.appendChild(opt);
        });

        // 初期表示で「すべて」の70項目を2段目にセット
        updateItemDropdown("all");
    } catch (err) {
        if (groupSelect) groupSelect.innerHTML = '<option value="">読み込み失敗（API/CORS確認）</option>';
        showDebugError("項目一覧の取得に失敗しました: " + err.message);
    }
}

function setupDropdownEvents() {
    const groupSelect = document.getElementById("groupSelect");
    if (groupSelect) {
        groupSelect.addEventListener("change", function () {
            updateItemDropdown(this.value);
        });
    }
}

function updateItemDropdown(categoryKey) {
    const itemSelect = document.getElementById("itemSelect");
    const filtered = categoryKey === "all"
        ? allItems
        : allItems.filter(item => item.category === categoryKey);

    itemSelect.innerHTML = "";
    filtered.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.name;
        itemSelect.appendChild(opt);
    });

    itemSelect.disabled = filtered.length === 0;

    // デフォルトで最終沈殿槽 pH (90011274) を選択
    if (categoryKey === "all" && filtered.some(i => i.id === 90011274)) {
        itemSelect.value = "90011274";
    }
}

function initDates() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const toLocalISO = (dt) => {
        const offset = dt.getTimezoneOffset() * 60000;
        return new Date(dt.getTime() - offset).toISOString().slice(0, 16);
    };

    const startDateElem = document.getElementById("startDate");
    const endDateElem = document.getElementById("endDate");
    if (startDateElem) startDateElem.value = toLocalISO(oneDayAgo);
    if (endDateElem) endDateElem.value = toLocalISO(now);
}

function setupModeToggle() {
    const radioButtons = document.querySelectorAll('input[name="searchMode"]');
    const dateArea = document.getElementById("dateArea");

    radioButtons.forEach(radio => {
        radio.addEventListener("change", function () {
            if (dateArea) {
                dateArea.style.display = (this.value === "history") ? "block" : "none";
            }
        });
    });
}

async function fetchData() {
    const mode = document.querySelector('input[name="searchMode"]:checked').value;
    const itemSelect = document.getElementById("itemSelect");
    const selectedSensorItemId = itemSelect ? itemSelect.value : "";

    if (!selectedSensorItemId) {
        alert("センサー項目を選択してください。");
        return;
    }

    const searchBtn = document.getElementById("searchBtn");
    searchBtn.disabled = true;
    searchBtn.innerText = "取得中...";

    try {
        if (mode === "latest") {
            const res = await fetch(`${API_BASE_URL}/vision_api_new/woff/latest/${selectedSensorItemId}`);
            if (!res.ok) throw new Error(`HTTPステータスエラー: ${res.status}`);
            const result = await res.json();

            currentSearchResult = { mode: "latest", ...result };
            renderResult("latest", result);
        } else {
            const startVal = document.getElementById("startDate").value;
            const endVal = document.getElementById("endDate").value;
            if (!startVal || !endVal) {
                alert("開始日時と終了日時を指定してください。");
                return;
            }

            const startDateOnly = startVal.split("T")[0];
            const endDateOnly = endVal.split("T")[0];
            const url = `${API_BASE_URL}/vision_api_new/woff/history/${selectedSensorItemId}?start_date=${startDateOnly}&end_date=${endDateOnly}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTPステータスエラー: ${res.status}`);
            const result = await res.json();

            currentSearchResult = { mode: "history", ...result };
            currentPage = 1;
            renderResult("history", result);
        }
    } catch (err) {
        showDebugError("通信エラーが発生しました: " + err.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerText = "検索実行";
    }
}

function renderResult(mode, result) {
    const resultCard = document.getElementById("resultCard");
    const summary = document.getElementById("resultSummary");
    const container = document.getElementById("resultContent");
    const paginationArea = document.getElementById("paginationArea");

    if (resultCard) resultCard.style.display = "block";
    if (summary) {
        summary.style.color = "#555";
        summary.style.fontWeight = "normal";
    }

    if (mode === "latest") {
        paginationArea.style.display = "none";
        summary.innerText = `⚡ ${result.name} (最新値)`;
        container.innerHTML = `
            <div class="latest-box">
                <p style="font-size:18px; font-weight:bold; margin:0 0 8px 0;">現在値: ${result.display_value}</p>
                <p style="font-size:12px; color:#666; margin:0;">更新日時: ${result.datetime}</p>
            </div>
        `;
    } else {
        const totalItems = result.rows ? result.rows.length : 0;
        summary.innerText = `📈 ${result.name} (全${totalItems}件)`;

        if (totalItems === 0) {
            paginationArea.style.display = "none";
            container.innerHTML = `<p style="text-align:center; padding:12px;">該当期間のデータが見つかりませんでした</p>`;
            return;
        }

        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = result.rows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        let tableHtml = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>日時</th>
                        <th style="text-align:right;">値</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pageData.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${item.datetime}</td>
                    <td style="font-weight:bold; text-align:right;">${item.display_value}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        paginationArea.style.display = "flex";
        document.getElementById("pageInfo").innerText = `${currentPage} / ${totalPages} ページ (全${totalItems}件)`;
        document.getElementById("prevPageBtn").disabled = (currentPage === 1);
        document.getElementById("nextPageBtn").disabled = (currentPage === totalPages);
    }
}

function changePage(direction) {
    if (!currentSearchResult || !currentSearchResult.rows) return;
    const totalPages = Math.ceil(currentSearchResult.rows.length / ITEMS_PER_PAGE);
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    renderResult("history", currentSearchResult);
}