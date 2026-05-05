/**
 * Fade de imágenes (coherente con app.js / producto).
 */

export function applyImageFade(img) {
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

export function wireBodyImages(root) {
    if (!root) return;
    root.querySelectorAll("img").forEach((im) => {
        im.classList.add("img-fade");
        im.classList.remove("img-fade--ready");
        im.decoding = "async";
        im.loading = "lazy";
        requestAnimationFrame(() => applyImageFade(im));
    });
}
