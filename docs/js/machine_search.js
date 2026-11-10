// 発行された WOFF ID
// machine_search.js の先頭付近
const WOFF_ID = "xexAR6FBXSkjXao8xQ7Wvg";

// バックエンド FastAPI のベース URL (サーバーの公開 HTTPS アドレスを指定)
// ★ ドメイン名のみを指定（末尾のスラッシュなし）
const API_BASE_URL = "https://dev-bcreer.betsukawa.co.jp";

// グローバル変数（取得したツリー構造データを保持）
let sensorTreeData = [];
let currentSearchResult = null; // ★ 最後に取得した検索結果を保持する変数を追加
let currentPage = 1; // ページ制御用変数を追加
const ITEMS_PER_PAGE = 10; // 1ページあたり10件表示


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
document.addEventListener("DOMContentLoaded", initWoffApp);

async function initWoffApp() {

    try {
        // 1. WOFF SDK 初期化（最優先で実行し、LINE WORKSアプリ内の認証完了を待つ）
        if (typeof woff !== "undefined") {
            const baseUrl = window.location.origin + window.location.pathname;
            // URL に ?code= が含まれている場合（＝リダイレクト直後）は再ログインを行わない
            const hasAuthCode = window.location.search.includes("code=");

            // ★ リダイレクト直後の場合、URLから認可パラメータを除去してクリーンにする
            if (hasAuthCode) {
                window.history.replaceState({}, document.title, baseUrl);
            }

            // WOFF 初期化（クエリ無しの綺麗なURLで実行）
            try {
                await woff.init({ woffId: WOFF_ID });
                console.log("WOFF 初期化成功");
            } catch (initErr) {
                console.warn("WOFF SDK初期化スキップ（ゲストモード）");
            }

            // 未ログイン時のみログイン画面へ
            if (!woff.isLoggedIn() && !hasAuthCode) {
                console.warn("未ログイン状態のため login() を実行します");
                woff.login({
                    redirectUri: baseUrl,
                    scope: ["openid", "profile"]
                });
                return;
            }

            // プロフィール取得（取れればログ出力）
            try {
                if (woff.isLoggedIn()) {
                    const profile = await woff.getProfile();
                    console.log("ログインユーザー:", profile.displayName, profile.userId);
                }
            } catch (pErr) {
                console.warn("プロフィール取得スキップ");
            }
        }

        // 2. 日付の初期設定 (1時間前 〜 現在)
        initDates();

        // 3. ラジオボタン切替イベントの登録 (*ngIf 同等ロジック)
        setupModeToggle();

        // 4. 2段プルダウンの初期データ読み込み＆イベント登録 【追加】
        await fetchSensorTree();
        setupDropdownEvents();

        // 5. 検索ボタンのイベント登録
        const searchBtn = document.getElementById("searchBtn");
        if (searchBtn) {
            searchBtn.addEventListener("click", fetchData);
        }

        // 6. ページネーションボタンのイベント登録（安全対策を追加）
        const prevBtn = document.getElementById("prevPageBtn");
        const nextBtn = document.getElementById("nextPageBtn");
        if (prevBtn) prevBtn.addEventListener("click", () => changePage(-1));
        if (nextBtn) nextBtn.addEventListener("click", () => changePage(1));

        // 7. トーク送信ボタンのイベント登録 【修正】
        const sendTalkBtn = document.getElementById("sendTalkBtn");
        if (sendTalkBtn) {
            sendTalkBtn.addEventListener("click", sendResultToTalk);
        }

    } catch (err) {
        const errDetail = typeof err === "object" ? JSON.stringify(err) : err;
        console.error("WOFF 初期化エラー:", errDetail);
    }
}

// 階層データを取得し1段目プルダウンをセット
async function fetchSensorTree() {
    const groupSelect = document.getElementById("groupSelect");
    try {
        const res = await fetch(`${API_BASE_URL}/vision_api/woff/sensor-tree`);
        const result = await res.json();
        
        if (result.status === "success" && result.data) {
            // 1. APIから返ってきた JSON の "data"（グループの配列）をそのままグローバル変数に保存する
            sensorTreeData = result.data;
            console.log("取得したセンサツリー構造:", sensorTreeData);
            // 2. 1段目プルダウンをリセット
            groupSelect.innerHTML = '<option value="">グループを選択してください</option>';
            // 3. グループ（例: "環境センサー"）ごとに <option> を作って 1 段目に追加
            sensorTreeData.forEach(group => {
                const opt = document.createElement("option");
                opt.value = group.id;          // <option value="90001">
                opt.textContent = group.name;  // 環境センサー
                groupSelect.appendChild(opt);
            });
        }
    } catch (err) {
        if (groupSelect) groupSelect.innerHTML = '<option value="">読み込み失敗</option>';
    }
}

