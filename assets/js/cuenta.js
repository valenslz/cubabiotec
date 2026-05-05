(function () {
    function $(id) {
        return document.getElementById(id);
    }

    const tabLogin = $("tab-login");
    const tabRegister = $("tab-register");
    const panelLogin = $("panel-login");
    const panelRegister = $("panel-register");
    const heading = $("cuenta-heading");
    const sub = $("cuenta-sub");

    const copy = {
        login: {
            title: "Bienvenido de vuelta",
            sub: "Accede a tu cuenta para gestionar tus pedidos y cursos.",
        },
        register: {
            title: "Crear cuenta",
            sub: "Regístrate para reservar cursos y comprar equipos.",
        },
    };

    function setTab(mode) {
        const isLogin = mode === "login";
        if (heading) heading.textContent = isLogin ? copy.login.title : copy.register.title;
        if (sub) sub.textContent = isLogin ? copy.login.sub : copy.register.sub;

        tabLogin.setAttribute("aria-selected", isLogin ? "true" : "false");
        tabRegister.setAttribute("aria-selected", isLogin ? "false" : "true");

        tabLogin.className =
            "flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors duration-200 " +
            (isLogin ? "bg-bio-dark text-white" : "text-bio-dark hover:bg-bio-pale/40");
        tabRegister.className =
            "flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors duration-200 " +
            (!isLogin ? "bg-bio-dark text-white" : "text-bio-dark hover:bg-bio-pale/40");

        panelLogin.classList.toggle("hidden", !isLogin);
        panelRegister.classList.toggle("hidden", isLogin);
    }

    tabLogin.addEventListener("click", () => setTab("login"));
    tabRegister.addEventListener("click", () => setTab("register"));

    const loginPass = $("login-password");
    const loginPassToggle = $("login-password-toggle");
    if (loginPass && loginPassToggle) {
        loginPassToggle.addEventListener("click", () => {
            const open = loginPassToggle.querySelector(".eye-open");
            const closed = loginPassToggle.querySelector(".eye-closed");
            const isPw = loginPass.getAttribute("type") === "password";
            loginPass.setAttribute("type", isPw ? "text" : "password");
            if (open && closed) {
                open.classList.toggle("hidden", isPw);
                closed.classList.toggle("hidden", !isPw);
            }
            loginPassToggle.setAttribute("aria-label", isPw ? "Ocultar contraseña" : "Mostrar contraseña");
        });
    }

    function showErr(el, msg) {
        if (!el) return;
        if (msg) {
            el.textContent = msg;
            el.classList.remove("hidden");
        } else {
            el.textContent = "";
            el.classList.add("hidden");
        }
    }

    function validateEmail(value) {
        const v = (value || "").trim();
        if (!v) return "Introduce tu correo electrónico.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Introduce un correo válido.";
        return "";
    }

    function validatePassword(value, minLen) {
        const v = value || "";
        if (!v) return "Introduce tu contraseña.";
        if (v.length < minLen) return `La contraseña debe tener al menos ${minLen} caracteres.`;
        return "";
    }

    function validateName(value, label) {
        const v = (value || "").trim();
        if (!v) return `Introduce tu ${label}.`;
        if (v.length < 2) return `El ${label} es demasiado corto.`;
        return "";
    }

    function validateUsername(value) {
        const v = (value || "").trim();
        if (!v) return "Introduce un nombre de usuario.";
        if (v.length < 3) return "El usuario debe tener al menos 3 caracteres.";
        if (v.length > 60) return "El usuario es demasiado largo.";
        if (!/^[a-zA-Z0-9._-]+$/.test(v)) {
            return "Solo letras, números, punto, guion y guion bajo.";
        }
        return "";
    }

    const formLogin = $("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", function (e) {
            e.preventDefault();
            const email = $("login-email");
            const pass = $("login-password");
            const errEmail = $("login-email-err");
            const errPass = $("login-password-err");
            const errForm = $("login-form-err");

            const e1 = validateEmail(email?.value);
            const e2 = validatePassword(pass?.value, 8);
            showErr(errEmail, e1);
            showErr(errPass, e2);
            showErr(errForm, "");

            if (e1 || e2) {
                showErr(errForm, "Revisa los campos marcados.");
                errForm.classList.remove("hidden");
                return;
            }
        });

        $("login-email")?.addEventListener("blur", function () {
            showErr($("login-email-err"), validateEmail(this.value));
        });
        $("login-password")?.addEventListener("blur", function () {
            showErr($("login-password-err"), validatePassword(this.value, 8));
        });
    }

    const formReg = $("form-register");
    if (formReg) {
        formReg.addEventListener("submit", function (e) {
            e.preventDefault();
            const n = $("reg-nombre");
            const a = $("reg-apellido");
            const u = $("reg-username");
            const em = $("reg-email");
            const p = $("reg-password");

            const eN = validateName(n?.value, "nombre");
            const eA = validateName(a?.value, "apellido");
            const eU = validateUsername(u?.value);
            const eE = validateEmail(em?.value);
            const eP = validatePassword(p?.value, 8);

            showErr($("reg-nombre-err"), eN);
            showErr($("reg-apellido-err"), eA);
            showErr($("reg-username-err"), eU);
            showErr($("reg-email-err"), eE);
            showErr($("reg-password-err"), eP);

            const errForm = $("reg-form-err");
            if (eN || eA || eU || eE || eP) {
                errForm.textContent = "Revisa los campos marcados.";
                errForm.classList.remove("hidden");
                return;
            }
            errForm.classList.add("hidden");
        });

        $("reg-nombre")?.addEventListener("blur", function () {
            showErr($("reg-nombre-err"), validateName(this.value, "nombre"));
        });
        $("reg-apellido")?.addEventListener("blur", function () {
            showErr($("reg-apellido-err"), validateName(this.value, "apellido"));
        });
        $("reg-username")?.addEventListener("blur", function () {
            showErr($("reg-username-err"), validateUsername(this.value));
        });
        $("reg-email")?.addEventListener("blur", function () {
            showErr($("reg-email-err"), validateEmail(this.value));
        });
        $("reg-password")?.addEventListener("blur", function () {
            showErr($("reg-password-err"), validatePassword(this.value, 8));
        });
    }
})();
