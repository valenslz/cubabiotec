(function () {

    var STORAGE_KEY = "cubabiotec_wc_cart_token";
    var CART_SNAPSHOT_KEY = "cubabiotec_wc_cart_snapshot";
    var CART_CACHE_TTL_MS = 2000;
    var CART_STALE_MAX_MS = 30000;
    var MUTATION_FRESHNESS_WINDOW_MS = 5000;
    var lastCartSnapshot = null;
    var lastCartSnapshotAt = 0;
    var lastMutationAt = 0;
    var inFlightCartPromise = null;

    function base() {
        return window.WC_STORE_BASE;
    }

    function getToken() {
        try {
            var token = sessionStorage.getItem(STORAGE_KEY) || "";
            console.log("GET TOKEN:", token);
            return token;
        } catch {
            return "";
        }
    }

    function setToken(t) {
        if (!t) return;

        console.log("SET TOKEN:", t);

        try {
            sessionStorage.setItem(STORAGE_KEY, t);
        } catch (_) {}
    }

    function captureTokenFromResponse(res) {

        if (!res || !res.headers) return "";

        var token =
            res.headers.get("cart-token") ||
            res.headers.get("x-wc-store-api-cart-token") ||
            "";

        console.log("TOKEN FROM RESPONSE:", token);

        if (!token) return "";

        var current = getToken();

        if (!current || token !== current) {
            console.log("TOKEN UPDATED:", token);
            setToken(token);
        }

        return token;
    }

    function cartHeaders(extra) {

        var headers = Object.assign({}, extra || {});

        var tok = getToken();

        if (tok) {
            headers["cart-token"] = tok;
        }

        console.log("REQUEST HEADERS:", headers);

        return headers;
    }

    function cartGetUrl() {
        var url = base() + "/cart";
        var sep = url.indexOf("?") === -1 ? "?" : "&";
        return url + sep + "_=" + Date.now();
    }

    function readStoredSnapshot() {
        try {
            var raw = sessionStorage.getItem(CART_SNAPSHOT_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            var cart = parsed.cart || null;
            var at = Number(parsed.at) || 0;
            if (!cart || !at) return null;
            return { cart: cart, at: at };
        } catch (_) {
            return null;
        }
    }

    function writeStoredSnapshot(cart, at) {
        try {
            sessionStorage.setItem(
                CART_SNAPSHOT_KEY,
                JSON.stringify({
                    cart: cart || null,
                    at: Number(at) || Date.now()
                })
            );
        } catch (_) {}
    }

    function clearStoredSnapshot() {
        try {
            sessionStorage.removeItem(CART_SNAPSHOT_KEY);
        } catch (_) {}
    }

    function rememberCart(cart) {
        lastCartSnapshot = cart || null;
        lastCartSnapshotAt = Date.now();
        writeStoredSnapshot(lastCartSnapshot, lastCartSnapshotAt);
    }

    function markMutation() {
        lastMutationAt = Date.now();
    }

    function hydrateSnapshotFromStorage() {
        if (lastCartSnapshot && lastCartSnapshotAt) return;
        var stored = readStoredSnapshot();
        if (!stored) return;
        var age = Date.now() - stored.at;
        if (age > CART_STALE_MAX_MS) {
            clearStoredSnapshot();
            return;
        }
        lastCartSnapshot = stored.cart;
        lastCartSnapshotAt = stored.at;
    }

    async function ensureCart() {

        if (getToken()) {
            console.log("CART TOKEN EXISTS");
            return getCart();
        }

        var url = cartGetUrl();

        console.log("CREATING CART:", url);

        var res = await fetch(url, {
            method: "GET",
            headers: cartHeaders({
                Accept: "application/json"
            }),
            credentials: "include",
            mode: "cors"
        });

        captureTokenFromResponse(res);

        if (!res.ok) {
            throw new Error("No se pudo iniciar el carrito (" + res.status + ")");
        }

        var data = await res.json();
        rememberCart(data);
        markMutation();
        return data;
    }

    async function addItem(productId, quantity) {

        console.log("ADD ITEM:", productId, quantity);

        if (!getToken()) {
            await ensureCart();
        }

        var url = base() + "/cart/add-item";

        var payload = {
            id: Number(productId),
            quantity: Number(quantity) || 1
        };

        console.log("ADD ITEM PAYLOAD:", payload);

        var res = await fetch(url, {
            method: "POST",
            headers: cartHeaders({
                "Content-Type": "application/json",
                Accept: "application/json"
            }),
            credentials: "include",
            mode: "cors",
            body: JSON.stringify(payload)
        });

        captureTokenFromResponse(res);

        if (!res.ok) {
            var body = await res.text();
            throw new Error(body || "Error agregando producto");
        }

        var data = await res.json();
        rememberCart(data);
        markMutation();

        console.log("ADD ITEM RESPONSE:", data);

        return data;
    }

    async function getCart(options) {

        console.log("GET CART");

        hydrateSnapshotFromStorage();

        var opts = options || {};
        var force = !!opts.force;
        var now = Date.now();
        var allowStale =
            !!opts.allowStale &&
            now - lastMutationAt > MUTATION_FRESHNESS_WINDOW_MS;

        if (!force && inFlightCartPromise) {
            console.log("GET CART REUSED (IN FLIGHT)");
            return inFlightCartPromise;
        }

        if (!force && lastCartSnapshot) {
            var age = now - lastCartSnapshotAt;
            if (age < CART_CACHE_TTL_MS) {
                console.log("GET CART REUSED (CACHE)");
                return Promise.resolve(lastCartSnapshot);
            }
            if (allowStale && age < CART_STALE_MAX_MS) {
                console.log("GET CART REUSED (STALE SNAPSHOT)");
                return Promise.resolve(lastCartSnapshot);
            }
        }

        var url = cartGetUrl();
        inFlightCartPromise = fetch(url, {
                method: "GET",
                headers: cartHeaders({
                    Accept: "application/json"
                }),
                credentials: "include",
                mode: "cors"
            })
            .then(function (res) {
                captureTokenFromResponse(res);

                if (!res.ok) {
                    throw new Error("No se pudo leer el carrito (" + res.status + ")");
                }

                return res.json();
            })
            .then(function (data) {
                console.log("CART DATA:", data);
                rememberCart(data);
                return data;
            })
            .finally(function () {
                inFlightCartPromise = null;
            });

        return inFlightCartPromise;
    }

    async function updateItem(key, quantity) {

        console.log("UPDATE ITEM:", key, quantity);

        var url = base() + "/cart/update-item";

        var res = await fetch(url, {
            method: "POST",
            headers: cartHeaders({
                "Content-Type": "application/json",
                Accept: "application/json"
            }),
            credentials: "include",
            mode: "cors",
            body: JSON.stringify({
                key: String(key),
                quantity: Math.max(0, Number(quantity) || 0)
            })
        });

        captureTokenFromResponse(res);

        if (!res.ok) {
            throw new Error("Error actualizando carrito");
        }

        var data = await res.json();
        rememberCart(data);
        markMutation();
        return data;
    }

    async function removeItem(key) {

        console.log("REMOVE ITEM:", key);

        var url = base() + "/cart/remove-item";

        var res = await fetch(url, {
            method: "POST",
            headers: cartHeaders({
                "Content-Type": "application/json",
                Accept: "application/json"
            }),
            credentials: "include",
            mode: "cors",
            body: JSON.stringify({ key: String(key) })
        });

        captureTokenFromResponse(res);

        if (!res.ok) {
            throw new Error("Error eliminando producto");
        }

        var data = await res.json();
        rememberCart(data);
        return data;
    }

    function clearToken() {

        console.log("CLEAR TOKEN");

        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (_) {}

        lastCartSnapshot = null;
        lastCartSnapshotAt = 0;
        inFlightCartPromise = null;
        clearStoredSnapshot();
    }

    /**
     * Checkout Store API (cart-token en headers).
     * @param {object} payload billing_address, shipping_address, payment_method, ...
     */
    async function submitCheckout(payload) {

        if (!getToken()) {
            await ensureCart();
        }

        var url = base() + "/checkout";

        var res = await fetch(url, {
            method: "POST",
            headers: cartHeaders({
                "Content-Type": "application/json",
                Accept: "application/json"
            }),
            credentials: "include",
            mode: "cors",
            body: JSON.stringify(payload || {})
        });

        captureTokenFromResponse(res);

        var txt = await res.text();
        var data = {};

        try {
            data = txt ? JSON.parse(txt) : {};
        } catch (e) {
            throw new Error(txt ? txt.slice(0, 200) : "Respuesta inválida del servidor");
        }

        if (!res.ok) {
            var msg =
                data.message ||
                (data.data && data.data.message) ||
                data.code ||
                "No se pudo completar el checkout (" + res.status + ")";
            var err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }

        return data;
    }

    window.WcCart = {
        addItem: addItem,
        getCart: getCart,
        ensureCart: ensureCart,
        updateItem: updateItem,
        removeItem: removeItem,
        getToken: getToken,
        clearToken: clearToken,
        submitCheckout: submitCheckout
    };

})();