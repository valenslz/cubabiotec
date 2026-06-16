/**
 * Aplica fade-in cuando la imagen termina de cargar (o falla, para no dejarla invisible).
 * Reutilizable al cambiar `src` (p. ej. galería de producto).
 */
function bindImageFade(img) {
  if (!img || !img.classList.contains("img-fade")) return;
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

function scanImageFades(root) {
  const el = root && root.nodeType === 1 ? root : document;
  el.querySelectorAll("img.img-fade").forEach(bindImageFade);
}

function initImageFadeObserver() {
  scanImageFades(document);

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches("img.img-fade")) {
          bindImageFade(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll("img.img-fade").forEach(bindImageFade);
        }
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

window.bindImageFade = bindImageFade;

document.addEventListener("DOMContentLoaded", () => {
  initImageFadeObserver();

  const headerFetch = fetch("/components/header.html", { cache: "no-store" })
    .then((res) => res.text())
    .then((data) => {
      const host = document.getElementById("header");
      if (host) host.innerHTML = data;
      initHeaderShell();
    });

  const footerFetch = fetch("/components/footer.html", { cache: "no-store" })
    .then((res) => res.text())
    .then((data) => {
      const host = document.getElementById("footer");
      if (host) {
        host.innerHTML = data;
        const yearEl = document.getElementById("footer-year");
        if (yearEl) yearEl.textContent = String(new Date().getFullYear());
      }
    });

  const miniFetch = fetch("/components/minicart.html", { cache: "no-store" })
    .then((res) => res.text())
    .then((html) => {
      let root = document.getElementById("minicart-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "minicart-root";
        document.body.appendChild(root);
      }
      root.innerHTML = html;
    });

  Promise.all([headerFetch, footerFetch, miniFetch])
    .then(() => {
      if (typeof window.initMinicart === "function") {
        window.initMinicart();
      }
    })
    .catch(console.error);
});

function getHeaderMode() {
  return document.body?.dataset?.headerMode === "index" ? "index" : "solid";
}

function getActiveNavKey() {
  const path =
    window.location.pathname.replace(/\\/g, "/").replace(/\/+$/, "") || "/";
  const lower = path.toLowerCase();
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";

  if (path === "/" || last === "" || last === "index.html") return "inicio";
  if (lower === "/contacto" || last === "contacto") return "contacto";
  if (lower.includes("/cuenta")) return "cuenta";
  if (lower.includes("/blog") || lower.includes("/entrada")) return "blog";
  if (lower === "/cursos" || last === "cursos") return "cursos";
  if (lower === "/servicios" || last === "servicios") return "servicios";
  if (lower.includes("/producto")) {
    try {
      const q = new URLSearchParams(String(window.location.search || ""));
      if (q.get("from") === "cursos") return "cursos";
    } catch (_) {
      /* ignore */
    }
    return "productos";
  }
  if (lower === "/productos" || last === "productos") return "productos";
  return null;
}

function initNavActive() {
  const key = getActiveNavKey();
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.removeAttribute("data-active");
    el.classList.remove("nav-link--active");
  });
  if (!key) return;
  const active = document.querySelector(`[data-nav="${key}"]`);
  if (active) {
    active.setAttribute("data-active", "true");
    active.classList.add("nav-link--active");
  }
}

function isIndexHeroTransparent() {
  return getHeaderMode() === "index" && window.scrollY <= 80;
}

const NAV_LINK_BASE =
  "nav-link block md:inline-block px-4 py-3 md:py-2 rounded-full text-sm font-medium font-body transition-all duration-200 whitespace-nowrap";

