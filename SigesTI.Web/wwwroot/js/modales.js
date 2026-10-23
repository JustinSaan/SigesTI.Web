"use strict";

/* ==========================================================================
   VARIABLES GLOBALES PROTEGIDAS (PREVIENEN SINTAX ERROR POR CARGA DOBLE)
   ========================================================================== */

if (typeof window.paginaUsuarios === "undefined") {
    window.paginaUsuarios = 1;
}
if (typeof window.paginaBitacora === "undefined") {
    window.paginaBitacora = 1;
}

/* ==========================================================================
   HELPERS DE CONVERSIÓN DE HORA (12H <-> 24H)
   ========================================================================== */

function convertir12a24(hora12Str) {
    if (!hora12Str) return "";
    
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(hora12Str.trim())) {
        return hora12Str.trim();
    }

    const match = hora12Str.match(/(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|AM|PM)?/i);
    if (!match) return "";

    let horas = parseInt(match[1], 10);
    const minutos = match[2];
    const meridiano = match[3] ? match[3].toLowerCase() : "";

    if ((meridiano.includes("p") || meridiano.includes("pm")) && horas < 12) {
        horas += 12;
    } else if ((meridiano.includes("a") || meridiano.includes("am")) && horas === 12) {
        horas = 0;
    }

    const hh = String(horas).padStart(2, "0");
    return `${hh}:${minutos}`;
}

function convertir24a12(hora24Str) {
    if (!hora24Str) return "";

    const partes = hora24Str.split(":");
    if (partes.length < 2) return hora24Str;

    let horas = parseInt(partes[0], 10);
    const minutos = partes[1];
    const meridiano = horas >= 12 ? "p. m." : "a. m.";

    horas = horas % 12;
    horas = horas ? horas : 12;

    const hh = String(horas).padStart(2, "0");
    return `${hh}:${minutos} ${meridiano}`;
}

/* ==========================================================================
   MODALES GENERALES DEL SISTEMA
   ========================================================================== */

function abrirModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.classList.add("show");
    }
}

function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.classList.remove("show");
    }
}

/* ==========================================================================
   MÓDULO CUENTA
   ========================================================================== */

function abrirModalNuevoUsuario() {
    abrirModal("modalNuevoUsuario");
}

function cerrarModalNuevoUsuario() {
    cerrarModal("modalNuevoUsuario");
}

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

function cerrarModalEditarUsuario() {
    cerrarModal("modalEditarUsuario");
}

function cambiarVisibilidadPassword(boton) {
    const idInput = boton.dataset.input;
    const input = document.getElementById(idInput);
    const icono = boton.querySelector("i");

    if (!input || !icono) return;

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

function validarPasswordTemporal(evento) {
    const password = document.getElementById("passwordTemporal");
    const confirmacion = document.getElementById("confirmarPasswordTemporal");

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

function confirmarEliminarUsuario(boton) {
    const idUsuario = boton.dataset.id;
    const nombreUsuario = boton.dataset.usuario;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Eliminar usuario?",
        mensaje: "Se eliminará la cuenta <b>" + nombreUsuario + "</b>.<br><br>La información histórica se conservará.",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("eliminarIdUsuario").value = idUsuario;
            document.getElementById("formEliminarUsuario").submit();
        }
    });
}

function confirmarRestablecerPassword(boton) {
    const idUsuario = boton.dataset.id;
    const nombreUsuario = boton.dataset.usuario;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Restablecer contraseña?",
        mensaje: "Se generará una nueva contraseña temporal para <b>" + nombreUsuario + "</b>.",
        textoConfirmar: "Sí, restablecer",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("passwordIdUsuario").value = idUsuario;
            document.getElementById("formRestablecerPassword").submit();
        }
    });
}

function filtrarUsuarios() {
    const buscador = document.getElementById("buscarUsuario");
    const filas = document.querySelectorAll("#tablaUsuarios tbody tr");

    if (!buscador) return;

    const texto = buscador.value.trim().toLocaleLowerCase("es-MX");
    let totalVisibles = 0;

    filas.forEach(function (fila) {
        const columnas = fila.querySelectorAll("td");
        if (columnas.length < 2) return;

        const contenido = fila.innerText.toLocaleLowerCase("es-MX");
        const mostrar = contenido.includes(texto);

        fila.style.display = mostrar ? "" : "none";
        if (mostrar) totalVisibles++;
    });

    const resultado = document.getElementById("resultadoUsuarios");
    if (resultado) {
        resultado.textContent = "Mostrando " + totalVisibles + (totalVisibles === 1 ? " usuario" : " usuarios");
    }
}