// 1段目選択時に2段目の選択肢をセットする連動処理
function setupDropdownEvents() {
    const groupSelect = document.getElementById("groupSelect");
    const itemSelect = document.getElementById("itemSelect");

    if (groupSelect) {
        // ユーザーが 1 段目プルダウンで何かを選んだときに発火する
        groupSelect.addEventListener("change", function () {
            // 例: ユーザーが「環境センサー」を選ぶと this.value は "90001"（数値の 90001 に変換）
            const selectedGroupId = Number(this.value);
            console.log("選択されたグループID:", selectedGroupId);

            // 2段目プルダウンの選択肢を一度クリアする
            itemSelect.innerHTML = '<option value="">項目を選択してください</option>';

            // グループが未選択（初期状態）に戻された場合は 2 段目を非活性にして終了
            if (!selectedGroupId) {
                itemSelect.disabled = true;
                return;
            }

            // 1. 保存しておいた sensorTreeData から、id が 90001 であるグループオブジェクトを探す
            //    -> targetGroup に {"id": 90001, "name": "環境センサー", "items": [...]} が入る
            const targetGroup = sensorTreeData.find(g => g.id === selectedGroupId);
            console.log("抽出された項目一覧(items):", targetGroup ? targetGroup.items : []);

            // 2. 該当するグループが見つかり、かつその中に items 配列が存在する場合
            if (targetGroup && targetGroup.items) {

                // 3. items 配列（"KH 温度", "KH 相対湿度" など）を 1 件ずつループ処理
                targetGroup.items.forEach(item => {
                    const opt = document.createElement("option");
                    opt.value = item.id;  // <option value="90020004">
                    opt.textContent = item.name;  // KH 温度

                    // 4. 後で検索実行するときのためにカスタムデータ属性 (data-*) に ID を埋め込む
                    //    item.userGroupId (900) があればそれを使い、無ければ親グループの userGroupId (900) を使う
                    opt.dataset.userGroupId = item.userGroupId || targetGroup.userGroupId;// data-user-group-id="900"
                    opt.dataset.dataGroupId = targetGroup.id; // data-data-group-id="90001"

                    // 5. 作成した <option> を 2 段目プルダウンに追加
                    itemSelect.appendChild(opt);
                });

                // 6. 選択肢が入ったので 2 段目プルダウンの非活性を解除（操作可能にする）
                itemSelect.disabled = false;
            } else {
                itemSelect.disabled = true;
            }
        });
    }
}


// 日時の初期選択（昨日 00:00:00 〜 今日の現在時刻）
/** 
function initDates() {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // datetime-local 形式 (YYYY-MM-DDTHH:mm) に成形 (.slice(0, 16) に修正)
    const toLocalISO = (dt) => {
        const offset = dt.getTimezoneOffset() * 60000;
        return new Date(dt.getTime() - offset).toISOString().slice(0, 16);
        // 結果例: "2026-11-05T04:33:00"
    };

    const startDateElem = document.getElementById("startDate");
    const endDateElem = document.getElementById("endDate");

    if (startDateElem) startDateElem.value = toLocalISO(yesterday);
    if (endDateElem) endDateElem.value = toLocalISO(now);
}*/


