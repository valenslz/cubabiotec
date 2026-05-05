/** Texto plano desde HTML (títulos, excerpts, SEO). */
export function htmlToPlainText(html) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
}

/** Fecha de publicación legible (Colombia). */
export function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

export function sanitizeContent(html) {
    if (!html) return "";
    const d = document.createElement("div");
    d.innerHTML = html;
    d.querySelectorAll("script, iframe, object, embed").forEach((el) => el.remove());
    d.querySelectorAll("[onclick]").forEach((el) => el.removeAttribute("onclick"));
    return d.innerHTML;
}

export function featuredImageUrl(post) {
    if (post._resolvedFeaturedUrl != null) {
        return post._resolvedFeaturedUrl;
    }
    const emb = post._embedded;
    const media = emb && emb["wp:featuredmedia"] && emb["wp:featuredmedia"][0];
    if (!media) return "";
    return (
        media.source_url ||
        media.media_details?.sizes?.large?.source_url ||
        media.media_details?.sizes?.medium_large?.source_url ||
        media.media_details?.sizes?.medium?.source_url ||
        ""
    );
}

export function primaryCategoryName(post) {
    if (post._resolvedPrimaryCategory != null) {
        return post._resolvedPrimaryCategory;
    }
    const terms = post._embedded && post._embedded["wp:term"];
    if (!Array.isArray(terms) || !terms.length) return "";
    const cats = terms.find((t) => t && t[0] && t[0].taxonomy === "category");
    return cats && cats[0] ? cats[0].name : "";
}
