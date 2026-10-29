"use strict";

/* ==========================================================================
   LOGIN - SIGESTI
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const password =
        document.getElementById("password");

    const btnMostrarPassword =
        document.getElementById("btnMostrarPassword");

    const avisoMayusculas =
        document.getElementById("avisoMayusculas");

    const formLogin =
        document.getElementById("formLogin");

    const btnIniciarSesion =
        document.getElementById("btnIniciarSesion");

    const formCambiarPassword =
        document.getElementById("formCambiarPassword");

    const passwordNueva =
        document.getElementById("passwordNueva");

    const confirmarPassword =
        document.getElementById("confirmarPassword");

    const errorCoincidencia =
        document.getElementById("errorCoincidencia");

    const btnCambiarPassword =
        document.getElementById("btnCambiarPassword");

    const passwordCambiada =
        document.getElementById("passwordCambiada");


    /* ======================================================================
       MOSTRAR CONTRASEÑA DEL LOGIN
       ====================================================================== */

    if (password && btnMostrarPassword) {

        btnMostrarPassword.addEventListener(
            "click",
            function () {

                cambiarVisibilidadPassword(
                    password,
                    btnMostrarPassword
                );
            }
        );
    }


    /* ======================================================================
       DETECTAR BLOQ MAYÚS
       ====================================================================== */

    if (password && avisoMayusculas) {

        password.addEventListener(
            "keydown",
            function (evento) {

                actualizarAvisoMayusculas(
                    evento,
                    avisoMayusculas
                );
            }
        );

        password.addEventListener(
            "keyup",
            function (evento) {

                actualizarAvisoMayusculas(
                    evento,
                    avisoMayusculas
                );
            }
        );

        password.addEventListener(
            "blur",
            function () {

                avisoMayusculas.classList.remove(
                    "activo"
                );
            }
        );
    }


    /* ======================================================================
       MOSTRAR CONTRASEÑAS DEL MODAL
       ====================================================================== */

    const botonesPasswordModal =
        document.querySelectorAll(
            ".btn-mostrar-modal"
        );

    botonesPasswordModal.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    const idInput =
                        boton.dataset.input;

                    const input =
                        document.getElementById(idInput);

                    if (!input) {
                        return;
                    }

                    cambiarVisibilidadPassword(
                        input,
                        boton
                    );
                }
            );
        }
    );


    /* ======================================================================
       CONTROLAR ENVÍO DEL LOGIN
       ====================================================================== */

    if (formLogin && btnIniciarSesion) {

        formLogin.addEventListener(
            "submit",
            function () {

                if (!formLogin.checkValidity()) {
                    return;
                }

                btnIniciarSesion.disabled = true;

                btnIniciarSesion.innerHTML =
                    "<span>Iniciando sesión...</span>";
            }
        );
    }


    /* ======================================================================
       VALIDAR CAMBIO DE CONTRASEÑA
       ====================================================================== */

    if (
        formCambiarPassword &&
        passwordNueva &&
        confirmarPassword
    ) {

        formCambiarPassword.addEventListener(
            "submit",
            function (evento) {

                limpiarMensajeCambio(
                    errorCoincidencia
                );

                const nueva =
                    passwordNueva.value;

                const confirmacion =
                    confirmarPassword.value;

                if (nueva.length < 6) {

                    evento.preventDefault();

                    mostrarMensajeCambio(
                        errorCoincidencia,
                        "La contraseña debe tener al menos 6 caracteres."
                    );

                    passwordNueva.focus();

                    return;
                }

                if (nueva !== confirmacion) {

                    evento.preventDefault();

                    mostrarMensajeCambio(
                        errorCoincidencia,
                        "Las contraseñas no coinciden."
                    );

                    confirmarPassword.focus();

                    return;
                }

                if (btnCambiarPassword) {

                    btnCambiarPassword.disabled = true;

                    btnCambiarPassword.textContent =
                        "Cambiando contraseña...";
                }
            }
        );

        passwordNueva.addEventListener(
            "input",
            function () {

                limpiarMensajeCambio(
                    errorCoincidencia
                );
            }
        );

        confirmarPassword.addEventListener(
            "input",
            function () {

                limpiarMensajeCambio(
                    errorCoincidencia
                );
            }
        );
    }


    /* ======================================================================
       ALERTA DESPUÉS DEL CAMBIO
       ====================================================================== */

    if (
        passwordCambiada &&
        passwordCambiada.value === "true"
    ) {
        mostrarAlertaPasswordCambiada();
    }


    /* ======================================================================
       RECORDAR MI USUARIO
       Solo se guarda el nombre de usuario en este navegador, nunca la contraseña.
       ====================================================================== */

    const usuario =
        document.getElementById("Login_Usuario");

    const recordarUsuario =
        document.getElementById("recordarUsuario");

    const usuarioGuardado =
        leerUsuarioRecordado();

    if (usuarioGuardado) {

        recordarUsuario.checked = true;

        // Si el servidor regresó la página con un usuario escrito, se respeta
        if (!usuario.value) {
            usuario.value = usuarioGuardado;
        }

        password.focus();
    }

    formLogin.addEventListener(
        "submit",
        function () {

            guardarUsuarioRecordado(
                recordarUsuario.checked ? usuario.value.trim() : ""
            );
        }
    );


    /* ======================================================================
       SESIÓN ABIERTA EN OTRO EQUIPO
       ====================================================================== */

    if (document.getElementById("sesionEnOtroEquipo").value === "true") {

        mostrarAlerta(
            "warning",
            "Sesión activa en otro equipo",
            "Tu cuenta ya tiene una sesión abierta en otro equipo o navegador.<br>" +
            "Ciérrala ahí para poder entrar aquí. Si no puedes cerrarla, " +
            "se cerrará sola después de un tiempo sin actividad."
        );
    }


    /* ======================================================================
       SESIÓN CADUCADA POR INACTIVIDAD
       ====================================================================== */

    if (document.getElementById("sesionCaducada").value === "true") {

        mostrarAlerta(
            "warning",
            "Sesión caducada",
            "Tu sesión ha caducado por inactividad.<br>Vuelve a iniciar sesión."
        ).then(function () {
            // Se quita ?caducada de la dirección para que no se repita al recargar
            history.replaceState(null, "", "/InicioSesion/Login");
        });
    }


    /* ======================================================================
       ACERCA DEL SISTEMA
       Se cierra con la X, con Esc o dando clic fuera de la ventana.
       ====================================================================== */

    const modalAcercaDe =
        document.getElementById("modalAcercaDe");

    function mostrarAcercaDe(mostrar) {

        modalAcercaDe.classList.toggle("mostrar", mostrar);
        modalAcercaDe.setAttribute("aria-hidden", mostrar ? "false" : "true");
    }

    document.getElementById("btnAcercaDe")
        .addEventListener("click", () => mostrarAcercaDe(true));

    document.getElementById("btnCerrarAcercaDe")
        .addEventListener("click", () => mostrarAcercaDe(false));

    modalAcercaDe.addEventListener(
        "click",
        function (evento) {

            if (evento.target === modalAcercaDe) {
                mostrarAcercaDe(false);
            }
        }
    );

    document.addEventListener(
        "keydown",
        function (evento) {

            if (evento.key === "Escape") {
                mostrarAcercaDe(false);
            }
        }
    );

});


