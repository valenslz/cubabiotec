(function () {
    function formatMinor(minor, currencyCode, minorUnit) {
        var m = Number(minor);
        if (Number.isNaN(m)) m = 0;
        var unit = minorUnit != null ? Math.pow(10, Number(minorUnit)) : 100;
        var cur = currencyCode || "COP";
        return (m / unit).toLocaleString("es-CO", {
            style: "currency",
            currency: cur,
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
            var unitP = Number(line.prices?.price || 0);
            var q = Number(line.quantity || 1);
            minor = unitP * q;
        }
        var cur = line.prices?.currency_code || "COP";
        var mu = line.prices?.currency_minor_unit;
        return formatMinor(minor, cur, mu);
    }

    function cartTotalDisplay(cart) {
        var t = cart.totals || {};
        var minor = Number(
            t.total_price != null
                ? t.total_price
                : t.total_items != null
                  ? t.total_items
                  : 0
        );
        return formatMinor(minor, t.currency_code || "COP", t.currency_minor_unit);
    }

    document.addEventListener("DOMContentLoaded", async function () {
        var errEl = document.getElementById("carrito-error");
        var vacio = document.getElementById("carrito-vacio");
        var contenido = document.getElementById("carrito-contenido");
        var lineas = document.getElementById("carrito-lineas");
        var totalEl = document.getElementById("carrito-total");
        var checkoutBtn = document.getElementById("carrito-checkout");

        function showError(msg) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
        }

        try {
            var cart = await window.WcCart.getCart();
            var items = cart.items || [];

            if (!items.length) {
                vacio.classList.remove("hidden");
                return;
            }

            lineas.innerHTML = "";
            items.forEach(function (line) {
                var name = line.name || line.title || "Producto";
                var qty = line.quantity != null ? line.quantity : 1;

                var li = document.createElement("li");
                li.className =
                    "flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between";

                var left = document.createElement("div");
                var pName = document.createElement("p");
                pName.className = "font-medium text-bio-dark";
                pName.textContent = name;
                var pQty = document.createElement("p");
                pQty.className = "text-sm text-gray-500";
                pQty.textContent = "Cantidad: " + qty;
                left.appendChild(pName);
                left.appendChild(pQty);

                var pPrice = document.createElement("p");
                pPrice.className = "font-semibold tabular-nums text-bio-dark";
                pPrice.textContent = lineRowTotal(line);

                li.appendChild(left);
                li.appendChild(pPrice);
                lineas.appendChild(li);
            });

            totalEl.textContent = cartTotalDisplay(cart);
            contenido.classList.remove("hidden");

            checkoutBtn.href = "/checkout";
            checkoutBtn.classList.remove("hidden");
        } catch (e) {
            console.error(e);
            showError(
                "No se pudo cargar el carrito. Comprueba CORS en el CMS y que el header cart-token esté expuesto para tu dominio."
            );
        }
    });
})();
