/**
 * Catálogo WooCommerce Store API: utilidades compartidas entre productos.js y cursos.js.
 * Cargar después de wc-store-config.js (usa window.WC_STORE_BASE).
 */

function htmlToPlainText(html) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
}

const CURSO_CATEGORY_SLUGS = new Set(["cursos", "curso"]);

function productoEsCurso(product) {
    const cats = product.categories || [];
    return cats.some((c) => {
        const slug = String(c.slug || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const name = String(c.name || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
        if (CURSO_CATEGORY_SLUGS.has(slug)) return true;
        if (name === "cursos" || name === "curso") return true;
        return false;
    });
}

/**
 * @param {HTMLElement} container
 * @param {object[]} products
 * @param {HTMLElement} cardTemplate
 * @param {{ from?: "cursos" }} [options]
 */
function appendProductoCards(container, products, cardTemplate, options) {
    products.forEach((product) => {
        const card = cardTemplate.cloneNode(true);

        const img = card.querySelector(".js-image");
        if (img) {
            img.src = product.images[0]?.src || "/assets/img/placeholder.jpg";
            img.alt = product.name;
            img.loading = "lazy";
            img.decoding = "async";
            img.fetchPriority = "low";
        }

        const badge = card.querySelector(".js-badge");
        if (badge && product.featured) badge.classList.remove("hidden");

        const catEl = card.querySelector(".js-category");
        const catName = product.categories?.[0]?.name;
        if (catEl && catName) {
            catEl.textContent = catName;
            catEl.classList.remove("hidden");
        }

        const nameEl = card.querySelector(".js-name");
        if (nameEl) nameEl.textContent = product.name;

        const excerpt =
            product.short_description && String(product.short_description).trim()
                ? product.short_description
                : product.description;
        const descEl = card.querySelector(".js-description");
        if (descEl) descEl.textContent = htmlToPlainText(excerpt);

        const minor = Number(product.prices?.price ?? 0);
        const divisor =
            product.prices?.currency_minor_unit != null
                ? 10 ** Number(product.prices.currency_minor_unit)
                : 100;
        const precioFormateado = (minor / divisor).toLocaleString("es-CO", {
            style: "currency",
            currency: product.prices?.currency_code || "COP",
            minimumFractionDigits: 0
        });
        const priceEl = card.querySelector(".js-price");
        if (priceEl) priceEl.textContent = precioFormateado;

        const link = card.querySelector(".js-details-link");
        if (link) {
            const qs = new URLSearchParams();
            const slugStr = product.slug && String(product.slug).trim();
            if (slugStr) qs.set("slug", slugStr);
            else if (product.id != null && product.id !== "") qs.set("id", String(product.id));
            if (options && options.from === "cursos") qs.set("from", "cursos");
            if (slugStr || (product.id != null && product.id !== "")) {
                link.href = `/pages/producto.html?${qs.toString()}`;
            } else {
                link.href = "/pages/productos.html";
            }
            if (options && options.from === "cursos") {
                link.textContent = "Reservar un cupo";
            }
        }

        container.appendChild(card);
    });
}

window.appendProductoCards = appendProductoCards;
window.productoEsCurso = productoEsCurso;
window.htmlToPlainText = htmlToPlainText;
