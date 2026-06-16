/**
 * Validación y envío del formulario de contacto.
 * Configura window.CONTACT_FORM_ENDPOINT para integrar con WordPress / API externa.
 */
(function () {
    const ENDPOINT = window.CONTACT_FORM_ENDPOINT || null;

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const rules = {
        nombre: { required: true, min: 2, message: "Ingresa tu nombre completo." },
        empresa: { required: false },
        email: { required: true, pattern: EMAIL_RE, message: "Ingresa un correo electrónico válido." },
        telefono: { required: true, min: 7, message: "Ingresa un número de teléfono válido." },
        ubicacion: { required: true, min: 2, message: "Indica tu ciudad o país." },
        interes: { required: true, message: "Selecciona un área de interés." },
        mensaje: { required: true, min: 10, message: "El mensaje debe tener al menos 10 caracteres." },
    };

    function getFieldWrapper(input) {
        return input.closest(".form-field");
    }

    function setFieldState(input, valid, message) {
        const wrapper = getFieldWrapper(input);
        if (!wrapper) return;
        input.classList.remove("is-valid", "is-invalid");
        wrapper.classList.remove("is-error");
        const errEl = wrapper.querySelector(".form-field__error");
        if (valid) {
            if (input.value.trim()) input.classList.add("is-valid");
            if (errEl) errEl.textContent = "";
        } else {
            input.classList.add("is-invalid");
            wrapper.classList.add("is-error");
            if (errEl) errEl.textContent = message || "Campo inválido.";
        }
    }

    function validateField(input) {
        const name = input.name;
        const rule = rules[name];
        if (!rule) return true;
        const value = input.value.trim();
        if (rule.required && !value) {
            setFieldState(input, false, rule.message || "Este campo es obligatorio.");
            return false;
        }
        if (!rule.required && !value) {
            setFieldState(input, true);
            return true;
        }
        if (rule.min && value.length < rule.min) {
            setFieldState(input, false, rule.message);
            return false;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
            setFieldState(input, false, rule.message);
            return false;
        }
        setFieldState(input, true);
        return true;
    }

    function initContactForm() {
        const form = document.getElementById("contact-form");
        if (!form) return;

        const successEl = document.getElementById("contact-form-success");
        const submitBtn = form.querySelector('[type="submit"]');
        const fields = form.querySelectorAll("input, select, textarea");

        fields.forEach((field) => {
            field.addEventListener("blur", () => validateField(field));
            field.addEventListener("input", () => {
                if (field.classList.contains("is-invalid")) validateField(field);
            });
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            let valid = true;
            fields.forEach((field) => {
                if (!validateField(field)) valid = false;
            });
            if (!valid) {
                const firstInvalid = form.querySelector(".is-invalid");
                firstInvalid?.focus();
                return;
            }

            const payload = Object.fromEntries(new FormData(form).entries());
            submitBtn.disabled = true;
            submitBtn.setAttribute("aria-busy", "true");

            try {
                if (ENDPOINT) {
                    const res = await fetch(ENDPOINT, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error("Error al enviar");
                } else {
                    await new Promise((r) => setTimeout(r, 800));
                }

                form.reset();
                fields.forEach((f) => {
                    f.classList.remove("is-valid", "is-invalid");
                    getFieldWrapper(f)?.classList.remove("is-error");
                });
                form.classList.add("hidden");
                successEl?.classList.add("is-visible");
                successEl?.focus();
            } catch (err) {
                setFieldState(form.querySelector('[name="email"]'), false, "No pudimos enviar tu mensaje. Intenta de nuevo.");
                console.error(err);
            } finally {
                submitBtn.disabled = false;
                submitBtn.removeAttribute("aria-busy");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initContactForm);
})();
