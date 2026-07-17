"use strict";

/* ==========================================================================
   MODALES GENERALES DEL SISTEMA
   Aquí se agregará poco a poco la lógica de modales de todos los módulos.
   ========================================================================== */

/**
 * Abre un modal mediante su id.
 */
function abrirModal(idModal) {
    const modal = document.getElementById(idModal);

    if (modal) {
        modal.classList.add("show");
    }
}

/**
 * Cierra un modal mediante su id.
 */
function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);

    if (modal) {
        modal.classList.remove("show");
    }
}

/* ==========================================================================
   MÓDULO CUENTA
   ========================================================================== */

/**
 * Abre el modal de nuevo usuario.
 */
function abrirModalNuevoUsuario() {
    abrirModal("modalNuevoUsuario");
}

/**
 * Cierra el modal de nuevo usuario.
 */
function cerrarModalNuevoUsuario() {
    cerrarModal("modalNuevoUsuario");
}

/**
 * Abre el modal de edición y carga los datos del usuario.
 */
function abrirModalEditarUsuario(boton) {
    const id = boton.dataset.id || "";
    const nombre = boton.dataset.nombre || "";
    const usuario = boton.dataset.usuario || "";
    const correo = boton.dataset.correo || "";
    const rol = boton.dataset.rol || "";
    const activo = boton.dataset.activo === "true";

    document.getElementById("editIdUsuario").value = id;
    document.getElementById("editNombreCompleto").value = nombre;
    document.getElementById("editNombreUsuario").value = usuario;
    document.getElementById("editCorreo").value = correo;
    document.getElementById("editRol").value = rol;
    document.getElementById("editActivo").checked = activo;

    abrirModal("modalEditarUsuario");
}

/**
 * Cierra el modal de edición.
 */
function cerrarModalEditarUsuario() {
    cerrarModal("modalEditarUsuario");
}

/**
 * Muestra u oculta una contraseña.
 */
function cambiarVisibilidadPassword(boton) {
    const idInput = boton.dataset.input;
    const input = document.getElementById(idInput);
    const icono = boton.querySelector("i");

    if (!input || !icono) {
        return;
    }

    if (input.type === "password") {
        input.type = "text";
        icono.classList.remove("bi-eye");
        icono.classList.add("bi-eye-slash");
    } else {
        input.type = "password";
        icono.classList.remove("bi-eye-slash");
        icono.classList.add("bi-eye");
    }
}

/**
 * Valida las contraseñas del formulario de nuevo usuario.
 */
function validarPasswordTemporal(evento) {
    const password =
        document.getElementById("passwordTemporal");

    const confirmacion =
        document.getElementById("confirmarPasswordTemporal");

    if (!password || !confirmacion) {
        evento.preventDefault();
        mostrarError("No se encontraron los campos de contraseña.");
        return;
    }

    if (password.value !== confirmacion.value) {
        evento.preventDefault();

        mostrarError(
            "La contraseña temporal y la confirmación no coinciden.",
            "Contraseñas diferentes"
        );

        return;
    }

    if (password.value.length < 8) {
        evento.preventDefault();

        mostrarAdvertencia(
            "La contraseña temporal debe tener al menos 8 caracteres.",
            "Contraseña demasiado corta"
        );
    }
}

/**
 * Confirma la eliminación de un usuario.
 */
function confirmarEliminarUsuario(boton) {
    const idUsuario = boton.dataset.id;
    const nombreUsuario = boton.dataset.usuario;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Eliminar usuario?",
        mensaje:
            "Se eliminará la cuenta <b>" +
            nombreUsuario +
            "</b>.<br><br>" +
            "La información histórica de la bitácora se conservará.",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("eliminarIdUsuario").value =
                idUsuario;

            document.getElementById("formEliminarUsuario").submit();
        }
    });
}

/**
 * Confirma el restablecimiento de contraseña.
 */
function confirmarRestablecerPassword(boton) {
    const idUsuario = boton.dataset.id;
    const nombreUsuario = boton.dataset.usuario;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Restablecer contraseña?",
        mensaje:
            "Se generará una nueva contraseña temporal para <b>" +
            nombreUsuario +
            "</b>.",
        textoConfirmar: "Sí, restablecer",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("passwordIdUsuario").value =
                idUsuario;

            document
                .getElementById("formRestablecerPassword")
                .submit();
        }
    });
}

/**
 * Filtra la tabla de usuarios mientras se escribe.
 */
