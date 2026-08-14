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
   TABLAS DEL MÓDULO CUENTA
   Filtrado y paginación sin recargar la página.
   ========================================================================== */

let paginaUsuarios = 1;
let paginaBitacora = 1;


/**
 * Normaliza un texto para realizar búsquedas.
 */
function normalizarTexto(texto) {
    return (texto || "")
        .toString()
        .trim()
        .toLocaleLowerCase("es-MX");
}


/**
 * Crea los botones de una paginación.
 */
function crearPaginacion(
    contenedorId,
    paginaActual,
    totalPaginas,
    cambiarPagina
) {
    const contenedor =
        document.getElementById(contenedorId);

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (totalPaginas <= 1) {
        return;
    }

    const botonAnterior =
        document.createElement("button");

    botonAnterior.type = "button";
    botonAnterior.innerHTML = "&lsaquo;";
    botonAnterior.disabled = paginaActual === 1;

    botonAnterior.addEventListener("click", function () {
        cambiarPagina(paginaActual - 1);
    });

    contenedor.appendChild(botonAnterior);

    for (
        let numero = 1;
        numero <= totalPaginas;
        numero++
    ) {
        const boton =
            document.createElement("button");

        boton.type = "button";
        boton.textContent = numero;

        if (numero === paginaActual) {
            boton.classList.add("active");
        }

        boton.addEventListener("click", function () {
            cambiarPagina(numero);
        });

        contenedor.appendChild(boton);
    }

    const botonSiguiente =
        document.createElement("button");

    botonSiguiente.type = "button";
    botonSiguiente.innerHTML = "&rsaquo;";
    botonSiguiente.disabled =
        paginaActual === totalPaginas;

    botonSiguiente.addEventListener("click", function () {
        cambiarPagina(paginaActual + 1);
    });

    contenedor.appendChild(botonSiguiente);
}


/* ==========================================================================
   USUARIOS
   ========================================================================== */

function actualizarTablaUsuarios() {
    const buscador =
        document.getElementById("buscarUsuario");

    const selectorCantidad =
        document.getElementById("cantidadUsuarios");

    const resultado =
        document.getElementById("resultadoUsuarios");

    const filas = Array.from(
        document.querySelectorAll(".fila-usuario")
    );

    if (!selectorCantidad) {
        return;
    }

    const textoBusqueda =
        normalizarTexto(buscador ? buscador.value : "");

    const cantidad =
        parseInt(selectorCantidad.value, 10);

    const filasFiltradas = filas.filter(function (fila) {
        const contenido =
            normalizarTexto(fila.innerText);

        return contenido.includes(textoBusqueda);
    });

    const totalPaginas = Math.max(
        1,
        Math.ceil(filasFiltradas.length / cantidad)
    );

    if (paginaUsuarios > totalPaginas) {
        paginaUsuarios = totalPaginas;
    }

    const inicio =
        (paginaUsuarios - 1) * cantidad;

    const fin =
        inicio + cantidad;

    filas.forEach(function (fila) {
        fila.style.display = "none";
    });

    filasFiltradas
        .slice(inicio, fin)
        .forEach(function (fila) {
            fila.style.display = "";
        });

    if (resultado) {
        if (filasFiltradas.length === 0) {
            resultado.textContent =
                "No se encontraron usuarios";
        } else {
            const desde = inicio + 1;
            const hasta = Math.min(
                fin,
                filasFiltradas.length
            );

            resultado.textContent =
                "Mostrando " +
                desde +
                " a " +
                hasta +
                " de " +
                filasFiltradas.length +
                " usuarios";
        }
    }

    crearPaginacion(
        "paginacionUsuarios",
        paginaUsuarios,
        totalPaginas,
        function (pagina) {
            paginaUsuarios = pagina;
            actualizarTablaUsuarios();
        }
    );
}


/* ==========================================================================
   BITÁCORA
   ========================================================================== */

