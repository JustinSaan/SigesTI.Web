"use strict";

/* ==========================================================================
   CONTROL DE ACCESO
   Usuarios, bitácora, roles y permisos, y reporte de bitácora.
   ========================================================================== */

let paginaUsuarios = 1;
let paginaBitacora = 1;

function mostrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
}

function ocultarModal(id) {
    const modal = document.getElementById(id);
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
}

function normalizarTexto(texto) {
    return (texto || "").toString().trim().toLocaleLowerCase("es-MX");
}

/* ==========================================================================
   1. MODALES DE USUARIO
   ========================================================================== */

function llenarModalEditar(datos) {
    document.getElementById("editIdUsuario").value = datos.id;
    document.getElementById("editNombreCompleto").value = datos.nombre;
    document.getElementById("editNombreUsuario").value = datos.usuario;
    document.getElementById("editCorreo").value = datos.correo;
    document.getElementById("editRol").value = datos.rol;
    document.getElementById("editActivo").checked = datos.activo;
    document.getElementById("subtituloEditarUsuario").textContent = datos.nombre;

    // En tu propia cuenta no se puede cambiar el rol ni desactivarla
    const esYo = esCuentaPropia(datos.id);
    document.getElementById("editRol").disabled = esYo;
    document.getElementById("editActivo").disabled = esYo;
    document.getElementById("editRolFijo").disabled = !esYo;
    document.getElementById("editRolFijo").value = datos.rol;
    document.getElementById("editActivoOculto").value = esYo ? "true" : "false";
    document.getElementById("notaCuentaPropia").classList.toggle("d-none", !esYo);

    mostrarModal("modalEditarUsuario");
}

function esCuentaPropia(idUsuario) {
    const fila = document.querySelector(`.fila-usuario[data-id="${idUsuario}"]`);
    return fila !== null && fila.dataset.esYo === "true";
}

function abrirModalEditarUsuario(boton) {
    const fila = boton.closest("tr").dataset;

    llenarModalEditar({
        id: fila.id,
        nombre: fila.nombre,
        usuario: fila.usuario,
        correo: fila.correo,
        rol: fila.rol,
        activo: fila.activo === "true"
    });
}

function cambiarVisibilidadPassword(boton) {
    const input = document.getElementById(boton.dataset.input);
    const icono = boton.querySelector("i");
    if (!input || !icono) return;

    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    icono.classList.toggle("bi-eye", !mostrar);
    icono.classList.toggle("bi-eye-slash", mostrar);
    boton.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
}

function validarPasswordTemporal(evento) {
    const password = document.getElementById("passwordTemporal").value;
    const confirmacion = document.getElementById("confirmarPasswordTemporal").value;

    if (password !== confirmacion) {
        evento.preventDefault();
        mostrarError("La contraseña temporal y la confirmación no coinciden.", "Contraseñas diferentes");
        return;
    }

    if (password.length < 8) {
        evento.preventDefault();
        mostrarAdvertencia("La contraseña temporal debe tener al menos 8 caracteres.", "Contraseña demasiado corta");
    }
}

function confirmarEliminarUsuario(boton) {
    const fila = boton.closest("tr").dataset;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Eliminar usuario?",
        mensaje: "Se eliminará la cuenta <b>" + escaparHtml(fila.usuario) + "</b>.<br><br>La información histórica de la bitácora se conservará.",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("eliminarIdUsuario").value = fila.id;
            document.getElementById("formEliminarUsuario").submit();
        }
    });
}

function confirmarRestablecerPassword(boton) {
    const fila = boton.closest("tr").dataset;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Restablecer contraseña?",
        mensaje: "Se generará una nueva contraseña temporal para <b>" + escaparHtml(fila.usuario) + "</b> y se cerrará su sesión.",
        textoConfirmar: "Sí, restablecer",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("passwordIdUsuario").value = fila.id;
            document.getElementById("formRestablecerPassword").submit();
        }
    });
}

// Si el servidor regresó un error, se vuelve a abrir el modal con lo que se había escrito
function abrirModalDesdeServidor() {
    if (document.getElementById("abrirModalNuevo").value.toLowerCase() === "true") {
        mostrarModal("modalNuevoUsuario");
    }

    const editarUsuario = document.getElementById("editarUsuarioConError").value;
    if (editarUsuario) {
        const datos = JSON.parse(editarUsuario);

        llenarModalEditar({
            id: datos.IdUsuario,
            nombre: datos.NombreCompleto,
            usuario: datos.NombreUsuario,
            correo: datos.Correo,
            rol: datos.Rol,
            activo: datos.Activo
        });
    }
}

