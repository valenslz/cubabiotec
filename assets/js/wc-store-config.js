/**
 * Base de la WooCommerce Store API (headless). Cambia solo aquí si cambia el dominio o la ruta.
 * @see https://developer.woocommerce.com/docs/apis/store-api/
 */
window.WC_STORE_BASE =
    window.WC_STORE_BASE || "https://cms.cubabiotec.com/wp-json/wc/store/v1";

/** Página de checkout en WordPress (pago). Usada si el carrito no devuelve checkout_url. */
window.WC_CHECKOUT_URL =
    window.WC_CHECKOUT_URL || "https://cms.cubabiotec.com/checkout/";

/** Gateway PayPal (PayPal Payments). Store API `payment_method`. */
window.WC_CHECKOUT_PAYMENT_METHOD =
    window.WC_CHECKOUT_PAYMENT_METHOD || "ppcp-gateway";

/** Umbral de envío gratis en pesos COP (enteros). 0 = oculta la barra de progreso en el mini-carrito. */
window.FREE_SHIPPING_THRESHOLD_COP =
    typeof window.FREE_SHIPPING_THRESHOLD_COP === "number"
        ? window.FREE_SHIPPING_THRESHOLD_COP
        : 150000;
