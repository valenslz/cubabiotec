# Auditoria Pre-Produccion - CuBaBiotec

Fecha de auditoria: 2026-06-17

Este informe documenta el estado inicial observado antes de aplicar correcciones de produccion. El objetivo es dejar el frontend headless listo para publicar con foco en seguridad, SEO, performance, mantenibilidad y compatibilidad con WordPress/WooCommerce.

## 1. Arquitectura actual

El proyecto es un frontend estatico/headless construido con HTML, CSS generado por Tailwind CSS v4 y JavaScript Vanilla. Consume dos backends remotos:

- WordPress REST API: `https://cms.cubabiotec.com/wp-json/wp/v2`
- WooCommerce Store API: `https://cms.cubabiotec.com/wp-json/wc/store/v1`

Estructura funcional observada:

- `index.html`: home publica.
- `productos/`, `cursos/`, `blog/`, `servicios/`, `contacto/`: rutas limpias ya existentes.
- `pages/`: contiene paginas transaccionales y dinamicas (`carrito`, `checkout`, `cuenta`, `producto`, `entrada`) y tambien paginas legacy con redireccion.
- `components/`: fragmentos HTML cargados por `assets/js/app.js` para header, footer y minicart.
- `assets/js/`: scripts globales y de pagina.
- `assets/js/blog/`: modulos ES para entrada individual del blog.
- `services/`: codigo legacy no conectado al sitio actual.
- `dist/output.css`: CSS compilado.

## 2. Flujo de navegacion

1. El navegador carga una pagina HTML estatica.
2. `assets/js/app.js` inyecta `components/header.html`, `components/footer.html` y `components/minicart.html`.
3. Las paginas de catalogo consultan la Store API y renderizan tarjetas desde `components/cardproducto.html`.
4. El blog consulta WP REST API y renderiza tarjetas desde `components/cardblog.html`.
5. Producto y entrada individual dependen de parametros `slug` o `id`.
6. El carrito usa `cart-token` de WooCommerce guardado en `sessionStorage`.

Problema inicial: parte de la navegacion todavia apunta a `/pages/*.html`, lo que mezcla URLs limpias con rutas tecnicas y genera redirecciones innecesarias.

## 3. Dependencias

- `tailwindcss`
- `@tailwindcss/cli`
- Remix Icon por CDN.
- APIs remotas de WordPress/WooCommerce.

No hay bundler de JavaScript ni dependencias npm de runtime para el navegador. Esto simplifica despliegue, pero exige disciplina en orden de carga, CSP y manejo de globals.

## 4. Riesgos detectados

### Seguridad

- `passw.txt` aparece eliminado en el working tree. Este archivo no debe volver al repositorio ni a produccion; contenia credenciales segun el informe previo.
- Hay sanitizacion manual insuficiente de HTML remoto:
  - `assets/js/producto.js`
  - `assets/js/blog/utils.js`
- El HTML remoto de WordPress/WooCommerce puede contener atributos peligrosos (`onerror`, `onclick`, `style`, `srcdoc`, `javascript:`) que no se eliminaban de forma consistente.
- `assets/js/wc-cart.js` imprimia tokens del carrito en consola.
- No habia politica CSP declarada en las configuraciones de hosting.
- Faltaban cabeceras defensivas contra clickjacking, MIME sniffing y fugas de referrer.
- `sessionStorage` se usa para el token del carrito. Es aceptable para WooCommerce Store API, pero no debe registrarse en consola ni tratarse como secreto permanente.

### SEO

- Canonical de producto y entrada apuntaba a `/pages/producto.html` y `/pages/entrada.html`.
- Rutas transaccionales no estaban bloqueadas en `robots.txt`.
- `sitemap.xml` no reflejaba todas las rutas limpias previstas.
- Redirecciones legacy solo cubrian paginas informativas, no carrito/checkout/cuenta/producto/entrada.

### Performance

- Varios scripts de configuracion y carrito se cargaban sin `defer`, bloqueando parsing HTML.
- El header/footer/minicart se cargan por fetch en cada pagina. Es aceptable para un sitio estatico pequeno, pero debe mantenerse cacheable y seguro.
- Logs verbosos en produccion afectan diagnostico y exponen datos.

### Arquitectura y mantenibilidad

- `services/auth.js` esta vacio y `services/productos.js` duplica logica de catalogo no usada.
- Hay duplicacion de utilidades (`htmlToPlainText`, formateo de moneda) en varios scripts. No toda duplicacion merece refactor ahora, pero las zonas de seguridad si deben centralizarse.
- `SITE_ROUTES` existe, pero no se usa de forma consistente.
- Las paginas legacy con meta refresh y script inline dificultan CSP estricta.

## 5. Vulnerabilidades e inconsistencias concretas

- Stored/DOM XSS potencial al insertar HTML de CMS con `innerHTML` luego de una limpieza incompleta.
- Riesgo de DOM XSS por URLs remotas no normalizadas en enlaces/imagenes.
- Token de carrito visible en DevTools por `console.log`.
- Falta de `Content-Security-Policy`.
- Falta de `X-Frame-Options` o `frame-ancestors`.
- Falta de `X-Content-Type-Options: nosniff`.
- Falta de `Referrer-Policy`.
- Falta de `Permissions-Policy`.
- Rutas canonicas inconsistentes entre header, scripts y paginas.
- Redirecciones legacy con JavaScript inline.

## 6. Deuda tecnica priorizada

1. Centralizar sanitizacion de HTML remoto.
2. Normalizar rutas limpias y redirecciones.
3. Endurecer headers de seguridad.
4. Eliminar logs y exposicion accidental de tokens.
5. Retirar o aislar codigo legacy no usado.
6. Ajustar SEO tecnico basico: canonical, robots y sitemap.
7. Diferir scripts no criticos cuando el orden de dependencias lo permita.

## 7. Criterio de remediacion

Se aplicaran cambios pequenos y de alto impacto:

- Sin sobreingenieria ni bundler nuevo.
- Sin dividir archivos por dividir.
- Sanitizacion centralizada porque reduce riesgo real.
- Rutas centralizadas donde ya existe `SITE_ROUTES`.
- Headers de seguridad compatibles con WordPress Headless, WooCommerce Store API, PayPal y CDN de iconos.
- Documentacion de cada cambio aplicado en este mismo informe.

## 8. Registro de cambios aplicados

Pendiente de completar durante la remediacion.
