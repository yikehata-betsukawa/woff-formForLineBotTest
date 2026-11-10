// WOFF ID
const woffId = "0sEo_G5hZf8ABtEMZv_MnA";
const clientId = "DICH4bfkjcJBnehVROv9";
const redirectUri = "https://stunning-space-enigma-xrx4ww7jppjrhvg7x-9000.app.github.dev/";

const sendAlertIfNotInClient = () => {
    alert('This button is unavailable as WOFF is currently opened in an external browser.');
}

// --- 共通の ID トークン取得関数 ---
const getIdTokenClaims = () => {
    // 1. SDKの初期化およびログイン状態を安全に確認してから呼び出す
    try {
        if (typeof woff !== 'undefined' && woff.isLoggedIn && woff.isLoggedIn()) {
            const sdkClaims = woff.getDecodedIDToken();
            if (sdkClaims) return sdkClaims;
        }
    } catch (e) {
        // 初期化前などのエラーを安全に無視
    }

    // 2. SDKで取得できない場合、URLハッシュ(#id_token=...)からデコード
    const hash = window.location.hash;
    if (hash && hash.includes('id_token')) {
        const urlParams = new URLSearchParams(hash.replace('#', '?'));
        const idToken = urlParams.get('id_token');

        if (idToken) {
            try {
                const base64Url = idToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                return JSON.parse(jsonPayload);
            } catch (e) {
                console.error("Token デコード失敗:", e);
            }
        }
    }
    return null;
};

// --- WOFF データ表示処理 ---
const displayWoffData = () => {
    document.getElementById('browserLanguage').textContent = woff.getLanguage();
    document.getElementById('sdkVersion').textContent = woff.getVersion();
    document.getElementById('lineWorksVersion').textContent = woff.getWorksVersion();
    document.getElementById('isInClient').textContent = woff.isInClient();
    document.getElementById('isLoggedIn').textContent = woff.isLoggedIn();
    document.getElementById('deviceOS').textContent = woff.getOS();

    var context = woff.getContext();
    document.getElementById('viewType').textContent = context.viewType;
    document.getElementById('endpointUrl').textContent = context.endpointUrl;
    document.getElementById('clientId').textContent = context.clientId;
    document.getElementById('clientType').textContent = context.clientType;
    document.getElementById('channelId').textContent = context.channelId;

    // ★ woff.getDecodedIDToken() 呼び出しとフォールバックの統合
    const claims = getIdTokenClaims();
    console.log("woff.getDecodedIDToken() / ID Token 取得結果:", claims);

    if (claims) {
        console.log("claims.sub:", claims.sub);
        console.log("claims.name:", claims.name);
        console.log("claims.email:", claims.email);
        console.log("claims.domainId:", claims.domainId);
    }

    if (woff.isInClient()) {
        document.getElementById('isInClientMessage').textContent = 'Opening the app in the in-app browser of LINE WORKS.';
    } else {
        document.getElementById('isInClientMessage').textContent = 'Opening the app in an external browser.';
    }
}

const registerButtonHandlers = () => {
    document.getElementById('openWindowButton').addEventListener('click', () => {
        woff.openWindow({ url: 'https://line.worksmobile.com/', external: true });
    });

    document.getElementById('closeWindowButton').addEventListener('click', () => {
        if (!woff.isInClient()) sendAlertIfNotInClient();
        else woff.closeWindow();
    });

    document.getElementById('sendMessageButton').addEventListener('click', () => {
        if (!woff.isInClient()) sendAlertIfNotInClient();
        else {
            let msg = document.getElementById('sendMessageText').value;
            woff.sendMessage({ content: msg })
                .then(() => window.alert('Message sent'))
                .catch((error) => window.alert('Error sending message: ' + error));
        }
    });

    document.getElementById('sendFlexMessageButton').addEventListener('click', () => {
        if (!woff.isInClient()) sendAlertIfNotInClient();
        else {
            let msg = {
                "type": "flex",
                "altText": "this is a flexible template",
                "contents": {
                    "type": "bubble",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            { "type": "text", "text": "hello" },
                            { "type": "text", "text": "world" }
                        ]
                    }
                }
            };
            woff.sendFlexMessage({ flex: msg })
                .then(() => window.alert('Message sent'))
                .catch((error) => window.alert('Error sending message: ' + error));
        }
    });

    document.getElementById('getAccessToken').addEventListener('click', () => {
        if (!woff.isLoggedIn() && !woff.isInClient()) {
            alert('To get an access token, you need to be logged in. Please tap the "login" button below and try again.');
        } else {
            const accessToken = woff.getAccessToken();
            document.getElementById('accessTokenField').textContent = accessToken;
        }
    });

    document.getElementById('getProfileButton').addEventListener('click', () => {
        woff.getProfile().then((profile) => {
            console.log("woff.getProfile():", profile);
            document.getElementById('domainIdField').textContent = profile.domainId;
            document.getElementById('userIdProfileField').textContent = profile.userId;
            document.getElementById('displayNameField').textContent = profile.displayName;
        }).catch((error) => {
            window.alert('Error getting profile: ' + error);
        });
    });

    document.getElementById('getChannelIdButton').addEventListener('click', () => {
        woff.getChannelId().then((channelId) => {
            document.getElementById('channelIdField').textContent = channelId;
        }).catch((error) => {
            window.alert('Error getting channel Id: ' + error);
        });
    });

    // ★ ログイン処理: response_type=id_token を指定して直接 ID トークンを返却させる
    document.getElementById('woffLoginButton').addEventListener('click', () => {
        if (!woff.isLoggedIn()) {
            console.log("Login ボタン押下");
            const nonce = Math.random().toString(36).substring(2);
            // Implicit フローで直接 id_token を取得する認証 URL
            const authUrl = `https://auth.worksmobile.com/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=openid%20profile&state=woff_auth&nonce=${nonce}`;
            
            window.location.href = authUrl;
        }
    });

    document.getElementById('woffLogoutButton').addEventListener('click', () => {
        if (woff.isLoggedIn()) {
            woff.logout();
            window.location.reload();
        }
    });

    document.getElementById('scanQrButton').addEventListener('click', () => {
        woff.scanQR().then((result) => {
            document.getElementById('scanQrResult').textContent = result.value;
        }).catch((error) => {
            window.alert('Error scanning QR: ' + error);
        });
    });
}

const initializeWoff = (myWoffId) => {
    woff.init({ woffId: myWoffId })
        .then(() => {
            console.log("WOFF Init 成功");
            initializeApp();
        })
        .catch((err) => {
            console.error("WOFF Init Error:", err);
            document.getElementById("woffInitErrorMessage").hidden = false;
        });
}

const initializeApp = () => {
    displayWoffData();
    registerButtonHandlers();

    // woff.init() 完了後にクレーム取得とアラート判定を実行
    const claims = getIdTokenClaims();
    if (claims && window.location.hash.includes('id_token')) {
        alert(`ログイン成功！\nユーザー名: ${claims.name}\nID: ${claims.sub}`);
        history.replaceState(null, '', window.location.pathname);
    }

    if (woff.isLoggedIn()) {
        document.getElementById('woffLoginButton').disabled = true;
        document.getElementById('woffLogoutButton').disabled = false;
    } else {
        document.getElementById('woffLoginButton').disabled = false;
        document.getElementById('woffLogoutButton').disabled = true;
    }
}

// --- On load イベント部 ---
window.addEventListener('load', () => {
    console.log('WOFF_ID: ' + woffId);
    initializeWoff(woffId);
});