function actualizarTablaBitacora() {
    const nombre =
        normalizarTexto(
            document.getElementById("filtroNombre")?.value
        );

    const modulo =
        normalizarTexto(
            document.getElementById("filtroModulo")?.value
        );

    const accion =
        normalizarTexto(
            document.getElementById("filtroAccion")?.value
        );

    const fechaInicio =
        document.getElementById("filtroFechaInicio")?.value || "";

    const fechaFin =
        document.getElementById("filtroFechaFin")?.value || "";

    const selectorCantidad =
        document.getElementById("cantidadBitacora");

    const resultado =
        document.getElementById("resultadoBitacora");

    const filas = Array.from(
        document.querySelectorAll(".fila-bitacora")
    );

    if (!selectorCantidad) {
        return;
    }

    const cantidad =
        parseInt(selectorCantidad.value, 10);

    const filasFiltradas = filas.filter(function (fila) {
        const nombreFila =
            normalizarTexto(fila.dataset.nombre);

        const moduloFila =
            normalizarTexto(fila.dataset.modulo);

        const accionFila =
            normalizarTexto(fila.dataset.accion);

        const fechaFila =
            fila.dataset.fecha || "";

        const cumpleNombre =
            !nombre || nombreFila === nombre;

        const cumpleModulo =
            !modulo || moduloFila === modulo;

        const cumpleAccion =
            !accion || accionFila === accion;

        const cumpleFechaInicio =
            !fechaInicio || fechaFila >= fechaInicio;

        const cumpleFechaFin =
            !fechaFin || fechaFila <= fechaFin;

        return (
            cumpleNombre &&
            cumpleModulo &&
            cumpleAccion &&
            cumpleFechaInicio &&
            cumpleFechaFin
        );
    });

    const totalPaginas = Math.max(
        1,
        Math.ceil(filasFiltradas.length / cantidad)
    );

    if (paginaBitacora > totalPaginas) {
        paginaBitacora = totalPaginas;
    }

    const inicio =
        (paginaBitacora - 1) * cantidad;

    const fin =
        inicio + cantidad;

    filas.forEach(function (fila) {
        fila.style.display = "none";
    });

    filasFiltradas
        .slice(inicio, fin)
        .forEach(function (fila) {
            fila.style.display = "";
        });

    if (resultado) {
        if (filasFiltradas.length === 0) {
            resultado.textContent =
                "No se encontraron registros";
        } else {
            const desde = inicio + 1;
            const hasta = Math.min(
                fin,
                filasFiltradas.length
            );

            resultado.textContent =
                "Mostrando " +
                desde +
                " a " +
                hasta +
                " de " +
                filasFiltradas.length +
                " registros";
        }
    }

    crearPaginacion(
        "paginacionBitacora",
        paginaBitacora,
        totalPaginas,
        function (pagina) {
            paginaBitacora = pagina;
            actualizarTablaBitacora();
        }
    );
}


/**
 * Limpia todos los filtros de la bitácora.
 */
function limpiarFiltrosBitacora() {
    const campos = [
        "filtroNombre",
        "filtroModulo",
        "filtroAccion",
        "filtroFechaInicio",
        "filtroFechaFin"
    ];

    campos.forEach(function (id) {
        const campo =
            document.getElementById(id);

        if (campo) {
            campo.value = "";
        }
    });

    paginaBitacora = 1;
    actualizarTablaBitacora();
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

    /* Buscador y paginación de usuarios */
    const buscarUsuario =
        document.getElementById("buscarUsuario");

    const cantidadUsuarios =
        document.getElementById("cantidadUsuarios");

    if (buscarUsuario) {
        buscarUsuario.addEventListener(
            "input",
            function () {
                paginaUsuarios = 1;
                actualizarTablaUsuarios();
            }
        );
    }

    if (cantidadUsuarios) {
        cantidadUsuarios.addEventListener(
            "change",
            function () {
                paginaUsuarios = 1;
                actualizarTablaUsuarios();
            }
        );
    }


    /* Filtros y paginación de bitácora */
    const filtrosBitacora = [
        "filtroNombre",
        "filtroModulo",
        "filtroAccion",
        "filtroFechaInicio",
        "filtroFechaFin"
    ];

    filtrosBitacora.forEach(function (id) {
        const campo =
            document.getElementById(id);

        if (campo) {
            campo.addEventListener(
                "change",
                function () {
                    paginaBitacora = 1;
                    actualizarTablaBitacora();
                }
            );
        }
    });

    const cantidadBitacora =
        document.getElementById("cantidadBitacora");

    if (cantidadBitacora) {
        cantidadBitacora.addEventListener(
            "change",
            function () {
                paginaBitacora = 1;
                actualizarTablaBitacora();
            }
        );
    }

    const btnLimpiarFiltros =
        document.getElementById(
            "btnLimpiarFiltrosBitacora"
        );

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener(
            "click",
            limpiarFiltrosBitacora
        );
    }


    /* Carga inicial */
    actualizarTablaUsuarios();
    actualizarTablaBitacora();

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