/* ==========================================================================
   MOSTRAR U OCULTAR CONTRASEÑA
   ========================================================================== */

function cambiarVisibilidadPassword(
    input,
    boton
) {
    const estaOculta =
        input.type === "password";

    input.type =
        estaOculta ? "text" : "password";

    boton.innerHTML =
        estaOculta
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';

    boton.setAttribute(
        "aria-label",
        estaOculta
            ? "Ocultar contraseña"
            : "Mostrar contraseña"
    );

    input.focus();
}


/* ==========================================================================
   BLOQ MAYÚS
   ========================================================================== */

function actualizarAvisoMayusculas(
    evento,
    aviso
) {
    const activado =
        evento.getModifierState &&
        evento.getModifierState("CapsLock");

    aviso.classList.toggle(
        "activo",
        Boolean(activado)
    );
}


/* ==========================================================================
   VALIDACIÓN DEL MODAL
   ========================================================================== */

function mostrarMensajeCambio(
    elemento,
    mensaje
) {
    if (!elemento) {
        return;
    }

    elemento.textContent = mensaje;
}


function limpiarMensajeCambio(
    elemento
) {
    if (!elemento) {
        return;
    }

    elemento.textContent = "";
}


/* ==========================================================================
   ALERTA DE CONTRASEÑA CAMBIADA
   ========================================================================== */

function mostrarAlertaPasswordCambiada() {

    const mensaje =
        "Contraseña cambiada con éxito. " +
        "La página se recargará y deberás iniciar sesión nuevamente " +
        "con tu contraseña nueva.";

    if (typeof mostrarExito !== "function") {

        alert(mensaje);

        window.location.replace(
            "/InicioSesion/Login"
        );

        return;
    }

    const alerta =
        mostrarExito(
            mensaje,
            "Contraseña cambiada"
        );

    if (
        alerta &&
        typeof alerta.then === "function"
    ) {
        alerta.then(function () {

            window.location.replace(
                "/InicioSesion/Login"
            );
        });
    }
}

/* ==========================================================================
   USUARIO RECORDADO (en el navegador)
   ========================================================================== */

function leerUsuarioRecordado() {

    try {
        return localStorage.getItem("usuarioRecordado") || "";
    } catch (e) {
        return "";
    }
}

function guardarUsuarioRecordado(nombre) {

    try {
        if (nombre) localStorage.setItem("usuarioRecordado", nombre);
        else localStorage.removeItem("usuarioRecordado");
    } catch (e) { }
}