/* ==========================================================================
   2. TABLAS CON BÚSQUEDA Y PAGINACIÓN
   ========================================================================== */

function crearPaginacion(contenedorId, paginaActual, totalPaginas, cambiarPagina) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = "";
    if (totalPaginas <= 1) return;

    function agregarBoton(texto, pagina, deshabilitado, activo, etiqueta) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.innerHTML = texto;
        boton.disabled = deshabilitado;
        boton.setAttribute("aria-label", etiqueta);
        if (activo) {
            boton.classList.add("active");
            boton.setAttribute("aria-current", "page");
        }
        boton.addEventListener("click", function () {
            cambiarPagina(pagina);
        });
        contenedor.appendChild(boton);
    }

    agregarBoton('<i class="bi bi-chevron-left"></i>', paginaActual - 1, paginaActual === 1, false, "Página anterior");

    for (let numero = 1; numero <= totalPaginas; numero++) {
        agregarBoton(numero, numero, false, numero === paginaActual, "Página " + numero);
    }

    agregarBoton('<i class="bi bi-chevron-right"></i>', paginaActual + 1, paginaActual === totalPaginas, false, "Página siguiente");
}

// Muestra solo las filas de la página actual y actualiza el texto "Mostrando..."
function paginarFilas(filas, filasFiltradas, pagina, cantidad, resultadoId, nombrePlural) {
    const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / cantidad));
    const paginaValida = Math.min(pagina, totalPaginas);
    const inicio = (paginaValida - 1) * cantidad;
    const fin = inicio + cantidad;

    filas.forEach(fila => fila.classList.add("d-none"));
    filasFiltradas.slice(inicio, fin).forEach(fila => fila.classList.remove("d-none"));

    const resultado = document.getElementById(resultadoId);
    if (resultado) {
        resultado.textContent = filasFiltradas.length === 0
            ? "No se encontraron " + nombrePlural
            : `Mostrando ${inicio + 1} a ${Math.min(fin, filasFiltradas.length)} de ${filasFiltradas.length} ${nombrePlural}`;
    }

    return { paginaValida, totalPaginas };
}

function actualizarTablaUsuarios() {
    const filas = Array.from(document.querySelectorAll(".fila-usuario"));
    const texto = normalizarTexto(document.getElementById("buscarUsuario").value);
    const cantidad = parseInt(document.getElementById("cantidadUsuarios").value, 10);

    const filasFiltradas = filas.filter(fila => normalizarTexto(fila.innerText).includes(texto));

    document.getElementById("sinResultadosUsuarios")?.classList.toggle("d-none", filasFiltradas.length > 0 || filas.length === 0);

    const { paginaValida, totalPaginas } = paginarFilas(filas, filasFiltradas, paginaUsuarios, cantidad, "resultadoUsuarios", "usuarios");
    paginaUsuarios = paginaValida;

    crearPaginacion("paginacionUsuarios", paginaUsuarios, totalPaginas, function (pagina) {
        paginaUsuarios = pagina;
        actualizarTablaUsuarios();
    });
}

function actualizarTablaBitacora() {
    const filas = Array.from(document.querySelectorAll(".fila-bitacora"));
    const nombre = normalizarTexto(document.getElementById("filtroNombre").value);
    const modulo = normalizarTexto(document.getElementById("filtroModulo").value);
    const accion = normalizarTexto(document.getElementById("filtroAccion").value);
    const fechaInicio = document.getElementById("filtroFechaInicio").value;
    const fechaFin = document.getElementById("filtroFechaFin").value;
    const cantidad = parseInt(document.getElementById("cantidadBitacora").value, 10);

    const filasFiltradas = filas.filter(fila =>
        (!nombre || normalizarTexto(fila.dataset.nombre) === nombre) &&
        (!modulo || normalizarTexto(fila.dataset.modulo) === modulo) &&
        (!accion || normalizarTexto(fila.dataset.accion) === accion) &&
        (!fechaInicio || fila.dataset.fecha >= fechaInicio) &&
        (!fechaFin || fila.dataset.fecha <= fechaFin));

    document.getElementById("sinResultadosBitacora")?.classList.toggle("d-none", filasFiltradas.length > 0 || filas.length === 0);

    const { paginaValida, totalPaginas } = paginarFilas(filas, filasFiltradas, paginaBitacora, cantidad, "resultadoBitacora", "registros");
    paginaBitacora = paginaValida;

    crearPaginacion("paginacionBitacora", paginaBitacora, totalPaginas, function (pagina) {
        paginaBitacora = pagina;
        actualizarTablaBitacora();
    });
}

