/**
 * Peticiones WordPress REST API (posts), sin _embed.
 * Imagen destacada y nombre de categoría solo si hace falta (peticiones extra mínimas).
 * Depende de wp-rest-config.js (window.WP_REST_BASE).
 */

const POST_FIELDS = [
    "id",
    "slug",
    "title",
    "excerpt",
    "content",
    "date",
    "featured_media",
    "link",
    "categories"
].join(",");

const postCache = new Map();

export function getWpBase() {
    return window.WP_REST_BASE || "https://cms.cubabiotec.com/wp-json/wp/v2";
}

function rememberPost(post) {
    if (!post || post.slug == null) return;
    postCache.set(`slug:${post.slug}`, post);
    if (post.id != null) postCache.set(`id:${post.id}`, post);
}

function pickUrlFromMedia(media) {
    if (!media) return "";
    return (
        media.source_url ||
        media.media_details?.sizes?.large?.source_url ||
        media.media_details?.sizes?.medium_large?.source_url ||
        media.media_details?.sizes?.medium?.source_url ||
        ""
    );
}

async function fetchFeaturedUrl(mediaId) {
    if (!mediaId || Number(mediaId) <= 0) return "";
    const WP_BASE = getWpBase();
    const res = await fetch(
        `${WP_BASE}/media/${encodeURIComponent(String(mediaId))}?_fields=source_url,media_details`
    );
    if (!res.ok) return "";
    const media = await res.json();
    return pickUrlFromMedia(media);
}

async function fetchPrimaryCategoryName(categoryIds) {
    if (!Array.isArray(categoryIds) || !categoryIds.length) return "";
    const WP_BASE = getWpBase();
    const include = categoryIds
        .map((n) => parseInt(String(n), 10))
        .filter((n) => !Number.isNaN(n) && n > 0)
        .join(",");
    if (!include) return "";
    const res = await fetch(
        `${WP_BASE}/categories?include=${encodeURIComponent(include)}&_fields=id,name`
    );
    if (!res.ok) return "";
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return "";
    const firstId = parseInt(String(categoryIds[0]), 10);
    const match = list.find((c) => c.id === firstId);
    return match ? match.name : list[0].name;
}

async function enrichPost(post) {
    const mediaId = post.featured_media;
    const catIds = post.categories;
    const [featuredUrl, primaryCat] = await Promise.all([
        fetchFeaturedUrl(mediaId),
        fetchPrimaryCategoryName(catIds)
    ]);
    post._resolvedFeaturedUrl = featuredUrl;
    post._resolvedPrimaryCategory = primaryCat;
    return post;
}

export async function fetchPostBySlug(slug) {
    const key = `slug:${slug}`;
    if (postCache.has(key)) {
        return postCache.get(key);
    }

    const WP_BASE = getWpBase();
    const res = await fetch(
        `${WP_BASE}/posts?slug=${encodeURIComponent(slug)}&_fields=${encodeURIComponent(POST_FIELDS)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = Array.isArray(data) && data.length ? data[0] : null;
    if (!raw) return null;

    const enriched = await enrichPost(raw);
    rememberPost(enriched);
    return enriched;
}

export async function fetchPostById(id) {
    const key = `id:${id}`;
    if (postCache.has(key)) {
        return postCache.get(key);
    }

    const WP_BASE = getWpBase();
    const res = await fetch(
        `${WP_BASE}/posts/${encodeURIComponent(String(id))}?_fields=${encodeURIComponent(POST_FIELDS)}`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    const enriched = await enrichPost(raw);
    rememberPost(enriched);
    return enriched;
}