function abrirModalDesdeServidor() {
    const abrirNuevo = document.getElementById("abrirModalNuevo");
    if (abrirNuevo && abrirNuevo.value.toLowerCase() === "true") {
        abrirModalNuevoUsuario();
    }
}

/* ==========================================================================
   TABLAS DEL MÓDULO CUENTA Y BITÁCORA
   ========================================================================== */

function normalizarTexto(texto) {
    return (texto || "").toString().trim().toLocaleLowerCase("es-MX");
}

function crearPaginacion(contenedorId, paginaActual, totalPaginas, cambiarPagina) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = "";
    if (totalPaginas <= 1) return;

    const botonAnterior = document.createElement("button");
    botonAnterior.type = "button";
    botonAnterior.innerHTML = "&lsaquo;";
    botonAnterior.disabled = paginaActual === 1;
    botonAnterior.addEventListener("click", function () {
        cambiarPagina(paginaActual - 1);
    });
    contenedor.appendChild(botonAnterior);

    for (let numero = 1; numero <= totalPaginas; numero++) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = numero;
        if (numero === paginaActual) boton.classList.add("active");
        boton.addEventListener("click", function () {
            cambiarPagina(numero);
        });
        contenedor.appendChild(boton);
    }

    const botonSiguiente = document.createElement("button");
    botonSiguiente.type = "button";
    botonSiguiente.innerHTML = "&rsaquo;";
    botonSiguiente.disabled = paginaActual === totalPaginas;
    botonSiguiente.addEventListener("click", function () {
        cambiarPagina(paginaActual + 1);
    });
    contenedor.appendChild(botonSiguiente);
}

function actualizarTablaUsuarios() {
    const buscador = document.getElementById("buscarUsuario");
    const selectorCantidad = document.getElementById("cantidadUsuarios");
    const resultado = document.getElementById("resultadoUsuarios");
    const filas = Array.from(document.querySelectorAll(".fila-usuario"));

    if (!selectorCantidad) return;

    const textoBusqueda = normalizarTexto(buscador ? buscador.value : "");
    const cantidad = parseInt(selectorCantidad.value, 10);

    const filasFiltradas = filas.filter(function (fila) {
        return normalizarTexto(fila.innerText).includes(textoBusqueda);
    });

    const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / cantidad));
    if (window.paginaUsuarios > totalPaginas) window.paginaUsuarios = totalPaginas;

    const inicio = (window.paginaUsuarios - 1) * cantidad;
    const fin = inicio + cantidad;

    filas.forEach(fila => fila.style.display = "none");
    filasFiltradas.slice(inicio, fin).forEach(fila => fila.style.display = "");

    if (resultado) {
        if (filasFiltradas.length === 0) {
            resultado.textContent = "No se encontraron usuarios";
        } else {
            resultado.textContent = `Mostrando ${inicio + 1} a ${Math.min(fin, filasFiltradas.length)} de ${filasFiltradas.length} usuarios`;
        }
    }

    crearPaginacion("paginacionUsuarios", window.paginaUsuarios, totalPaginas, function (pagina) {
        window.paginaUsuarios = pagina;
        actualizarTablaUsuarios();
    });
}

function actualizarTablaBitacora() {
    const nombre = normalizarTexto(document.getElementById("filtroNombre")?.value);
    const modulo = normalizarTexto(document.getElementById("filtroModulo")?.value);
    const accion = normalizarTexto(document.getElementById("filtroAccion")?.value);
    const fechaInicio = document.getElementById("filtroFechaInicio")?.value || "";
    const fechaFin = document.getElementById("filtroFechaFin")?.value || "";
    const selectorCantidad = document.getElementById("cantidadBitacora");
    const resultado = document.getElementById("resultadoBitacora");
    const filas = Array.from(document.querySelectorAll(".fila-bitacora"));

    if (!selectorCantidad) return;

    const cantidad = parseInt(selectorCantidad.value, 10);

    const filasFiltradas = filas.filter(function (fila) {
        const nombreFila = normalizarTexto(fila.dataset.nombre);
        const moduloFila = normalizarTexto(fila.dataset.modulo);
        const accionFila = normalizarTexto(fila.dataset.accion);
        const fechaFila = fila.dataset.fecha || "";

        return (!nombre || nombreFila === nombre) &&
            (!modulo || moduloFila === modulo) &&
            (!accion || accionFila === accion) &&
            (!fechaInicio || fechaFila >= fechaInicio) &&
            (!fechaFin || fechaFila <= fechaFin);
    });

    const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / cantidad));
    if (window.paginaBitacora > totalPaginas) window.paginaBitacora = totalPaginas;

    const inicio = (window.paginaBitacora - 1) * cantidad;
    const fin = inicio + cantidad;

    filas.forEach(fila => fila.style.display = "none");
    filasFiltradas.slice(inicio, fin).forEach(fila => fila.style.display = "");

    if (resultado) {
        if (filasFiltradas.length === 0) {
            resultado.textContent = "No se encontraron registros";
        } else {
            resultado.textContent = `Mostrando ${inicio + 1} a ${Math.min(fin, filasFiltradas.length)} de ${filasFiltradas.length} registros`;
        }
    }

    crearPaginacion("paginacionBitacora", window.paginaBitacora, totalPaginas, function (pagina) {
        window.paginaBitacora = pagina;
        actualizarTablaBitacora();
    });
}