function limpiarFiltrosBitacora() {
    ["filtroNombre", "filtroModulo", "filtroAccion", "filtroFechaInicio", "filtroFechaFin"].forEach(id => {
        document.getElementById(id).value = "";
    });

    paginaBitacora = 1;
    actualizarTablaBitacora();
}

/* ==========================================================================
   3. ROLES Y PERMISOS
   ========================================================================== */

function mostrarPermisosRol(rol) {
    document.querySelectorAll(".js-tab-permisos").forEach(tab => {
        const activa = tab.dataset.rol === rol;
        tab.classList.toggle("active", activa);
        tab.setAttribute("aria-selected", activa);
    });

    document.querySelectorAll(".permisos-rol").forEach(panel => {
        panel.classList.toggle("d-none", panel.dataset.rol !== rol);
    });
}

// Sin "Ver" no se puede hacer nada más en el módulo
function ajustarPermisosFila(casilla) {
    const casillasFila = document.querySelectorAll(`input[data-fila="${casilla.dataset.fila}"]`);

    if (casilla.dataset.accion === "Ver" && !casilla.checked) {
        casillasFila.forEach(c => c.checked = false);
    }

    if (casilla.dataset.accion !== "Ver" && casilla.checked) {
        casillasFila.forEach(c => {
            if (c.dataset.accion === "Ver") c.checked = true;
        });
    }

    actualizarInterruptorGrupo(casilla.dataset.grupo);
}

// El interruptor del menú completo prende "Ver" en todos sus módulos o apaga todo
function cambiarGrupoPermisos(interruptor) {
    const casillasGrupo = document.querySelectorAll(`input[data-fila][data-grupo="${interruptor.dataset.grupo}"]`);

    casillasGrupo.forEach(c => {
        if (!interruptor.checked) {
            c.checked = false;
        } else if (c.dataset.accion === "Ver") {
            c.checked = true;
        }
    });
}

// El menú se ve encendido si al menos un módulo del grupo tiene "Ver"
function actualizarInterruptorGrupo(grupo) {
    const interruptor = document.querySelector(`.js-grupo-permisos[data-grupo="${grupo}"]`);
    if (!interruptor) return;

    const casillasVer = document.querySelectorAll(`input[data-fila][data-grupo="${grupo}"][data-accion="Ver"]`);
    interruptor.checked = Array.from(casillasVer).some(c => c.checked);
}

/* ==========================================================================
   4. REPORTE DE BITÁCORA
   ========================================================================== */

// El formulario carga el reporte en el iframe; aquí se cambia de modal
function abrirVistaPreviaReporte() {
    ocultarModal("modalConfigurarReporte");
    mostrarModal("modalVistaPreviaReporte");
}

// Nombre del archivo: ReporteBitacora_DDMMAAAAHHMMSS
function nombreArchivoReporte() {
    const ahora = new Date();
    const dos = valor => String(valor).padStart(2, "0");

    return "ReporteBitacora_" +
        dos(ahora.getDate()) + dos(ahora.getMonth() + 1) + ahora.getFullYear() +
        dos(ahora.getHours()) + dos(ahora.getMinutes()) + dos(ahora.getSeconds());
}

// Abre la ventana de impresión del navegador con el reporte
function imprimirReporteBitacora() {
    const iframe = document.getElementById("iframeReporteBitacora");

    // El título se usa como nombre si en la ventana de impresión eligen "Guardar como PDF"
    iframe.contentDocument.title = nombreArchivoReporte();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
}

// Descarga el PDF que arma el servidor (ReporteBitacoraPdf.cs) con los mismos filtros del modal
function descargarPdfBitacora() {
    const filtros = new URLSearchParams(new FormData(document.getElementById("formReporteBitacora")));
    filtros.set("handler", "Pdf");

    window.location.href = "/Cuenta/ReporteBitacora?" + filtros.toString();
}

/* ==========================================================================
   5. DEPURAR BITÁCORA (solo Admin)
   ========================================================================== */