/* ==========================================================================
   MODALES DE PERSONAL
   ========================================================================== */


function abrirModalRegistrar() {
    document.getElementById("regNombre").value = "";
    document.getElementById("regArea").value = "";
    document.getElementById("regPuesto").value = "";
    document.getElementById("regCorreo").value = "";
    document.getElementById("regUnidadesRed").value = "";
    document.getElementById("regActivo").checked = true;
    document.getElementById("regResponsable").checked = false;

    new bootstrap.Modal(
        document.getElementById("modalRegistrar")
    ).show();
}

async function editarEmpleado(id) {
    const response =
        await fetch(`?handler=DetalleEmpleado&id=${id}`);

    const data = await response.json();

    document.getElementById("editId").value = data.id;
    document.getElementById("editNombre").value = data.nombre;
    document.getElementById("editArea").value = data.area;
    document.getElementById("editPuesto").value = data.puesto;
    document.getElementById("editCorreo").value = data.correo;
    document.getElementById("editUnidadesRed").value = data.unidadesRed;
    document.getElementById("editActivo").checked = data.activo;
    document.getElementById("editResponsable").checked = data.esResponsable;

    new bootstrap.Modal(
        document.getElementById("modalEditar")
    ).show();
}

async function guardarCambios() {
    const datos =
    {
        id: document.getElementById("editId").value,
        nombre: document.getElementById("editNombre").value,
        area: document.getElementById("editArea").value,
        puesto: document.getElementById("editPuesto").value,
        correo: document.getElementById("editCorreo").value,
        unidadesRed: document.getElementById("editUnidadesRed").value,
        activo: document.getElementById("editActivo").checked,
        esResponsable: document.getElementById("editResponsable").checked
    };

    const response =
        await fetch('?handler=GuardarCambios',
            {
                method: 'POST',
                headers:
                {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken':
                        document.querySelector('input[name="__RequestVerificationToken"]').value
                },
                body: JSON.stringify(datos)
            });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Datos actualizados',
            text: 'Los datos del personal han sido actualizados con éxito.',
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-dark',
                confirmButton: 'swal-btn-confirm'
            },
            buttonsStyling: false
        }).then(() => {
            location.reload();
        });
    }
    else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-dark',
                confirmButton: 'swal-btn-confirm'
            },
            buttonsStyling: false
        });
    }
}

async function eliminarEmpleado(id, nombre) {
    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar personal?',
        text: `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'swal-dark',
            confirmButton: 'swal-btn-danger',
            cancelButton: 'swal-btn-cancel'
        },
        buttonsStyling: false
    });

    if (!confirmacion.isConfirmed)
        return;

    const response = await fetch(`?handler=EliminarEmpleado&id=${id}`,
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'RequestVerificationToken':
                    document.querySelector('input[name="__RequestVerificationToken"]').value
            }
        });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Usuario eliminado',
            text: 'El personal fue eliminado de manera correcta.',
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-dark',
                confirmButton: 'swal-btn-confirm'
            },
            buttonsStyling: false
        }).then(() => {
            location.reload();
        });
    }
    else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-dark',
                confirmButton: 'swal-btn-confirm'
            },
            buttonsStyling: false
        });
    }
}

async function guardarRegistro() {
    const datos =
    {
        nombre: document.getElementById("regNombre").value,
        area: document.getElementById("regArea").value,
        puesto: document.getElementById("regPuesto").value,
        correo: document.getElementById("regCorreo").value,
        unidadesRed: document.getElementById("regUnidadesRed").value,
        activo: document.getElementById("regActivo").checked,
        esResponsable: document.getElementById("regResponsable").checked
    };

    const response = await fetch('?handler=RegistrarEmpleado',
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'RequestVerificationToken':
                    document.querySelector('input[name="__RequestVerificationToken"]').value
            },
            body: JSON.stringify(datos)
        });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Personal registrado',
            text: 'Se ha guardado con éxito el personal agregado.',
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-dark',
                confirmButton: 'swal-btn-confirm'
            },
            buttonsStyling: false
        }).then(() => {
            location.reload();
        });
    }
    else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-dark',
                confirmButton: 'swal-btn-confirm'
            },
            buttonsStyling: false
        });
    }
}