function limpiarFiltrosBitacora() {
    ["filtroNombre", "filtroModulo", "filtroAccion", "filtroFechaInicio", "filtroFechaFin"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });
    window.paginaBitacora = 1;
    actualizarTablaBitacora();
}

/* ==========================================================================
   VISTA PREVIA DEL REPORTE DE BITÁCORA
   ========================================================================== */

function abrirVistaPreviaReporte() {
    abrirModal("modalVistaPreviaReporte");
}

function cerrarVistaPreviaReporte() {
    cerrarModal("modalVistaPreviaReporte");
}

function imprimirReporteBitacora() {
    const iframe = document.getElementById("iframeReporteBitacora");
    if (!iframe || !iframe.contentWindow) {
        mostrarError("No fue posible cargar la vista previa del reporte.");
        return;
    }

    const tituloAnterior = document.title;
    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const anio = fechaActual.getFullYear();
    const hora = String(fechaActual.getHours()).padStart(2, "0");
    const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
    const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

    const nombreReporte = `ReporteBitacora_${dia}${mes}${anio}${hora}${minutos}${segundos}`;

    document.title = nombreReporte;
    iframe.contentDocument.title = nombreReporte;

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(function () {
        document.title = tituloAnterior;
    }, 1500);
}

/* ==========================================================================
   MODALES DE PERSONAL
   ========================================================================== */

