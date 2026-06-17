(function () {
    "use strict";

    var ALLOWED_TAGS = [
        "a", "abbr", "b", "blockquote", "br", "cite", "code", "del", "div", "em",
        "figcaption", "figure", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
        "li", "ol", "p", "pre", "s", "span", "strong", "sub", "sup", "table",
        "tbody", "td", "tfoot", "th", "thead", "tr", "ul"
    ];

    var ALLOWED_ATTR = [
        "alt", "aria-label", "class", "colspan", "height", "href", "loading",
        "rel", "rowspan", "src", "target", "title", "width"
    ];

    var SAFE_URL = /^(?:(?:https?:|mailto:|tel:|\/|#))/i;

    function isSafeUrl(value) {
        if (!value) return true;
        var trimmed = String(value).trim();
        return SAFE_URL.test(trimmed) && !/^javascript:/i.test(trimmed);
    }

    function hardenLinks(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("a[href]").forEach(function (a) {
            if (!isSafeUrl(a.getAttribute("href"))) {
                a.removeAttribute("href");
            }
            if (a.target === "_blank") {
                a.rel = "noopener noreferrer";
            }
        });
        root.querySelectorAll("img[src]").forEach(function (img) {
            if (!isSafeUrl(img.getAttribute("src"))) {
                img.removeAttribute("src");
            }
            img.loading = img.loading || "lazy";
            img.decoding = "async";
        });
    }

    function fallbackSanitize(html) {
        var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
        doc.body.querySelectorAll("*").forEach(function (el) {
            var tag = el.tagName.toLowerCase();
            if (ALLOWED_TAGS.indexOf(tag) === -1) {
                el.replaceWith(document.createTextNode(el.textContent || ""));
                return;
            }

            Array.from(el.attributes).forEach(function (attr) {
                var name = attr.name.toLowerCase();
                if (name.indexOf("on") === 0 || ALLOWED_ATTR.indexOf(name) === -1) {
                    el.removeAttribute(attr.name);
                    return;
                }
                if ((name === "href" || name === "src") && !isSafeUrl(attr.value)) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        hardenLinks(doc.body);
        return doc.body.innerHTML;
    }

    function sanitizeHtml(html) {
        if (!html) return "";

        if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
            var clean = window.DOMPurify.sanitize(String(html), {
                ALLOWED_TAGS: ALLOWED_TAGS,
                ALLOWED_ATTR: ALLOWED_ATTR,
                ALLOW_DATA_ATTR: false,
                FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
                FORBID_ATTR: ["style", "srcdoc"],
                RETURN_DOM_FRAGMENT: true
            });
            var wrapper = document.createElement("div");
            wrapper.appendChild(clean);
            hardenLinks(wrapper);
            return wrapper.innerHTML;
        }

        return fallbackSanitize(html);
    }

    function textFromHtml(html) {
        if (!html) return "";
        var doc = new DOMParser().parseFromString(sanitizeHtml(html), "text/html");
        return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    }

    window.CBBT_SECURITY = Object.freeze({
        sanitizeHtml: sanitizeHtml,
        textFromHtml: textFromHtml,
        isSafeUrl: isSafeUrl
    });
})();
