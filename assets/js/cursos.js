const WC_STORE_BASE =
    window.WC_STORE_BASE || "https://cms.cubabiotec.com/wp-json/wc/store/v1";

async function renderizarCursos() {
    const container = document.getElementById("cursos");
    if (!container) return;

    try {
        const [templateRes, productsRes] = await Promise.all([
            fetch("/components/cardproducto.html"),
            fetch(`${WC_STORE_BASE}/products?per_page=100`)
        ]);

        if (!templateRes.ok) throw new Error("No se encontró cardproducto.html");
        if (!productsRes.ok) throw new Error(`Catálogo no disponible (${productsRes.status})`);

        const templateHTML = await templateRes.text();
        const products = await productsRes.json();

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateHTML.trim();
        const cardTemplate = tempDiv.firstElementChild;

        container.innerHTML = "";

        const soloCursos = products.filter((p) => window.productoEsCurso(p));
        window.appendProductoCards(container, soloCursos, cardTemplate, { from: "cursos" });
    } catch (error) {
        console.error("Error al cargar cursos:", error);
    }
}

document.addEventListener("DOMContentLoaded", renderizarCursos);
