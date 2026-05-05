/**
 * Mini-carrito lateral + contador en el header (integración WcCart).
 */
(function () {
    var busy = false;

    function $(id) {
        return document.getElementById(id);
    }

    function ensureBadgeElement() {
        var badgeClass =
            "pointer-events-none absolute left-1/2 -translate-x-1/2 text-[11px] font-extrabold leading-none tabular-nums tracking-tight text-current";
        var el = $("header-cart-count");
        if (el) {
            el.className = badgeClass;
            return el;
        }

        var btn = $("minicart-open-btn");
        if (!btn) return null;
        var iconWrap = btn.querySelector("div[aria-hidden='true']");
        if (!iconWrap) return null;

        el = document.createElement("span");
        el.id = "header-cart-count";
        el.className = badgeClass;
       
        iconWrap.appendChild(el);
        return el;
    }

    function totalCOP(cart) {
        var t = cart.totals || {};
        var minor = Number(t.total_price != null ? t.total_price : t.total_items );
        var unit =
            t.currency_minor_unit != null
                ? Math.pow(10, Number(t.currency_minor_unit))
                : 100;
        return minor / unit;
    }

    function formatMinorAmount(minor, currencyCode, minorUnit) {
        var m = Number(minor);
        if (Number.isNaN(m)) m = 0;
        var unit = minorUnit != null ? Math.pow(10, Number(minorUnit)) : 100;
        return (m / unit).toLocaleString("es-CO", {
            style: "currency",
            currency: currencyCode || "COP",
            minimumFractionDigits: 0
        });
    }

    function lineRowTotal(line) {
        var totals = line.totals || {};
        var minor = Number(
            totals.line_total != null
                ? totals.line_total
                : totals.line_subtotal != null
                  ? totals.line_subtotal
                  : NaN
        );
        if (Number.isNaN(minor) || minor === 0) {
            minor = Number(line.prices?.price || 0) * Number(line.quantity || 1);
        }
        return formatMinorAmount(
            minor,
            line.prices?.currency_code,
            line.prices?.currency_minor_unit
        );
    }

    function cartItemCount(cart) {
        var items = cart.items || [];
        return items.reduce(function (s, i) {
            return s + Number(i.quantity || 0);
        }, 0);
    }

    function setBadge(n) {
        var el = ensureBadgeElement();
        if (!el) return;
        if (n <= 0) {
            el.textContent = "";
            return;
        }
        var t = n > 99 ? "99+" : String(n);
        el.textContent = t;
    }

    function setShippingUI(cart) {
        var wrap = $("minicart-shipping-wrap");
        var msg = $("minicart-shipping-msg");
        var bar = $("minicart-shipping-bar");
        if (!wrap || !msg || !bar) return;

        var threshold = Number(window.FREE_SHIPPING_THRESHOLD_COP || 0);
        if (!threshold || threshold <= 0) {
            wrap.classList.add("hidden");
            return;
        }
        wrap.classList.remove("hidden");

        var current = totalCOP(cart);
        var remaining = Math.max(0, threshold - current);
        var pct = Math.min(100, (current / threshold) * 100);

        if (remaining <= 0) {
            msg.textContent = "¡Tienes envío gratis!";
            bar.style.width = "100%";
        } else {
            msg.textContent =
                "Te faltan " +
                remaining.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0
                }) +
                " para envío gratis";
            bar.style.width = pct + "%";
        }
    }

    function renderLines(cart) {
        var ul = $("minicart-items");
        if (!ul) return;
        ul.innerHTML = "";
        var items = cart.items || [];

        items.forEach(function (line) {
            var key = line.key != null ? String(line.key) : line.id != null ? String(line.id) : "";
            var name = line.name || "Producto";
            var qty = Number(line.quantity || 1);
            var imgSrc =
                (line.images && line.images[0] && (line.images[0].thumbnail || line.images[0].src)) ||
                "";

            var li = document.createElement("li");
            li.className = "flex gap-3 border-b border-gray-100 pb-6 last:border-0";
            li.dataset.key = key;

            var thumb = document.createElement("div");
            thumb.className =
                "h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100";
            if (imgSrc) {
                var im = document.createElement("img");
                im.src = imgSrc;
                im.alt = "";
                im.className = "img-fade h-full w-full object-cover";
                im.loading = "lazy";
                thumb.appendChild(im);
            }

            var mid = document.createElement("div");
            mid.className = "min-w-0 flex-1";

            var title = document.createElement("p");
            title.className =
                "text-xs font-semibold uppercase leading-snug tracking-wide text-bio-dark line-clamp-2";
            title.textContent = name;

            var price = document.createElement("p");
            price.className = "mt-1 text-sm font-semibold text-bio-dark";
            price.textContent = lineRowTotal(line);

            mid.appendChild(title);
            mid.appendChild(price);

            var rowQty = document.createElement("div");
            rowQty.className = "mt-3 flex flex-wrap items-center gap-2";

            var qWrap = document.createElement("div");
            qWrap.className =
                "inline-flex items-stretch overflow-hidden rounded-md border border-gray-200";

            function btn(label, aria) {
                var b = document.createElement("button");
                b.type = "button";
                b.setAttribute("aria-label", aria);
                b.className =
                    "flex h-8 w-8 items-center justify-center bg-bio-dark text-sm font-medium text-white hover:bg-bio-dark/90";
                b.textContent = label;
                return b;
            }

            var minus = btn("−", "Quitar una unidad");
            var val = document.createElement("span");
            val.className =
                "flex min-w-[2rem] items-center justify-center px-2 text-sm font-semibold tabular-nums text-bio-dark";
            val.textContent = String(qty);
            var plus = btn("+", "Añadir una unidad");

            minus.addEventListener("click", function () {
                if (!key) return;
                changeQty(key, qty - 1);
            });
            plus.addEventListener("click", function () {
                if (!key) return;
                changeQty(key, qty + 1);
            });

            qWrap.appendChild(minus);
            qWrap.appendChild(val);
            qWrap.appendChild(plus);

            var del = document.createElement("button");
            del.type = "button";
            del.setAttribute("aria-label", "Eliminar producto del carrito");
            del.className =
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600";
            del.innerHTML =
                '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';

            function doRemove() {
                if (!key) return;
                removeLine(key);
            }
            del.addEventListener("click", doRemove);

            rowQty.appendChild(qWrap);
            rowQty.appendChild(del);

            mid.appendChild(rowQty);

            li.appendChild(thumb);
            li.appendChild(mid);
            ul.appendChild(li);
        });
    }

    async function changeQty(key, next) {
        if (busy || !window.WcCart) return;
        busy = true;
        try {
            var cart;
            if (next <= 0) {
                cart = await window.WcCart.removeItem(key);
            } else {
                cart = await window.WcCart.updateItem(key, next);
            }
            setBadge(cartItemCount(cart));
            setPanelState(cart);
        } catch (e) {
            console.error(e);
        } finally {
            busy = false;
        }
    }

    async function removeLine(key) {
        if (busy || !window.WcCart) return;
        busy = true;
        try {
            var cart = await window.WcCart.removeItem(key);
            setBadge(cartItemCount(cart));
            setPanelState(cart);
        } catch (e) {
            console.error(e);
        } finally {
            busy = false;
        }
    }

    function setPanelState(cart) {
        var empty = $("minicart-empty");
        var wrap = $("minicart-items-wrap");
        var footer = $("minicart-footer");
        var items = cart.items || [];

        if (!items.length) {
            empty.classList.remove("hidden");
            var et0 = $("minicart-empty-text");
            var lk0 = $("minicart-empty-link");
            if (et0) et0.textContent = "Tu carrito está vacío.";
            if (lk0) lk0.classList.remove("hidden");
            wrap.classList.add("hidden");
            footer.classList.add("hidden");
            return;
        }
        empty.classList.add("hidden");
        wrap.classList.remove("hidden");
        footer.classList.remove("hidden");

        renderLines(cart);
        setShippingUI(cart);

        var t = cart.totals || {};
        var totalEl = $("minicart-footer-total");
        var label = $("minicart-footer-label");
        if (totalEl) {
            totalEl.textContent = formatMinorAmount(
                Number(t.total_price || t.total_items || 0),
                t.currency_code,
                t.currency_minor_unit
            );
        }
        if (label) {
            var n = cartItemCount(cart);
            label.textContent =
                "Total estimado (" + n + " " + (n === 1 ? "artículo" : "artículos") + ")";
        }

        var checkout = $("minicart-checkout");
        if (checkout) {
            checkout.href = "/pages/checkout.html";
            checkout.classList.remove("hidden");
            checkout.setAttribute("aria-disabled", "false");
            checkout.classList.remove("pointer-events-none", "opacity-50");
        }
    }

    function openMinicart() {
        var panel = $("minicart-panel");
        var overlay = $("minicart-overlay");
        var btn = $("minicart-open-btn");
        if (!panel || !overlay) return;
        panel.classList.remove("translate-x-full");
        overlay.classList.remove("opacity-0", "pointer-events-none");
        overlay.classList.add("opacity-100");
        panel.setAttribute("aria-hidden", "false");
        overlay.setAttribute("aria-hidden", "false");
        if (btn) btn.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
        $("minicart-close")?.focus();
    }

    function closeMinicart() {
        var panel = $("minicart-panel");
        var overlay = $("minicart-overlay");
        var btn = $("minicart-open-btn");
        if (!panel || !overlay) return;
        panel.classList.add("translate-x-full");
        overlay.classList.add("opacity-0", "pointer-events-none");
        overlay.classList.remove("opacity-100");
        panel.setAttribute("aria-hidden", "true");
        overlay.setAttribute("aria-hidden", "true");
        if (btn) btn.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    }

    async function refreshCartUI(force) {
        if (!window.WcCart) return;

        var panelOpen =
            $("minicart-panel") &&
            !$("minicart-panel").classList.contains("translate-x-full");

        try {
            var cart = await window.WcCart.getCart({
                force: !!force,
                allowStale: !force
            });
            var count = cartItemCount(cart);
            setBadge(count);
            setShippingUI(cart);

            if (panelOpen) {
                setPanelState(cart);
            }
        } catch (e) {
            console.warn("Carrito:", e);
            setBadge(0);
        }
    }

    async function openAndLoad() {
        openMinicart();
        var empty = $("minicart-empty");

        try {
            await refreshCartUI();
        } catch (e) {
            console.error(e);
            empty?.classList.remove("hidden");
            var et = $("minicart-empty-text");
            var lk = $("minicart-empty-link");
            if (et)
                et.textContent =
                    "No se pudo cargar el carrito. Revisa la conexión con la tienda.";
            if (lk) lk.classList.add("hidden");
        }
    }

    window.refreshCartUI = refreshCartUI;
    window.openMinicart = openAndLoad;
    window.closeMinicart = closeMinicart;

    window.initMinicart = function () {
        var openBtn = $("minicart-open-btn");
        var closeBtn = $("minicart-close");
        var overlay = $("minicart-overlay");

        openBtn?.addEventListener("click", function () {
            openAndLoad();
        });
        closeBtn?.addEventListener("click", closeMinicart);
        overlay?.addEventListener("click", closeMinicart);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeMinicart();
        });

        refreshCartUI();
    };
})();