// Pregunta al servidor cuántos registros hay en el rango para mostrarlo antes de borrar
async function actualizarConteoDepuracion() {
    const desde = document.getElementById("depurarDesde").value;
    const hasta = document.getElementById("depurarHasta").value;
    const conteo = document.getElementById("conteoDepuracion");
    const texto = document.getElementById("textoDepuracion");
    const boton = document.getElementById("btnConfirmarDepuracion");

    boton.disabled = true;
    boton.dataset.total = "0";

    if (!hasta) {
        conteo.textContent = "—";
        texto.textContent = "elige la fecha final";
        return;
    }

    if (desde && desde > hasta) {
        conteo.textContent = "—";
        texto.textContent = "la fecha inicial es mayor que la final";
        return;
    }

    conteo.textContent = "…";

    try {
        const parametros = new URLSearchParams({ handler: "ContarDepuracion", desde: desde, hasta: hasta });
        const respuesta = await fetch("?" + parametros.toString());
        const datos = await respuesta.json();

        conteo.textContent = datos.total.toLocaleString("es-MX");
        texto.textContent = datos.total === 1 ? "registro se eliminará" : "registros se eliminarán";
        boton.disabled = datos.total === 0;
        boton.dataset.total = datos.total;
    } catch {
        conteo.textContent = "—";
        texto.textContent = "no se pudo calcular, intenta de nuevo";
    }
}

function confirmarDepuracion() {
    const total = parseInt(document.getElementById("btnConfirmarDepuracion").dataset.total, 10);

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Eliminar registros?",
        mensaje: "Se eliminarán <b>" + total.toLocaleString("es-MX") + "</b> registros de la bitácora.<br><br>Esta acción no se puede deshacer.",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("formDepurarBitacora").submit();
        }
    });
}

// Pasa el rango al modal del reporte para imprimirlo antes de borrar
function imprimirRangoDepuracion() {
    document.getElementById("reporteFechaInicio").value = document.getElementById("depurarDesde").value;
    document.getElementById("reporteFechaFin").value = document.getElementById("depurarHasta").value;

    ocultarModal("modalDepurarBitacora");
    mostrarModal("modalConfigurarReporte");
}

/* ==========================================================================
   6. EVENTOS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("buscarUsuario").addEventListener("input", function () {
        paginaUsuarios = 1;
        actualizarTablaUsuarios();
    });

    document.getElementById("cantidadUsuarios").addEventListener("change", function () {
        paginaUsuarios = 1;
        actualizarTablaUsuarios();
    });

    ["filtroNombre", "filtroModulo", "filtroAccion", "filtroFechaInicio", "filtroFechaFin", "cantidadBitacora"].forEach(id => {
        document.getElementById(id).addEventListener("change", function () {
            paginaBitacora = 1;
            actualizarTablaBitacora();
        });
    });

    document.getElementById("btnLimpiarFiltrosBitacora").addEventListener("click", limpiarFiltrosBitacora);

    document.getElementById("formNuevoUsuario")?.addEventListener("submit", validarPasswordTemporal);
    document.getElementById("formReporteBitacora")?.addEventListener("submit", abrirVistaPreviaReporte);

    document.querySelectorAll(".js-toggle-password").forEach(boton => {
        boton.addEventListener("click", () => cambiarVisibilidadPassword(boton));
    });

    document.querySelectorAll(".js-editar-usuario").forEach(boton => {
        boton.addEventListener("click", () => abrirModalEditarUsuario(boton));
    });

    document.querySelectorAll(".js-restablecer-password").forEach(boton => {
        boton.addEventListener("click", () => confirmarRestablecerPassword(boton));
    });

    document.querySelectorAll(".js-eliminar-usuario").forEach(boton => {
        boton.addEventListener("click", () => confirmarEliminarUsuario(boton));
    });

    document.querySelectorAll(".js-tab-permisos").forEach(tab => {
        tab.addEventListener("click", () => mostrarPermisosRol(tab.dataset.rol));
    });

    document.querySelectorAll(".switch-permiso input[data-fila]").forEach(casilla => {
        casilla.addEventListener("change", () => ajustarPermisosFila(casilla));
    });

    document.querySelectorAll(".js-grupo-permisos").forEach(interruptor => {
        interruptor.addEventListener("change", () => cambiarGrupoPermisos(interruptor));
    });

    // Al cerrar el modal de nuevo usuario se limpia, para no dejar contraseñas escritas
    document.getElementById("modalNuevoUsuario")?.addEventListener("hidden.bs.modal", function () {
        document.getElementById("formNuevoUsuario").reset();
    });

    const modalDepurar = document.getElementById("modalDepurarBitacora");
    if (modalDepurar) {
        modalDepurar.addEventListener("show.bs.modal", actualizarConteoDepuracion);
        document.getElementById("depurarDesde").addEventListener("change", actualizarConteoDepuracion);
        document.getElementById("depurarHasta").addEventListener("change", actualizarConteoDepuracion);
        document.getElementById("btnConfirmarDepuracion").addEventListener("click", confirmarDepuracion);
        document.getElementById("btnImprimirRangoDepurar").addEventListener("click", imprimirRangoDepuracion);
    }

    actualizarTablaUsuarios();
    actualizarTablaBitacora();
    abrirModalDesdeServidor();
});
