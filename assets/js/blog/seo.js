import { htmlToPlainText } from "./utils.js";

function setMeta(attr, key, value) {
    const sel = attr === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
    let el = document.head.querySelector(sel);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", value);
}

export function applySEO(post, imageUrl) {
    const site = String(window.SITE_NAME || "CuBaBiotec");
    const titlePlain = htmlToPlainText(post.title?.rendered || "Entrada");
    const excerpt = htmlToPlainText(post.excerpt?.rendered || "").slice(0, 160);
    const desc = excerpt || `${titlePlain} — ${site}`;
    const slug = post.slug || "";
    const origin = String(window.SITE_ORIGIN || window.location.origin || "").replace(/\/$/, "");
    const canonical = `${origin}/entrada?slug=${encodeURIComponent(slug)}`;

    document.title = `${titlePlain} — Blog · ${site}`;
    setMeta("name", "description", desc);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:title", `${titlePlain} | ${site}`);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", canonical);
    if (imageUrl) setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:card", imageUrl ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", `${titlePlain} | ${site}`);
    setMeta("name", "twitter:description", desc);
    if (imageUrl) setMeta("name", "twitter:image", imageUrl);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
    }
    link.href = canonical;
}