function filtrarUsuarios() {
    const buscador =
        document.getElementById("buscarUsuario");

    const filas =
        document.querySelectorAll("#tablaUsuarios tbody tr");

    if (!buscador) {
        return;
    }

    const texto = buscador.value
        .trim()
        .toLocaleLowerCase("es-MX");

    let totalVisibles = 0;

    filas.forEach(function (fila) {
        const columnas = fila.querySelectorAll("td");

        if (columnas.length < 2) {
            return;
        }

        const contenido = fila.innerText
            .toLocaleLowerCase("es-MX");

        const mostrar = contenido.includes(texto);

        fila.style.display = mostrar ? "" : "none";

        if (mostrar) {
            totalVisibles++;
        }
    });

    const resultado =
        document.getElementById("resultadoUsuarios");

    if (resultado) {
        resultado.textContent =
            "Mostrando " +
            totalVisibles +
            (totalVisibles === 1
                ? " usuario"
                : " usuarios");
    }
}

/**
 * Abre el modal correspondiente si el servidor lo solicita.
 */
function abrirModalDesdeServidor() {
    const abrirNuevo =
        document.getElementById("abrirModalNuevo");

    if (
        abrirNuevo &&
        abrirNuevo.value.toLowerCase() === "true"
    ) {
        abrirModalNuevoUsuario();
    }
}

/* ==========================================================================
   EVENTOS GENERALES
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const btnNuevo =
        document.getElementById("btnNuevoUsuario");

    const buscador =
        document.getElementById("buscarUsuario");

    const formNuevo =
        document.getElementById("formNuevoUsuario");

    const formReporteBitacora =
        document.getElementById("formReporteBitacora");

    if (formReporteBitacora) {
        formReporteBitacora.addEventListener(
            "submit",
            function () {
                abrirVistaPreviaReporte();
            }
        );
    }

    if (btnNuevo) {
        btnNuevo.addEventListener(
            "click",
            abrirModalNuevoUsuario
        );
    }

    if (buscador) {
        buscador.addEventListener(
            "input",
            filtrarUsuarios
        );
    }

    if (formNuevo) {
        formNuevo.addEventListener(
            "submit",
            validarPasswordTemporal
        );
    }

    document
        .querySelectorAll(".js-cerrar-nuevo")
        .forEach(function (boton) {
            boton.addEventListener(
                "click",
                cerrarModalNuevoUsuario
            );
        });

    document
        .querySelectorAll(".js-cerrar-editar")
        .forEach(function (boton) {
            boton.addEventListener(
                "click",
                cerrarModalEditarUsuario
            );
        });

    document
        .querySelectorAll(".js-toggle-password")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                cambiarVisibilidadPassword(boton);
            });
        });

    document
        .querySelectorAll(".js-editar-usuario")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                abrirModalEditarUsuario(boton);
            });
        });

    document
        .querySelectorAll(".js-restablecer-password")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                confirmarRestablecerPassword(boton);
            });
        });

    document
        .querySelectorAll(".js-eliminar-usuario")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                confirmarEliminarUsuario(boton);
            });
        });

    abrirModalDesdeServidor();
    mostrarMensajesServidor();
});

/* ==========================================================================
VISTA PREVIA DEL REPORTE DE BITÁCORA
========================================================================== */

/**
 * Abre la ventana flotante que contiene la vista previa.
 */
function abrirVistaPreviaReporte() {
    abrirModal("modalVistaPreviaReporte");
}

/**
 * Cierra la vista previa del reporte.
 */
function cerrarVistaPreviaReporte() {
    cerrarModal("modalVistaPreviaReporte");
}

/**
 * Imprime el contenido que se está mostrando dentro del iframe.
 */
function imprimirReporteBitacora() {
    const iframe =
        document.getElementById("iframeReporteBitacora");

    if (!iframe || !iframe.contentWindow) {
        mostrarError(
            "No fue posible cargar la vista previa del reporte."
        );

        return;
    }

    // Guardar el título actual de la página.
    const tituloAnterior = document.title;

    // Obtener fecha y hora actuales.
    const fechaActual = new Date();

    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const anio = fechaActual.getFullYear();
    const hora = String(fechaActual.getHours()).padStart(2, "0");
    const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
    const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

    // Nombre sugerido al guardar como PDF.
    const nombreReporte =
        "ReporteBitacora_" +
        dia +
        mes +
        anio +
        hora +
        minutos +
        segundos;

    // Cambiar el título de la página principal.
    document.title = nombreReporte;

    // También cambiar el título del documento dentro del iframe.
    iframe.contentDocument.title = nombreReporte;

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Restaurar el título original después de abrir la impresión.
    setTimeout(function () {
        document.title = tituloAnterior;
    }, 1500);
}