// 日時の初期選択（1時間前 〜 現在時刻）
function initDates() {
    const now = new Date();
    
    // 現在時刻から1時間前（60分 × 60秒 × 1000ミリ秒）を計算
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));

    // datetime-local 形式 (YYYY-MM-DDTHH:mm) に成形する関数
    const toLocalISO = (dt) => {
        const offset = dt.getTimezoneOffset() * 60000;
        return new Date(dt.getTime() - offset).toISOString().slice(0, 16);
    };

    const startDateElem = document.getElementById("startDate");
    const endDateElem = document.getElementById("endDate");

    // 開始日時に1時間前、終了日時に現在時刻をセット
    if (startDateElem) startDateElem.value = toLocalISO(oneHourAgo);
    if (endDateElem) endDateElem.value = toLocalISO(now);
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
    // 【修正】プルダウンで選択されている項目名を取得
    const itemSelect = document.getElementById("itemSelect");
    const selectedSensorItemId = itemSelect ? itemSelect.value : ""; // 数値IDを取得
    const selectedOption = itemSelect ? itemSelect.options[itemSelect.selectedIndex] : null;

    if (!selectedSensorItemId) {
        alert("センサー項目を選択してください。");
        return;
    }

    const sensorItemId = itemSelect.value;
    // ★ <option> の dataset から自動抽出（なければフォールバック）
    const userGroupId = selectedOption.dataset.userGroupId;
    const dataGroupId = selectedOption.dataset.dataGroupId || document.getElementById("groupSelect").value;

    let searchUrl = "";
    if (mode === "latest") {
        searchUrl = `${API_BASE_URL}/vision_api/woff/latest?sensor_item_id=${selectedSensorItemId}&user_group_id=${userGroupId}&data_group_id=${dataGroupId}`;
    } else {
        const startVal = document.getElementById("startDate").value;
        const endVal = document.getElementById("endDate").value;
        if (!startVal || !endVal) {
            alert("開始日と終了日を指定してください。");
            return;
        }

        // datetime-local の 'T' をスペースに変換し、秒を整形
        const formatStart = startVal.replace("T", " ") + (startVal.length === 16 ? ":00" : "");
        const formatEnd = endVal.replace("T", " ") + (endVal.length === 16 ? ":00" : "");
        
        // ★ マスタから取得された値を使ってURLを作成
        //searchUrl = `${API_BASE_URL}/vision_api/woff/search?sensor_item_id=${sensorItemId}&start_date=${start}&end_date=${end}&user_group_id=${userGroupId}&data_group_id=${dataGroupId}`;
        searchUrl = `${API_BASE_URL}/vision_api/woff/search?sensor_item_id=${sensorItemId}&start_date=${encodeURIComponent(formatStart)}&end_date=${encodeURIComponent(formatEnd)}&user_group_id=${userGroupId}&data_group_id=${dataGroupId}`;
    }

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`HTTPステータスエラー: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            // ★ 検索結果を保持
            currentSearchResult = { mode, ...result };
            currentPage = 1; // 検索実行時は1ページ目にリセット
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
    const paginationArea = document.getElementById("paginationArea");

    if (resultCard) resultCard.style.display = "block";
    if (summary) {
        summary.style.color = "#555";
        summary.style.fontWeight = "normal";
    }

    if (mode === "latest") {
        paginationArea.style.display = "none";
        summary.innerText = `⚡ ${result.sensor_name} (最新値)`;
        container.innerHTML = `
            <div style="background:#f8f9fa; border-left:4px solid #00c73c; padding:12px; border-radius:4px;">
                <p style="font-size:18px; font-weight:bold; margin:0 0 8px 0;">現在値: ${result.value} ${result.unit || ''}</p>
                <p style="font-size:12px; color:#666; margin:0;">更新日時: ${result.datetime}</p>
            </div>
        `;
    } else {
        // renderResult 関数内の history モード処理
        summary.innerText = `📈 ${result.sensor_name} (${result.period})`;

        const totalItems = result.data ? result.data.length : 0;
        if (totalItems === 0) {
            paginationArea.style.display = "none";
            container.innerHTML = `<p style="text-align:center; padding:12px;">該当期間のデータが見つかりませんでした</p>`;
            return;
        }

        // ページ切り出しデータ
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = result.data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        let tableHtml = `
            <table class="history-table" style="width:100%; border-collapse:collapse; margin-top:10px;">
                <thead>
                    <tr style="background:#f1f3f5; border-bottom:2px solid #dee2e6;">
                        <th style="padding:8px; text-align:left;">日時</th>
                        <th style="padding:8px; text-align:right;">値</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pageData.forEach(item => {
            tableHtml += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px; font-size:13px;">${item.datetime}</td>
                    <td style="padding:8px; font-size:13px; font-weight:bold; text-align:right;">${item.value} ${item.unit || ''}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        // ページネーションコントロール更新
        paginationArea.style.display = "flex";
        document.getElementById("pageInfo").innerText = `${currentPage} / ${totalPages} ページ (全${totalItems}件)`;
        document.getElementById("prevPageBtn").disabled = (currentPage === 1);
        document.getElementById("nextPageBtn").disabled = (currentPage === totalPages);

    }
}

// ページ切り替え処理
function changePage(direction) {
    if (!currentSearchResult || !currentSearchResult.data) return;
    
    const totalPages = Math.ceil(currentSearchResult.data.length / ITEMS_PER_PAGE);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderResult("history", currentSearchResult);
}

// ★ トーク送信処理関数（安全・直接送信版）
async function sendResultToTalk() {
    if (!currentSearchResult) {
        alert("送信する検索結果がありません。");
        return;
    }

    // 1. WOFF SDK 存在チェック
    if (typeof woff === "undefined") {
        alert("WOFF SDK が読み込まれていません。");
        return;
    }

    // 2. 送信メッセージの構築
    let textMessage = "";
    if (currentSearchResult.mode === "latest") {
        textMessage = `【センサー計測値シェア】\n` +
                      `■ 項目: ${currentSearchResult.sensor_name}\n` +
                      `■ 現在値: ${currentSearchResult.value} ${currentSearchResult.unit || ''}\n` +
                      `■ 更新日時: ${currentSearchResult.datetime}`;
    } else {
        const latestRow = currentSearchResult.data && currentSearchResult.data.length > 0 
            ? currentSearchResult.data[currentSearchResult.data.length - 1] 
            : null;
        
        const latestValText = latestRow ? `${latestRow.value} ${latestRow.unit || ''}` : "データなし";
        textMessage = `【センサー履歴データシェア】\n` +
                      `■ 項目: ${currentSearchResult.sensor_name}\n` +
                      `■ 対象期間: ${currentSearchResult.period}\n` +
                      `■ 直近の計測値: ${latestValText}`;
    }

    // 3. トークルームへの送信実行
    try {
        // isInClient 判定を挟まず直接 sendMessages を試行する
        await woff.sendMessages({
            messages: [
                {
                    type: 'text',
                    text: textMessage
                }
            ]
        });
        alert('トークルームに送信しました！');
    } catch (error) {
        console.error("sendMessagesエラー:", error);
        // エラー内容を画面にポップアップ表示して原因を特定
        const errStr = error ? (error.message || JSON.stringify(error)) : "不明なエラー";
        alert('送信エラー: ' + errStr);
    }
}