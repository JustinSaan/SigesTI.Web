"use strict";

/* ==========================================================================
   ALERTAS GENERALES DEL SISTEMA
   Todas las alertas del proyecto usarán este mismo diseño.
   ========================================================================== */

/**
 * Muestra una alerta sencilla con el diseño dark blue.
 */
function mostrarAlerta(icono, titulo, mensaje) {
    if (typeof Swal === "undefined") {
        alert(titulo + "\n\n" + quitarEtiquetasHtml(mensaje));
        return;
    }

    return Swal.fire({
        icon: icono,
        title: titulo,
        html: mensaje,
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonText: "Aceptar",
        customClass: {
            popup: "swal-dark-blue",
            confirmButton: "swal-btn-confirm"
        },
        buttonsStyling: false
    });
}

/**
 * Alerta de operación exitosa.
 */
function mostrarExito(mensaje, titulo) {

    return mostrarAlerta(
        "success",
        titulo || "Operación exitosa",
        mensaje
    );
}

/**
 * Alerta de error.
 */
function mostrarError(mensaje, titulo) {
    mostrarAlerta(
        "error",
        titulo || "Ocurrió un problema",
        mensaje
    );
}

/**
 * Alerta de advertencia.
 */
function mostrarAdvertencia(mensaje, titulo) {
    mostrarAlerta(
        "warning",
        titulo || "Advertencia",
        mensaje
    );
}

/**
 * Alerta informativa.
 */
function mostrarInformacion(mensaje, titulo) {
    mostrarAlerta(
        "info",
        titulo || "Información",
        mensaje
    );
}

/**
 * Muestra una confirmación y ejecuta una función si el usuario acepta.
 */
function mostrarConfirmacion(opciones) {
    if (typeof Swal === "undefined") {
        const confirmado = confirm(
            quitarEtiquetasHtml(opciones.mensaje)
        );

        if (confirmado && typeof opciones.alConfirmar === "function") {
            opciones.alConfirmar();
        }

        return;
    }

    Swal.fire({
        icon: opciones.icono || "question",
        title: opciones.titulo || "¿Confirmar acción?",
        html: opciones.mensaje || "",
        background: "#0f172a",
        color: "#f8fafc",
        showCancelButton: true,
        confirmButtonText: opciones.textoConfirmar || "Aceptar",
        cancelButtonText: opciones.textoCancelar || "Cancelar",
        customClass: {
            popup: "swal-dark-blue",
            confirmButton: "swal-btn-confirm",
            cancelButton: "swal-btn-cancel"
        },
        buttonsStyling: false
    }).then(function (resultado) {
        if (
            resultado.isConfirmed &&
            typeof opciones.alConfirmar === "function"
        ) {
            opciones.alConfirmar();
        }
    });
}

/**
 * Quita etiquetas HTML para usar mensajes con alert() o confirm().
 */
function quitarEtiquetasHtml(texto) {
    return (texto || "").replace(/<[^>]*>/g, "");
}

/**
 * Lee mensajes enviados desde TempData y los muestra.
 */
function mostrarMensajesServidor() {
    const mensajeExito =
        document.getElementById("mensajeExito");

    const mensajeError =
        document.getElementById("mensajeError");

    const passwordGenerado =
        document.getElementById("passwordGenerado");

    const exito = mensajeExito ? mensajeExito.value : "";
    const error = mensajeError ? mensajeError.value : "";
    const password = passwordGenerado
        ? passwordGenerado.value
        : "";

    if (exito) {
        let mensaje = exito;

        if (password) {
            mensaje +=
                "<br><br>" +
                "<div class='swal-password-box'>" +
                "<span>Contraseña temporal:</span>" +
                "<strong>" + password + "</strong>" +
                "</div>";
        }

        mostrarExito(mensaje);
    }

    if (error) {
        mostrarError(error);
    }
}