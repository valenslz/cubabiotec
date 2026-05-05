/**
 * Misma lógica que assets/js/productos.js — mantener en sync o importar desde un solo módulo.
 * Catálogo público: Store API (no expone claves). wc/v3 solo en backend con Consumer keys.
 */
function htmlToPlainText(html) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
}

const WC_STORE_BASE =
    (typeof window !== "undefined" && window.WC_STORE_BASE) ||
    "https://cms.cubabiotec.com/wp-json/wc/store/v1";

const CURSO_CATEGORY_SLUGS = new Set(["cursos", "curso"]);

function productoEsCurso(product) {
    console.log(product);
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
        if (name === "cursos" || name === "curso")
            return true;
        return false;
    });
}

async function renderizarConComponente() {
    const container = document.getElementById("productos");
    if (!container) return;

    try {
        const [templateRes, productsRes] = await Promise.all([
            fetch("/components/cardproducto.html"),
            fetch(`${WC_STORE_BASE}/products?per_page=100`)
        ]);

        const templateHTML = await templateRes.text();
        if (!productsRes.ok) throw new Error(`Catálogo (${productsRes.status})`);
        const products = await productsRes.json();

        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHTML, "text/html");
        const cardTemplate = doc.body.firstChild;

        container.innerHTML = "";

        const soloProductos = products.filter((p) => !productoEsCurso(p));

        soloProductos.forEach((product) => {
            const card = cardTemplate.cloneNode(true);

            card.querySelector(".js-image").src = product.images[0]?.src || "placeholder.jpg";
            card.querySelector(".js-name").textContent = product.name;

            const badge = card.querySelector(".js-badge");
            if (product.featured) badge.classList.remove("hidden");

            const catEl = card.querySelector(".js-category");
            const catName = product.categories?.[0]?.name;
            if (catName) {
                catEl.textContent = catName;
                catEl.classList.remove("hidden");
            }

            const excerpt =
                product.short_description && String(product.short_description).trim()
                    ? product.short_description
                    : product.description;
            card.querySelector(".js-description").textContent = htmlToPlainText(excerpt);

            const minor = Number(product.prices?.price ?? 0);
            const divisor = product.prices?.currency_minor_unit != null
                ? 10 ** Number(product.prices.currency_minor_unit)
                : 100;
            const precioFormateado = (minor / divisor).toLocaleString("es-CO", {
                style: "currency",
                currency: product.prices?.currency_code || "COP",
                minimumFractionDigits: 0
            });
            card.querySelector(".js-price").textContent = precioFormateado;

            const slug = product.slug || product.id;
            card.querySelector(".js-details-link").href = `/pages/producto.html?slug=${encodeURIComponent(slug)}`;

            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error en la tienda:", error);
    }
}
