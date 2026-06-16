(function () {
    const WP_BASE = window.WP_REST_BASE || "https://cms.cubabiotec.com/wp-json/wp/v2";

    function htmlToPlainText(html) {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, "text/html");
        return (doc.body.textContent || "").trim();
    }

    function featuredImageUrl(post) {
        const emb = post._embedded;
        const media = emb && emb["wp:featuredmedia"] && emb["wp:featuredmedia"][0];
        if (!media) return "/assets/img/placeholder.jpg";
        return (
            media.source_url ||
            media.media_details?.sizes?.medium_large?.source_url ||
            media.media_details?.sizes?.medium?.source_url ||
            ""
        );
    }

    function primaryCategoryName(post) {
        const terms = post._embedded && post._embedded["wp:term"];
        if (!Array.isArray(terms) || !terms.length) return "";
        const cats = terms.find((t) => t && t[0] && t[0].taxonomy === "category");
        return cats && cats[0] ? cats[0].name : "";
    }

    function formatDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    async function fetchPosts() {
        const url = `${WP_BASE}/posts?per_page=12&_embed=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Blog (${res.status})`);
        return res.json();
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const container = document.getElementById("blog-posts");
        const errEl = document.getElementById("blog-error");
        if (!container) return;

        let templateEl;
        try {
            const templateRes = await fetch("/components/cardblog.html");
            if (!templateRes.ok) throw new Error("No se encontró cardblog.html");
            const templateHTML = await templateRes.text();
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = templateHTML.trim();
            templateEl = tempDiv.firstElementChild;
        } catch (e) {
            console.error(e);
            if (errEl) {
                errEl.textContent = "No se pudo cargar la plantilla de entradas.";
                errEl.classList.remove("hidden");
            }
            return;
        }

        try {
            const posts = await fetchPosts();
            container.innerHTML = "";

            if (!Array.isArray(posts) || posts.length === 0) {
                if (errEl) {
                    errEl.textContent = "Aún no hay publicaciones en el blog.";
                    errEl.classList.remove("hidden");
                }
                return;
            }

            posts.forEach((post) => {
                const card = templateEl.cloneNode(true);

                const img = card.querySelector(".js-image");
                const imgUrl = featuredImageUrl(post);
                if (img) {
                    img.src = imgUrl || "/assets/img/placeholder.jpg";
                    img.alt = htmlToPlainText(post.title?.rendered || "Entrada del blog");
                }

                const dateEl = card.querySelector(".js-date");
                if (dateEl) dateEl.textContent = formatDate(post.date);

                const titleEl = card.querySelector(".js-title");
                if (titleEl) titleEl.textContent = htmlToPlainText(post.title?.rendered || "");

                const rawExcerpt = post.excerpt?.rendered || "";
                const excerptEl = card.querySelector(".js-excerpt");
                if (excerptEl) {
                    const plain = htmlToPlainText(rawExcerpt);
                    excerptEl.textContent = plain || htmlToPlainText(post.content?.rendered || "").slice(0, 180);
                }

                const cat = primaryCategoryName(post);
                const catEl = card.querySelector(".js-category");
                if (catEl && cat) {
                    catEl.textContent = cat;
                    catEl.classList.remove("hidden");
                }

                const link = card.querySelector(".js-read-link");
                if (link && post.slug) {
                    link.href = `/pages/entrada.html?slug=${encodeURIComponent(post.slug)}`;
                }

                container.appendChild(card);
            });
        } catch (e) {
            console.error(e);
            if (errEl) {
                errEl.textContent =
                    "No se pudieron cargar las entradas. Comprueba la conexión ";
                errEl.classList.remove("hidden");
            }
        }
    });
})();
