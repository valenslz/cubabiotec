(function () {
    function extractPayPalRedirect(data) {
        if (!data || typeof data !== "object") return "";
        var pr = data.payment_result;
        if (pr && typeof pr.redirect_url === "string" && pr.redirect_url.trim()) {
            return pr.redirect_url.trim();
        }
        if (pr && Array.isArray(pr.payment_details)) {
            for (var i = 0; i < pr.payment_details.length; i++) {
                var p = pr.payment_details[i];
                if (!p) continue;
                var k = String(p.key || "").toLowerCase();
                if (
                    (k === "redirect" || k === "redirect_url" || k === "approval_url") &&
                    p.value
                ) {
                    return String(p.value).trim();
                }
            }
        }
        if (typeof data.redirect_url === "string" && data.redirect_url.trim()) {
            return data.redirect_url.trim();
        }
        var ext = data.extensions;
        if (ext && ext.checkout && typeof ext.checkout.redirect_url === "string") {
            return ext.checkout.redirect_url.trim();
        }
        return "";
    }

    function val(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || "").trim() : "";
    }

    function buildPayload() {
        var country = "CO";
        var billing = {
            first_name: val("billing-first-name"),
            last_name: val("billing-last-name"),
            address_1: val("billing-address-1"),
            city: val("billing-city"),
            country: country,
            email: val("billing-email")
        };

        var same = document.getElementById("same-shipping");
        var shipping;
        if (same && same.checked) {
            shipping = {
                first_name: billing.first_name,
                last_name: billing.last_name,
                address_1: billing.address_1,
                city: billing.city,
                country: country
            };
        } else {
            shipping = {
                first_name: val("shipping-first-name") || billing.first_name,
                last_name: val("shipping-last-name") || billing.last_name,
                address_1: val("shipping-address-1") || billing.address_1,
                city: val("shipping-city") || billing.city,
                country: country
            };
        }

        var paymentMethod =
            typeof window.WC_CHECKOUT_PAYMENT_METHOD === "string"
                ? window.WC_CHECKOUT_PAYMENT_METHOD
                : "ppcp-gateway";

        return {
            billing_address: billing,
            shipping_address: shipping,
            payment_method: paymentMethod
        };
    }

    function showError(msg) {
        var el = document.getElementById("checkout-error");
        if (!el) return;
        el.textContent = msg || "Ha ocurrido un error.";
        el.classList.remove("hidden");
    }

    function hideError() {
        var el = document.getElementById("checkout-error");
        if (!el) return;
        el.classList.add("hidden");
        el.textContent = "";
    }

    document.addEventListener("DOMContentLoaded", async function () {
        var emptyEl = document.getElementById("checkout-empty");
        var wrap = document.getElementById("checkout-form-wrap");
        var form = document.getElementById("checkout-form");
        var submitBtn = document.getElementById("checkout-submit");
        var sameCb = document.getElementById("same-shipping");
        var shipFs = document.getElementById("shipping-fieldset");

        if (!window.WcCart || typeof window.WcCart.submitCheckout !== "function") {
            if (emptyEl) {
                emptyEl.textContent =
                    "No se cargó el módulo de tienda (wc-cart.js). Recarga la página.";
                emptyEl.classList.remove("hidden");
            }
            return;
        }

        try {
            var cart = await window.WcCart.getCart({ force: true });
            var items = cart.items || [];
            if (!items.length) {
                emptyEl?.classList.remove("hidden");
                return;
            }
            wrap?.classList.remove("hidden");
        } catch (e) {
            console.error(e);
            if (emptyEl) {
                emptyEl.innerHTML =
                    "<p>No se pudo leer el carrito.</p><a href=\"/pages/carrito.html\" class=\"mt-4 inline-block font-semibold text-bio-dark underline\">Ir al carrito</a>";
                emptyEl.classList.remove("hidden");
            }
            return;
        }

        function toggleShipping() {
            if (!sameCb || !shipFs) return;
            if (sameCb.checked) {
                shipFs.classList.add("hidden");
                shipFs.querySelectorAll("input:not([type=hidden])").forEach(function (inp) {
                    inp.required = false;
                });
            } else {
                shipFs.classList.remove("hidden");
                shipFs.querySelectorAll("input:not([type=hidden])").forEach(function (inp) {
                    inp.required = true;
                });
            }
        }

        sameCb?.addEventListener("change", toggleShipping);
        toggleShipping();

        form?.addEventListener("submit", async function (ev) {
            ev.preventDefault();
            hideError();

            var payload = buildPayload();
            if (
                !payload.billing_address.first_name ||
                !payload.billing_address.last_name ||
                !payload.billing_address.address_1 ||
                !payload.billing_address.city ||
                !payload.billing_address.email
            ) {
                showError("Completa todos los campos obligatorios.");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Conectando con PayPal…";
            }

            try {
                var result = await window.WcCart.submitCheckout(payload);
                var url = extractPayPalRedirect(result);
                if (url) {
                    window.location.href = url;
                    return;
                }
                showError(
                    "El pedido se registró pero no llegó el enlace de PayPal. Revisa la configuración del gateway o intenta desde la tienda."
                );
            } catch (err) {
                console.error(err);
                showError(err.message || "No se pudo iniciar el pago.");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Pagar con PayPal";
                }
            }
        });
    });
})();
