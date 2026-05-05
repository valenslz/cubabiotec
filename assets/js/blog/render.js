import { htmlToPlainText, sanitizeContent, featuredImageUrl, primaryCategoryName, formatDate } from "./utils.js";
import { applyImageFade, wireBodyImages } from "./images.js";

const $ = (id) => document.getElementById(id);

export function renderEntrada(post) {
    const titlePlain = htmlToPlainText(post.title?.rendered || "");
    const heroUrl = featuredImageUrl(post);

    const heroWrap = $("entrada-hero-wrap");
    const heroImg = $("entrada-hero-img");
    if (heroUrl && heroImg && heroWrap) {
        heroImg.alt = titlePlain;
        heroImg.src = heroUrl;
        heroWrap.classList.remove("hidden");
        requestAnimationFrame(() => applyImageFade(heroImg));
    } else if (heroWrap) {
        heroWrap.classList.add("hidden");
    }

    const cat = primaryCategoryName(post);
    const catEl = $("entrada-cat");
    if (catEl && cat) {
        catEl.textContent = cat;
        catEl.classList.remove("hidden");
    } else if (catEl) {
        catEl.textContent = "";
        catEl.classList.add("hidden");
    }

    const dateEl = $("entrada-date");
    if (dateEl) dateEl.textContent = formatDate(post.date);

    const h1 = $("entrada-title");
    if (h1) h1.textContent = titlePlain;

    const excerptHtml = post.excerpt?.rendered || "";
    const excerptPlain = htmlToPlainText(excerptHtml);
    const lead = $("entrada-lead");
    if (lead && excerptPlain.length > 40) {
        lead.textContent = excerptPlain;
        lead.hidden = false;
    } else if (lead) {
        lead.hidden = true;
        lead.textContent = "";
    }

    const body = $("entrada-body");
    if (body) {
        const raw = post.content?.rendered || "";
        body.innerHTML = sanitizeContent(raw);
        wireBodyImages(body);
    }

    const orig = $("entrada-original");
    if (orig && post.link) {
        orig.href = post.link;
        orig.classList.remove("hidden");
    } else if (orig) {
        orig.classList.add("hidden");
    }
}
