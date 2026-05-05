import { fetchPostBySlug, fetchPostById } from "./api.js";
import { featuredImageUrl } from "./utils.js";
import { applySEO } from "./seo.js";
import { renderEntrada } from "./render.js";

const $ = (id) => document.getElementById(id);

function setLoading(on) {
    document.body.classList.toggle("loading", on);
    const sk = $("entrada-skeleton");
    if (sk) sk.classList.toggle("hidden", !on);
}

function showError(msg, opts) {
    const { showRetry } = opts || {};
    setLoading(false);
    $("entrada-content")?.classList.add("hidden");
    const err = $("entrada-error");
    if (err) err.classList.remove("hidden");
    const m = $("entrada-error-msg");
    if (m) m.textContent = msg;
    const retry = $("entrada-error-retry");
    if (retry) {
        retry.classList.toggle("hidden", !showRetry);
    }
}

function showContent() {
    setLoading(false);
    $("entrada-error")?.classList.add("hidden");
    $("entrada-content")?.classList.remove("hidden");
}

function parseParams() {
    const params = new URLSearchParams(window.location.search);
    const slugRaw = params.get("slug");
    const slug = slugRaw && String(slugRaw).trim() ? String(slugRaw).trim() : "";
    const idParam = params.get("id");
    const idNum = idParam != null && idParam !== "" ? parseInt(idParam, 10) : NaN;
    return { slug, idNum };
}

async function loadEntrada() {
    const { slug, idNum } = parseParams();

    if (!slug && Number.isNaN(idNum)) {
        showError("Falta el slug o el id de la entrada en la URL.", { showRetry: false });
        return;
    }

    setLoading(true);
    $("entrada-error")?.classList.add("hidden");
    $("entrada-content")?.classList.add("hidden");

    let post = null;
    try {
        if (slug) {
            post = await fetchPostBySlug(slug);
        }
        if (!post && !Number.isNaN(idNum)) {
            post = await fetchPostById(idNum);
        }
    } catch (e) {
        console.error(e);
        showError("No se pudo cargar la entrada. Revisa la conexión o la URL.", { showRetry: true });
        return;
    }

    if (!post) {
        showError("No existe una entrada con ese enlace.", { showRetry: false });
        return;
    }

    const heroUrl = featuredImageUrl(post);
    applySEO(post, heroUrl);
    renderEntrada(post);
    showContent();
}

document.addEventListener("DOMContentLoaded", () => {
    void loadEntrada();

    $("entrada-error-retry")?.addEventListener("click", () => {
        void loadEntrada();
    });
});