function refreshHeaderAppearance() {
  const header = document.getElementById("main-header");
  if (!header) return;

  const mode = getHeaderMode();
  const heroTransparent = isIndexHeroTransparent();
  const headerIsLight = mode === "solid" || !heroTransparent;
  const activeNavKey = getActiveNavKey();

  if (mode === "solid") {
    header.classList.remove("bg-transparent", "text-white");
    header.classList.add(
      "bg-white",
      "border-b",
      "border-gray-100",
      "shadow-sm",
    );
  } else {
    if (heroTransparent) {
      header.classList.remove(
        "bg-white",
        "border-b",
        "border-gray-100",
        "shadow-sm",
      );
      header.classList.add("bg-transparent");
    } else {
      header.classList.remove("bg-transparent");
      header.classList.add(
        "bg-white",
        "border-b",
        "border-gray-100",
        "shadow-sm",
      );
    }
  }

  header.querySelectorAll(".nav-link[data-nav]").forEach((link) => {
    const navKey = link.getAttribute("data-nav");
    const isActive = Boolean(activeNavKey && navKey === activeNavKey);
    link.className = NAV_LINK_BASE;
    if (isActive) {
      link.classList.add(
        "bg-bio-pale",
        "text-bio-dark",
        "font-semibold",
        "max-md:bg-bio-pale",
        "max-md:text-bio-dark",
      );
    } else if (headerIsLight) {
      link.classList.add(
        "text-gray-900",
        "hover:bg-gray-100",
        "max-md:text-gray-900",
      );
    } else {
      link.classList.add(
        "max-md:text-gray-900",
        "max-md:hover:bg-gray-100",
        "text-gray-900",
        "md:text-white/90",
        "md:hover:bg-white/10",
        "md:hover:text-white",
      );
    }
  });

  const iconBtns = header.querySelectorAll(".header-icon-btn");
  const menuBtn = header.querySelector(".header-menu-btn");

  iconBtns.forEach((btn) => {
    btn.classList.remove(
      "text-gray-900",
      "text-white",
      "hover:bg-gray-100",
      "hover:bg-white/10",
      "bg-bio-pale",
      "text-bio-dark",
      "hover:bg-bio-pale/80",
    );
    const isAccount = btn.id === "header-account-link";
    const accountActive = isAccount && activeNavKey === "cuenta";
    if (accountActive) {
      btn.classList.add("bg-bio-pale", "text-bio-dark", "hover:bg-bio-pale/80");
    } else if (headerIsLight) {
      btn.classList.add("text-gray-900", "hover:bg-gray-100");
    } else {
      btn.classList.add("text-white", "hover:bg-white/10");
    }
  });

  if (menuBtn) {
    menuBtn.classList.remove(
      "text-gray-900",
      "text-white",
      "hover:bg-gray-100",
      "hover:bg-white/10",
    );
    if (headerIsLight) {
      menuBtn.classList.add("text-gray-900", "hover:bg-gray-100");
    } else {
      menuBtn.classList.add("text-white", "hover:bg-white/10");
    }
  }
}

function initHeaderScroll() {
  const mode = getHeaderMode();
  if (mode !== "index") return;

  const onScroll = () => {
    refreshHeaderAppearance();
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initHeaderShell() {
  initNavActive();
  refreshHeaderAppearance();
  initHeaderScroll();
  initMobileNav();
}

function initMobileNav() {
  const toggle = document.getElementById("header-menu-toggle");
  const nav = document.getElementById("main-nav");
  const backdrop = document.getElementById("mobile-nav-backdrop");
  const header = document.getElementById("main-header");
  if (!toggle || !nav) return;
  const iconOpen = toggle.querySelector(".header-menu-icon-open");
  const iconClose = toggle.querySelector(".header-menu-icon-close");

  const mq = window.matchMedia("(min-width: 768px)");
  let isOpen = false;

  function setBackdrop(open) {
    if (!backdrop) return;
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.classList.toggle("is-visible", open);
    backdrop.classList.toggle("opacity-0", !open);
    backdrop.classList.toggle("pointer-events-none", !open);
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    nav.classList.remove("is-open");
    header?.classList.remove("mobile-nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
    document.body.classList.remove("mobile-menu-open");
    document.body.style.overflow = "";
    setBackdrop(false);
    if (iconOpen && iconClose) {
      iconOpen.classList.remove("hidden");
      iconClose.classList.add("hidden");
    }
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    nav.classList.add("is-open");
    header?.classList.add("mobile-nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
    document.body.classList.add("mobile-menu-open");
    document.body.style.overflow = "hidden";
    toggle.classList.remove("text-white");
    toggle.classList.add("text-gray-900");

    document
      .querySelectorAll("#header-account-link, #minicart-open-btn")
      .forEach((el) => {
        el.classList.remove("text-white");
        el.classList.add("text-gray-900");
      });
    setBackdrop(true);
    if (iconOpen && iconClose) {
      iconOpen.classList.add("hidden");

      iconClose.classList.remove("hidden");
    }
    const firstLink = nav.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function onToggle() {
    if (mq.matches) return;
    if (isOpen) closeMenu();
    else openMenu();
  }

  toggle.addEventListener("click", onToggle);
  backdrop?.addEventListener("click", () => {
    if (!mq.matches) closeMenu();
  });

  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (!mq.matches) closeMenu();
    });
  });

  mq.addEventListener("change", (e) => {
    if (e.matches) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeMenu();
      toggle.focus();
    }
    if (e.key === "Tab" && isOpen && !mq.matches) {
      const focusable = nav.querySelectorAll("a, button");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
