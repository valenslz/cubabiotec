(function () {
    const WC_STORE_BASE = window.WC_STORE_BASE;

    const $ = (id) => document.getElementById(id);

    function htmlToPlainText(html) {
        if (window.CBBT_SECURITY && typeof window.CBBT_SECURITY.textFromHtml === "function") {
            return window.CBBT_SECURITY.textFromHtml(html);
        }
        if (!html) return "";
        const doc = new DOMParser().parseFromString(String(html), "text/html");
        return (doc.body.textContent || "").trim();
    }

    function ensureMeta(attr, key, value) {
        const sel = attr === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
        let el = document.head.querySelector(sel);
        if (!el) {
            el = document.createElement("meta");
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }
        el.setAttribute("content", value);
    }

    function setCanonical(href) {
        let link = document.head.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement("link");
            link.rel = "canonical";
            document.head.appendChild(link);
        }
        link.href = href;
    }

    function siteOrigin() {
        const o = String(window.SITE_ORIGIN || "").replace(/\/$/, "");
        return o || String(window.location.origin || "").replace(/\/$/, "");
    }

    function injectProductJsonLd(product, imageUrl) {
        const origin = siteOrigin();
        const productUrl = `${origin}/producto?slug=${encodeURIComponent(product.slug || "")}`;
        const minor = Number(product.prices?.price ?? 0);
        const divisor =
            product.prices?.currency_minor_unit != null
                ? 10 ** Number(product.prices.currency_minor_unit)
                : 100;
        const priceNum = minor / divisor;
        const currency = product.prices?.currency_code || "COP";
        const data = {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: htmlToPlainText(product.short_description || product.description || "").slice(0, 5000),
            image: imageUrl ? [imageUrl] : undefined,
            sku: product.sku || undefined,
            offers: {
                "@type": "Offer",
                url: productUrl,
                priceCurrency: currency,
                price: priceNum.toFixed(2),
                availability: product.is_in_stock === false
                    ? "https://schema.org/OutOfStock"
                    : "https://schema.org/InStock"
            }
        };
        if (!data.image) delete data.image;
        if (!data.sku) delete data.sku;
        let script = document.getElementById("jsonld-product");
        if (!script) {
            script = document.createElement("script");
            script.type = "application/ld+json";
            script.id = "jsonld-product";
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    }

    function applyProductSeo(product) {
        const site = String(window.SITE_NAME || "CuBaBiotec");
        const origin = siteOrigin();
        const excerpt = htmlToPlainText(product.short_description || product.description || "").slice(0, 160);
        const desc = excerpt || `${product.name} — ${site}`;
        const img0 = product.images?.[0]?.src || product.images?.[0]?.full_src || "";
        const canonical = `${origin}/producto?slug=${encodeURIComponent(product.slug || "")}`;

        document.title = `${product.name} — ${site}`;
        ensureMeta("name", "description", desc);
        ensureMeta("property", "og:type", "product");
        ensureMeta("property", "og:title", `${product.name} | ${site}`);
        ensureMeta("property", "og:description", desc);
        ensureMeta("property", "og:url", canonical);
        if (img0) ensureMeta("property", "og:image", img0);
        ensureMeta("name", "twitter:card", img0 ? "summary_large_image" : "summary");
        ensureMeta("name", "twitter:title", `${product.name} | ${site}`);
        ensureMeta("name", "twitter:description", desc);
        if (img0) ensureMeta("name", "twitter:image", img0);
        setCanonical(canonical);
        injectProductJsonLd(product, img0);
    }

    function sanitizeDescription(html) {
        if (window.CBBT_SECURITY && typeof window.CBBT_SECURITY.sanitizeHtml === "function") {
            return window.CBBT_SECURITY.sanitizeHtml(html);
        }
        return "";
    }

    function formatPrice(product) {
        const minor = Number(product.prices?.price ?? 0);
        const divisor =
            product.prices?.currency_minor_unit != null
                ? 10 ** Number(product.prices.currency_minor_unit)
                : 100;
        return (minor / divisor).toLocaleString("es-CO", {
            style: "currency",
            currency: product.prices?.currency_code || "COP",
            minimumFractionDigits: 0
        });
    }

    function stockLabel(product) {
        if (product.stock_availability?.text) {
            return `Stock: ${product.stock_availability.text}`;
        }
        if (product.is_in_stock === false) {
            return "Sin stock disponible";
        }
        const low = product.low_stock_remaining;
        if (typeof low === "number" && low >= 0) {
            return `Stock disponible: ${low}`;
        }
        return "Stock disponible";
    }

    /** Mensaje de la API WooCommerce en texto plano (p. ej. &quot; → "). */
    function cleanWcUserMessage(s) {
        if (!s) return "";
        const t = document.createElement("textarea");
        t.innerHTML = s;
        return (t.value || "").replace(/\s+/g, " ").trim();
    }

    function isStockRelatedCartError(e) {
        const codes = [
            "woocommerce_rest_product_partially_out_of_stock",
            "woocommerce_rest_product_out_of_stock",
            "woocommerce_rest_not_enough_stock"
        ];
        if (e?.code && codes.includes(String(e.code))) return true;
        const m = String(e?.message || "").toLowerCase();
        return /existencias|sin suficientes|not enough stock|inventario|cantidad de/.test(m);
    }

    let product = null;
    let quantity = 1;

    function qtyMax() {
        if (!product) return 999;
        const lim = product.quantity_limit;
        if (lim && typeof lim.maximum === "number") return Math.max(1, lim.maximum);
        return 999;
    }

    function setQuantity(next) {
        const max = qtyMax();
        quantity = Math.min(max, Math.max(1, next));
        $("producto-qty-valor").textContent = String(quantity);
    }

    /** Misma lógica que app.js si el fade global aún no está disponible. */
    function applyImageFade(img) {
        if (!img || !img.classList.contains("img-fade")) return;
        if (typeof window.bindImageFade === "function") {
            window.bindImageFade(img);
            return;
        }
        const src = img.getAttribute("src");
        if (!src || !String(src).trim()) {
            img.classList.remove("img-fade--ready");
            return;
        }
        img.classList.remove("img-fade--ready");
        function reveal() {
            img.classList.add("img-fade--ready");
        }
        if (img.complete && img.naturalWidth > 0) {
            requestAnimationFrame(reveal);
            return;
        }
        img.addEventListener("load", reveal, { once: true });
        img.addEventListener("error", reveal, { once: true });
    }

    function setMainImage(url, alt) {
        const img = $("producto-img-principal");
        img.alt = alt;
        img.decoding = "async";
        img.fetchPriority = "high";
        if (!url) {
            img.removeAttribute("src");
            img.classList.remove("img-fade", "img-fade--ready");
            return;
        }
        img.classList.add("img-fade");
        img.classList.remove("img-fade--ready");
        img.src = url;
        requestAnimationFrame(() => applyImageFade(img));
    }

    function wireDescriptionImages(root) {
        if (!root) return;
        root.querySelectorAll("img").forEach((im) => {
            im.classList.add("img-fade");
            im.classList.remove("img-fade--ready");
            im.decoding = "async";
            requestAnimationFrame(() => applyImageFade(im));
        });
    }

    function renderThumbs(images, productName) {
        const wrap = $("producto-thumbs");
        wrap.innerHTML = "";
        if (!images || images.length < 2) return;

        images.forEach((im, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className =
                "h-16 w-16 overflow-hidden rounded-lg border-2 border-transparent bg-bio-dark/10 p-1 transition hover:border-bio-dark/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-bio-dark/30";
            btn.setAttribute("aria-label", `Ver imagen ${i + 1}`);
            const thumb = document.createElement("img");
            thumb.src = im.src || im.thumbnail || "";
            thumb.alt = productName;
            thumb.className = "img-fade h-full w-full object-contain";
            thumb.loading = "lazy";
            thumb.decoding = "async";
            btn.appendChild(thumb);
            btn.addEventListener("click", () => {
                setMainImage(im.src || im.full_src || "", productName);
                wrap.querySelectorAll("button").forEach((b) => {
                    b.classList.remove("border-bio-dark", "ring-2", "ring-bio-dark/20");
                });
                btn.classList.add("border-bio-dark", "ring-2", "ring-bio-dark/20");
            });
            if (i === 0) {
                btn.classList.add("border-bio-dark", "ring-2", "ring-bio-dark/20");
            }
            wrap.appendChild(btn);
        });
    }

    async function fetchProductBySlug(slug) {
        const url = `${WC_STORE_BASE}/products?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        return Array.isArray(list) && list.length ? list[0] : null;
    }

    async function fetchProductById(id) {
        const url = `${WC_STORE_BASE}/products/${encodeURIComponent(String(id))}`;
        const res = await fetch(url);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    function applyListContextFromParams(params) {
        const from = params.get("from");
        const isCursos = from === "cursos";
        const href = isCursos ? "/cursos" : "/productos";
        const volverLabel = isCursos ? "Volver a cursos" : "Volver al catálogo";
        const errLabel = isCursos ? "Ir a cursos" : "Ir al catálogo";

        const volver = $("producto-volver");
        const volverLbl = $("producto-volver-label");
        const errL = $("producto-error-volver");
        if (volver) volver.href = href;
        if (volverLbl) volverLbl.textContent = volverLabel;
        if (errL) {
            errL.href = href;
            errL.textContent = errLabel;
        }
    }

    function showError(msg) {
        $("producto-content").classList.add("hidden");
        $("producto-error").classList.remove("hidden");
        $("producto-error-msg").textContent = msg;
    }

    function showContent() {
        $("producto-error").classList.add("hidden");
        $("producto-content").classList.remove("hidden");
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const avisoOverlay = $("producto-aviso-overlay");
        const avisoCerrar = $("producto-aviso-cerrar");

        function closeAvisoModal() {
            if (!avisoOverlay) return;
            avisoOverlay.classList.add("hidden");
            avisoOverlay.classList.remove("flex");
            document.body.style.overflow = "";
        }

        function showAvisoModal(text) {
            const body = $("producto-aviso-text");
            if (!avisoOverlay || !body) return;
            body.textContent = text || "No se pudo completar la acción.";
            avisoOverlay.classList.remove("hidden");
            avisoOverlay.classList.add("flex");
            document.body.style.overflow = "hidden";
            avisoCerrar?.focus();
        }

        avisoCerrar?.addEventListener("click", closeAvisoModal);
        avisoOverlay?.addEventListener("click", (ev) => {
            if (ev.target === avisoOverlay) closeAvisoModal();
        });
        document.addEventListener("keydown", (ev) => {
            if (ev.key !== "Escape") return;
            if (avisoOverlay && !avisoOverlay.classList.contains("hidden")) closeAvisoModal();
        });

        const params = new URLSearchParams(window.location.search);
        applyListContextFromParams(params);

        const slug = params.get("slug");
        const idParam = params.get("id");
        const idNum = idParam != null && idParam !== "" ? parseInt(idParam, 10) : NaN;

        if ((!slug || !String(slug).trim()) && Number.isNaN(idNum)) {
            showError("Falta el identificador del producto en la URL (slug o id).");
            return;
        }

        try {
            if (slug && String(slug).trim()) {
                product = await fetchProductBySlug(String(slug).trim());
            }
            if (!product && !Number.isNaN(idNum)) {
                product = await fetchProductById(idNum);
            }
        } catch (e) {
            console.error(e);
            showError("No se pudo cargar el producto. Revisa la conexión o la URL del CMS.");
            return;
        }

        if (!product) {
            showError("No existe un producto con ese enlace.");
            return;
        }

        const priceStr = formatPrice(product);
        applyProductSeo(product);

        const cat = product.categories?.[0]?.name;
        const catEl = $("producto-categoria");
        if (cat) {
            catEl.textContent = cat;
            catEl.classList.remove("hidden");
        }

        $("producto-title").textContent = product.name;
        $("producto-price").textContent = priceStr;

        const desc =
            product.description && String(product.description).trim()
                ? product.description
                : product.short_description || "";
        $("producto-description").innerHTML = sanitizeDescription(desc);
        wireDescriptionImages($("producto-description"));

        const esCurso =
            typeof window.productoEsCurso === "function" && window.productoEsCurso(product);
        const stockEl = $("producto-stock");
        const qtyBlock = $("producto-qty-block");
        const btnCart = $("producto-add-cart");

        if (esCurso) {
            stockEl?.classList.add("hidden");
            qtyBlock?.classList.add("hidden");
            if (btnCart) btnCart.textContent = "Reservar un cupo";
        } else {
            stockEl?.classList.remove("hidden");
            qtyBlock?.classList.remove("hidden");
            if (stockEl) stockEl.textContent = stockLabel(product);
            if (btnCart) btnCart.textContent = "Añadir al carrito";
        }

        const imgs = product.images || [];
        const first = imgs[0];
        if (first) {
            setMainImage(first.src || first.full_src || "", product.name);
        } else {
            setMainImage("", product.name);
        }
        renderThumbs(imgs, product.name);

        quantity = 1;
        setQuantity(1);

        if (!esCurso) {
            $("producto-qty-menos")?.addEventListener("click", () => setQuantity(quantity - 1));
            $("producto-qty-mas")?.addEventListener("click", () => setQuantity(quantity + 1));
        }

        btnCart.addEventListener("click", async () => {
            btnCart.disabled = true;
            try {
                if (!window.WcCart || typeof window.WcCart.addItem !== "function") {
                    throw new Error("wc-cart.js no está cargado.");
                }
                const qty = esCurso ? 1 : quantity;
                await window.WcCart.addItem(product.id, qty);
                if (typeof window.refreshCartUI === "function") {
                    await window.refreshCartUI();
                }
                if (typeof window.openMinicart === "function") {
                    window.openMinicart();
                }
            } catch (e) {
                console.error(e);
                if (isStockRelatedCartError(e)) {
                    showAvisoModal(
                        cleanWcUserMessage(e.message) ||
                            "No hay suficiente stock para la cantidad indicada."
                    );
                } else {
                    showAvisoModal(
                        cleanWcUserMessage(e.message) ||
                            "No se pudo añadir al carrito. Comprueba la conexión con la tienda y la configuración CORS en WordPress."
                    );
                }
            } finally {
                btnCart.disabled = false;
            }
        });

        showContent();
    });
})();