// 1. ABRIR MODAL REGISTRAR
function abrirModalRegistrar() {
    var setVal = function(id, val) {
        var el = document.getElementById(id);
        if (el) el.value = val;
    };
    var setCheck = function(id, checked) {
        var el = document.getElementById(id);
        if (el) el.checked = Boolean(checked);
    };

    setVal("regNombre", "");
    setVal("regArea", "");
    setVal("regPuesto", "");
    setVal("regCorreo", "");

    setCheck("regActivo", true);
    setCheck("regResponsable", false);

    var modalEl = document.getElementById("modalRegistrar");
    if (modalEl) {
        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
}

async function editarEmpleado(id) {
    try {
        var response = await fetch('?handler=DetalleEmpleado&id=' + id);
        if (!response.ok) {
            console.error("Error al obtener detalles del empleado");
            return;
        }

        var data = await response.json();

        var setVal = function(id, val) {
            var el = document.getElementById(id);
            if (el) el.value = (val !== null && val !== undefined) ? val : "";
        };
        var setCheck = function(id, checked) {
            var el = document.getElementById(id);
            if (el) el.checked = Boolean(checked);
        };

        setVal("editId", data.id);
        setVal("editNombre", data.nombre);
        setVal("editArea", data.area);
        setVal("editPuesto", data.puesto);
        setVal("editCorreo", data.correo);

        setCheck("editActivo", data.activo);
        setCheck("editResponsable", data.esResponsable);

        var modalEl = document.getElementById("modalEditar");
        if (modalEl) {
            var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    } catch (error) {
        console.error("Error al cargar datos del empleado:", error);
    }
}

async function guardarRegistro() {
    const datos = {
        nombre: document.getElementById("regNombre")?.value || "",
        area: document.getElementById("regArea")?.value || "",
        puesto: document.getElementById("regPuesto")?.value || "",
        correo: document.getElementById("regCorreo")?.value || "",
        activo: document.getElementById("regActivo")?.checked || false,
        esResponsable: document.getElementById("regResponsable")?.checked || false
    };

    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";

    const response = await fetch('?handler=RegistrarEmpleado', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
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
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message || 'No se pudo guardar.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

async function guardarCambios() {
    const datos = {
        id: parseInt(document.getElementById("editId")?.value || "0"),
        nombre: document.getElementById("editNombre")?.value || "",
        area: document.getElementById("editArea")?.value || "",
        puesto: document.getElementById("editPuesto")?.value || "",
        correo: document.getElementById("editCorreo")?.value || "",
        activo: document.getElementById("editActivo")?.checked || false,
        esResponsable: document.getElementById("editResponsable")?.checked || false
    };

    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";

    const response = await fetch('?handler=GuardarCambios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
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
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message || 'No se pudieron guardar los cambios.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
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
        customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel' },
        buttonsStyling: false
    });

    if (!confirmacion.isConfirmed) return;

    const response = await fetch(`?handler=EliminarEmpleado&id=${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        }
    });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Usuario eliminado',
            text: 'El personal fue eliminado de manera correcta.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

async function guardarRegistro() {
    const datos = {
        nombre: document.getElementById("regNombre").value,
        area: document.getElementById("regArea").value,
        puesto: document.getElementById("regPuesto").value,
        correo: document.getElementById("regCorreo").value,
        unidadesRed: document.getElementById("regUnidadesRed").value,
        activo: document.getElementById("regActivo").checked,
        esResponsable: document.getElementById("regResponsable").checked
    };

    const response = await fetch('?handler=RegistrarEmpleado', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
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
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

/* ==========================================================================
   EVENTOS GENERALES
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const btnNuevo = document.getElementById("btnNuevoUsuario");
    const buscador = document.getElementById("buscarUsuario");
    const formNuevo = document.getElementById("formNuevoUsuario");
    const formReporteBitacora = document.getElementById("formReporteBitacora");
    const cantidadUsuarios = document.getElementById("cantidadUsuarios");

    if (buscador) {
        buscador.addEventListener("input", function () {
            window.paginaUsuarios = 1;
            actualizarTablaUsuarios();
        });
    }

    if (cantidadUsuarios) {
        cantidadUsuarios.addEventListener("change", function () {
            window.paginaUsuarios = 1;
            actualizarTablaUsuarios();
        });
    }

    ["filtroNombre", "filtroModulo", "filtroAccion", "filtroFechaInicio", "filtroFechaFin"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener("change", function () {
                window.paginaBitacora = 1;
                actualizarTablaBitacora();
            });
        }
    });

    const cantidadBitacora = document.getElementById("cantidadBitacora");
    if (cantidadBitacora) {
        cantidadBitacora.addEventListener("change", function () {
            window.paginaBitacora = 1;
            actualizarTablaBitacora();
        });
    }

    const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltrosBitacora");
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener("click", limpiarFiltrosBitacora);
    }

    actualizarTablaUsuarios();
    actualizarTablaBitacora();

    if (formReporteBitacora) {
        formReporteBitacora.addEventListener("submit", abrirVistaPreviaReporte);
    }

    if (btnNuevo) {
        btnNuevo.addEventListener("click", abrirModalNuevoUsuario);
    }

    if (buscador) {
        buscador.addEventListener("input", filtrarUsuarios);
    }

    if (formNuevo) {
        formNuevo.addEventListener("submit", validarPasswordTemporal);
    }

    document.querySelectorAll(".js-cerrar-nuevo").forEach(boton => {
        boton.addEventListener("click", cerrarModalNuevoUsuario);
    });

    document.querySelectorAll(".js-cerrar-editar").forEach(boton => {
        boton.addEventListener("click", cerrarModalEditarUsuario);
    });

    document.querySelectorAll(".js-toggle-password").forEach(boton => {
        boton.addEventListener("click", function () {
            cambiarVisibilidadPassword(boton);
        });
    });

    document.querySelectorAll(".js-editar-usuario").forEach(boton => {
        boton.addEventListener("click", function () {
            abrirModalEditarUsuario(boton);
        });
    });

    document.querySelectorAll(".js-restablecer-password").forEach(boton => {
        boton.addEventListener("click", function () {
            confirmarRestablecerPassword(boton);
        });
    });

    document.querySelectorAll(".js-eliminar-usuario").forEach(boton => {
        boton.addEventListener("click", function () {
            confirmarEliminarUsuario(boton);
        });
    });

    abrirModalDesdeServidor();
    if (typeof mostrarMensajesServidor === "function") {
        mostrarMensajesServidor();
    }
});