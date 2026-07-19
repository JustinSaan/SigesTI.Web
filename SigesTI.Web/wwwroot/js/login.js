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