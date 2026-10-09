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

// Función para cambiar dinámicamente el color del cuadro principal del select
function aplicarColorSelectSistema(selectElement) {
    if (!selectElement) return;
    const val = (selectElement.value || '').toUpperCase().trim();
    
    // Limpiar todas las clases de color previas
    selectElement.classList.remove(
        'badge-sistema-dia', 
        'badge-sistema-diaweb', 
        'badge-sistema-med', 
        'badge-sistema-sita', 
        'badge-sistema-vucem', 
        'badge-sistema-diaenlinea', 
        'badge-sistema-coa', 
        'badge-sistema-admin'
    );

    // Evaluar en orden estricto (Conector tiene prioridad antes de DIAWEB)
    if (val.includes('CONECTOR') || val.includes('ZOE')) {
        selectElement.classList.add('badge-sistema-med');
    } else if (val.includes('DIAWEB')) {
        selectElement.classList.add('badge-sistema-diaweb');
    } else if (val.includes('DIAENLINEA')) {
        selectElement.classList.add('badge-sistema-diaenlinea');
    } else if (val === 'DIA') {
        selectElement.classList.add('badge-sistema-dia');
    } else if (val === 'SITA') {
        selectElement.classList.add('badge-sistema-sita');
    } else if (val === 'VUCEM') {
        selectElement.classList.add('badge-sistema-vucem');
    } else if (val === 'COA') {
        selectElement.classList.add('badge-sistema-coa');
    } else if (val === 'ADMIN') {
        selectElement.classList.add('badge-sistema-admin');
    } else {
        selectElement.classList.add('badge-sistema-med');
    }
}

// Inicialización de colores para selects al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    const regSistema = document.getElementById('regSistema');
    if (regSistema) aplicarColorSelectSistema(regSistema);

    const editSistema = document.getElementById('editSistema');
    if (editSistema) aplicarColorSelectSistema(editSistema);
});

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
   MÓDULO REPORTE DE TICKETS - IMPRESIÓN Y EXPORTACIÓN EXCEL ESTILIZADA
   ========================================================================== */

/* Helper que convierte la gráfica del sistema a imagen sobre fondo blanco e invierte textos a negro al vuelo */
function exportarChartCanvasBlanco(chartInstance) {
    if (!chartInstance || !chartInstance.canvas) return '';

    try {
        const canvasOriginal = chartInstance.canvas;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasOriginal.width;
        tempCanvas.height = canvasOriginal.height;
        const ctx = tempCanvas.getContext('2d');

        // 1. Pintar fondo blanco sólido
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 2. Aplicar filtro de inversión de color (Blanco -> Negro) preservando los tonos de color
        ctx.filter = 'invert(1) hue-rotate(180deg)';

        // 3. Dibujar el canvas original con el filtro aplicado
        ctx.drawImage(canvasOriginal, 0, 0);

        // 4. Limpiar filtro por seguridad
        ctx.filter = 'none';

        return tempCanvas.toDataURL('image/png', 1.0);
    } catch (err) {
        console.error("Error al exportar imagen adaptada del gráfico:", err);
        return chartInstance.toBase64Image ? chartInstance.toBase64Image() : '';
    }
}

function abrirVistaPreviaImpresion() {
    const txtPuntos = document.getElementById("txtPuntosRelevantes")?.value;
    const chkActividades = document.getElementById("chkActividades")?.checked;
    const txtActividades = document.getElementById("txtSoportesInternos")?.value;

    const printPuntos = document.getElementById("printPuntosRelevantes");
    if (printPuntos) {
        printPuntos.innerText = txtPuntos || "Sin observaciones registradas.";
    }

    const tablaInd = document.getElementById("tablaIndicadores");
    const printInd = document.getElementById("contenedorIndicadoresPrint");
    if (tablaInd && printInd) {
        const clonTabla = tablaInd.cloneNode(true);
        clonTabla.className = "tabla-print-indicadores";
        clonTabla.removeAttribute("id");
        printInd.innerHTML = clonTabla.outerHTML;
    }

    // Exportar directamente las imágenes adaptadas a blanco/negro de las gráficas activas
    const imgSistemas = document.getElementById("imgChartSistemasPrint");
    const imgEstatus = document.getElementById("imgChartEstatusPrint");

    if (window.chartSistemasInstance && imgSistemas) {
        const dataUrlSistemas = exportarChartCanvasBlanco(window.chartSistemasInstance);
        if (dataUrlSistemas) imgSistemas.src = dataUrlSistemas;
    }
    if (window.chartEstatusInstance && imgEstatus) {
        const dataUrlEstatus = exportarChartCanvasBlanco(window.chartEstatusInstance);
        if (dataUrlEstatus) imgEstatus.src = dataUrlEstatus;
    }

    const printAct = document.getElementById("contenedorActividadesPrint");
    const printSoportes = document.getElementById("printSoportesInternos");

    if (printAct && printSoportes) {
        if (chkActividades && txtActividades && txtActividades.trim() !== "") {
            printSoportes.innerText = txtActividades;
            printAct.classList.remove("d-none");
        } else {
            printAct.classList.add("d-none");
        }
    }

    const modalElem = document.getElementById("modalVistaPreviaReporte");
    if (modalElem) {
        const modal = new bootstrap.Modal(modalElem);
        modal.show();
    }
}

function imprimirContenidoLimpio() {
    const seccion = document.getElementById("seccionImpresion");
    if (!seccion) {
        window.print();
        return;
    }

    const padreOriginal = seccion.parentNode;
    document.body.appendChild(seccion);

    window.print();

    setTimeout(function () {
        padreOriginal.appendChild(seccion);
    }, 500);
}

function exportarExcelLocal() {
    if (typeof XLSX === "undefined") {
        console.error("La librería XLSX (xlsx-js-style) no está cargada.");
        return;
    }

    try {
        const fecha = typeof fechaReporteActual !== 'undefined' ? fechaReporteActual : "Reporte";
        const wb = XLSX.utils.book_new();

        // Estilos Reutilizables
        const borderNegro = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
        };

        const fontGeneral = { name: 'Segoe UI', sz: 9 };
        const fontHeader = { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: 'FFFFFF' } };
        const fontBlackBold = { name: 'Segoe UI', sz: 8.5, bold: true, color: { rgb: '000000' } };
        const alignCenter = { vertical: 'center', horizontal: 'center' };
        const alignLeft = { vertical: 'top', horizontal: 'left', wrapText: true };

        // Color de encabezado ajustado a Azul Cobalto
        const colorHeaderExcel = '2563eb';

        let rows = [];

        // ENCABEZADOS DEL DOCUMENTO
        rows.push([{ v: 'REPORTE DIARIO DE TICKETS - ' + fecha, s: { font: { name: 'Segoe UI', sz: 14, bold: true, color: { rgb: '0F172A' } } } }]);
        rows.push([{ v: 'SDI Cointer — Departamento de Soporte Técnico', s: { font: { name: 'Segoe UI', sz: 10, italic: true, color: { rgb: '475569' } } } }]);
        rows.push([]);

        // SECCIÓN 1: INDICADORES
        rows.push([{ v: '1. RESUMEN DE INDICADORES', s: { font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } } } }]);

        const headerInd1 = [
            { v: 'Tickets', s: { fill: { fgColor: { rgb: '8EA9DB' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: 'Total', s: { fill: { fgColor: { rgb: '8EA9DB' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: 'Tipo', s: { fill: { fgColor: { rgb: 'DB6E6E' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'DB6E6E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'DB6E6E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'DB6E6E' } }, border: borderNegro } },
            { v: 'Sistemas Externos', s: { fill: { fgColor: { rgb: 'A9D18E' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'A9D18E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'A9D18E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'A9D18E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'A9D18E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'A9D18E' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'A9D18E' } }, border: borderNegro } },
            { v: 'Sistema Int.', s: { fill: { fgColor: { rgb: 'FFD966' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: 'Origen del Ticket', s: { fill: { fgColor: { rgb: 'FCE4D6' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'FCE4D6' } }, border: borderNegro } },
            { v: 'Escalados', s: { fill: { fgColor: { rgb: 'B4A7D6' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'B4A7D6' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'B4A7D6' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'B4A7D6' } }, border: borderNegro } },
            { v: 'Estatus', s: { fill: { fgColor: { rgb: 'FFF2CC' } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: 'FFF2CC' } }, border: borderNegro } }
        ];
        rows.push(headerInd1);

        const subHeaders = ['Servicio', 'Incidencia', 'Ajuste', 'Mejora', 'DIA', 'DIAWEB', 'MED', 'SITA', 'VUCEM', 'DIAENLINEA', 'COA', 'ADMIN', 'Llamada', 'Correo', 'Desarrollo', 'Consultoría', 'Ventas', 'Cobranza', 'Cerrado', 'En Curso'];
        const colorsSubHeaders = ['DB6E6E', 'DB6E6E', 'DB6E6E', 'DB6E6E', 'A9D18E', 'A9D18E', 'A9D18E', 'A9D18E', 'A9D18E', 'A9D18E', 'A9D18E', 'FFD966', 'FCE4D6', 'FCE4D6', 'B4A7D6', 'B4A7D6', 'B4A7D6', 'B4A7D6', 'FFF2CC', 'FFF2CC'];

        let headerInd2 = [
            { v: '', s: { fill: { fgColor: { rgb: '8EA9DB' } }, border: borderNegro } },
            { v: '', s: { fill: { fgColor: { rgb: '8EA9DB' } }, border: borderNegro } }
        ];

        subHeaders.forEach((sh, idx) => {
            headerInd2.push({ v: sh, s: { fill: { fgColor: { rgb: colorsSubHeaders[idx] } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } });
        });
        rows.push(headerInd2);

        const tablaIndHTML = document.getElementById('tablaIndicadores');
        if (tablaIndHTML) {
            const bodyRows = tablaIndHTML.querySelectorAll('tbody tr');
            bodyRows.forEach(tr => {
                let rowData = [];
                tr.querySelectorAll('td').forEach((td, idx) => {
                    const textVal = td.innerText.trim();
                    const numVal = !isNaN(textVal) && textVal !== '' ? Number(textVal) : textVal;
                    const isLabelCol = idx < 2;
                    rowData.push({
                        v: numVal,
                        s: {
                            fill: { fgColor: { rgb: isLabelCol ? 'D9E1F2' : 'FFFFFF' } },
                            font: isLabelCol ? fontBlackBold : fontGeneral,
                            alignment: alignCenter,
                            border: borderNegro
                        }
                    });
                });
                rows.push(rowData);
            });
        }

        rows.push([]);

        // SECCIÓN 2: PUNTOS RELEVANTES
        const txtPuntos = document.getElementById('txtPuntosRelevantes')?.value || 'Sin observaciones registradas.';
        rows.push([{ v: '2. PUNTOS RELEVANTES DEL DÍA', s: { font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } } } }]);
        rows.push([{ v: txtPuntos, s: { font: fontGeneral, alignment: { wrapText: true, vertical: 'top' }, fill: { fgColor: { rgb: 'F1F5F9' } }, border: borderNegro } }]);
        rows.push([]);

        // SECCIÓN 3: ACTIVIDADES ADICIONALES
        const chkActividades = document.getElementById("chkActividades")?.checked;
        const txtActividades = document.getElementById("txtSoportesInternos")?.value;
        if (chkActividades && txtActividades) {
            rows.push([{ v: '3. SOPORTES INTERNOS / ACTIVIDADES ADICIONALES', s: { font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } } } }]);
            rows.push([{ v: txtActividades, s: { font: fontGeneral, alignment: { wrapText: true, vertical: 'top' }, fill: { fgColor: { rgb: 'F1F5F9' } }, border: borderNegro } }]);
            rows.push([]);
        }

        // SECCIÓN 4: DETALLE COMPLETO DE TICKETS
        rows.push([{ v: 'DETALLE COMPLETO DE TICKETS', s: { font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } } } }]);

        const headersDetalle = ['Fecha Entrada', 'Hora', 'No. Ticket', 'Cliente', 'Ejecutivo', 'Reportó', 'Estatus', 'Sistema', 'Tipo', 'Descripción', 'Comentarios', 'Solución'];
        let rowHeadersDetalle = [];
        headersDetalle.forEach(h => {
            rowHeadersDetalle.push({
                v: h,
                s: { fill: { fgColor: { rgb: colorHeaderExcel } }, font: fontHeader, alignment: alignCenter, border: borderNegro }
            });
        });
        rows.push(rowHeadersDetalle);

        const tablaDetalleHTML = document.getElementById('tablaDetalleTickets');
        if (tablaDetalleHTML) {
            const trs = tablaDetalleHTML.querySelectorAll('tbody tr');
            trs.forEach((tr, rowIdx) => {
                if (tr.cells.length < 10) return;

                const bgRow = rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

                const fechaEntrada = tr.cells[0]?.innerText.trim() || '';
                const hora = tr.cells[2]?.innerText.trim() || '';
                const numTicket = tr.getAttribute('data-numticket') || tr.cells[3]?.innerText.trim() || '';
                const cliente = tr.getAttribute('data-cliente') || tr.cells[4]?.innerText.trim() || '';
                const ejecutivo = tr.getAttribute('data-ejecutivo') || tr.cells[5]?.innerText.trim() || '';
                const reporto = tr.getAttribute('data-reporto') || tr.cells[6]?.innerText.trim() || '';
                const estatus = tr.getAttribute('data-estatus') || tr.cells[7]?.innerText.trim() || '';
                const sistema = tr.getAttribute('data-sistema') || tr.cells[8]?.innerText.trim() || '';
                const tipo = tr.getAttribute('data-tipo') || tr.cells[9]?.innerText.trim() || '';
                const descripcion = tr.getAttribute('data-descripcion') || '';
                const comentarios = tr.getAttribute('data-comentarios') || '';
                const solucion = tr.getAttribute('data-solucion') || '';

                const rowDetalle = [
                    { v: fechaEntrada, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignCenter, border: borderNegro } },
                    { v: hora, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignCenter, border: borderNegro } },
                    { v: numTicket, s: { fill: { fgColor: { rgb: bgRow } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
                    { v: cliente, s: { fill: { fgColor: { rgb: bgRow } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
                    { v: ejecutivo, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignCenter, border: borderNegro } },
                    { v: reporto, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignCenter, border: borderNegro } },
                    {
                        v: estatus,
                        s: {
                            fill: { fgColor: { rgb: estatus === 'Cerrado' ? 'DCFCE7' : 'FEF9C3' } },
                            font: { name: 'Segoe UI', sz: 8.5, bold: true, color: { rgb: estatus === 'Cerrado' ? '166534' : '854D0E' } },
                            alignment: alignCenter,
                            border: borderNegro
                        }
                    },
                    { v: sistema, s: { fill: { fgColor: { rgb: bgRow } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } },
                    { v: tipo, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignCenter, border: borderNegro } },
                    { v: descripcion, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignLeft, border: borderNegro } },
                    { v: comentarios, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignLeft, border: borderNegro } },
                    { v: solucion, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignLeft, border: borderNegro } }
                ];

                rows.push(rowDetalle);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws['!merges'] = [
            { s: { r: 3, c: 0 }, e: { r: 3, c: 21 } },
            { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
            { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
            { s: { r: 4, c: 2 }, e: { r: 4, c: 5 } },
            { s: { r: 4, c: 6 }, e: { r: 4, c: 12 } },
            { s: { r: 4, c: 14 }, e: { r: 4, c: 15 } },
            { s: { r: 4, c: 16 }, e: { r: 4, c: 19 } },
            { s: { r: 4, c: 20 }, e: { r: 4, c: 21 } },
            { s: { r: 9, c: 0 }, e: { r: 9, c: 11 } },
            { s: { r: 10, c: 0 }, e: { r: 10, c: 11 } }
        ];

        ws['!cols'] = [
            { wch: 14 }, // Fecha Entrada
            { wch: 10 }, // Hora
            { wch: 12 }, // No. Ticket
            { wch: 28 }, // Cliente
            { wch: 22 }, // Ejecutivo
            { wch: 22 }, // Reportó
            { wch: 12 }, // Estatus
            { wch: 12 }, // Sistema
            { wch: 12 }, // Tipo
            { wch: 45 }, // Descripción
            { wch: 45 }, // Comentarios
            { wch: 45 }  // Solución
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');

        /* HOJA 2: CONCENTRADO POR SISTEMA (ACTUALIZADA A 3 CATEGORÍAS DE ESTATUS) */
        const ws2_rows = [];
        ws2_rows.push([{ v: 'CONCENTRADO DE TICKETS POR SISTEMA - ' + fecha, s: { font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: '0F172A' } } } }]);
        ws2_rows.push([]);

        const headersWs2 = [
            'Sistema', 
            'Total Tickets', 
            'Incidencias', 
            'Servicios', 
            'Por Teléfono', 
            'Por Correo', 
            'Atendidos (Tiempo y Forma)', 
            'Cerrados (Atrasados)', 
            'En Curso (Seguimiento)'
        ];
        let rowHeader2 = [];
        headersWs2.forEach(h => {
            rowHeader2.push({ v: h, s: { fill: { fgColor: { rgb: colorHeaderExcel } }, font: fontHeader, alignment: alignCenter, border: borderNegro } });
        });
        ws2_rows.push(rowHeader2);

        const tablaConcentradoHTML = document.getElementById('tablaConcentradoSistema');
        if (tablaConcentradoHTML) {
            const trs = tablaConcentradoHTML.querySelectorAll('tbody tr');
            trs.forEach((tr, rowIdx) => {
                let rData = [];
                const bgRow = rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
                tr.querySelectorAll('td').forEach(td => {
                    const txt = td.innerText.trim();
                    const num = !isNaN(txt) && txt !== '' ? Number(txt) : txt;
                    rData.push({ v: num, s: { fill: { fgColor: { rgb: bgRow } }, font: fontGeneral, alignment: alignCenter, border: borderNegro } });
                });
                ws2_rows.push(rData);
            });
        }

        const wsConcentrado = XLSX.utils.aoa_to_sheet(ws2_rows);
        wsConcentrado['!cols'] = [
            { wch: 18 }, // Sistema
            { wch: 14 }, // Total Tickets
            { wch: 14 }, // Incidencias
            { wch: 12 }, // Servicios
            { wch: 14 }, // Por Teléfono
            { wch: 14 }, // Por Correo
            { wch: 28 }, // Atendidos (Tiempo y Forma)
            { wch: 24 }, // Cerrados (Atrasados)
            { wch: 26 }  // En Curso (Seguimiento)
        ];

        XLSX.utils.book_append_sheet(wb, wsConcentrado, 'Concentrado por Sistema');

        const nombreArchivo = `Reporte_Tickets_${fecha}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

    } catch (err) {
        console.error('Error al exportar Excel estilizado:', err);
        alert('Ocurrió un error al generar la exportación a Excel.');
    }
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - REGISTRO
   ========================================================================== */

function cambiarCliente(elem) {
    const boxNuevo = document.getElementById("boxClienteNuevo");
    const ddlContactos = document.getElementById("ddlContactos");

    if (!ddlContactos) return;

    ddlContactos.innerHTML = '<option value="">-- Selecciona quien reporta --</option><option value="OTRO">+ Agregar otra persona...</option>';

    if (elem.value === "OTRO") {
        if (boxNuevo) boxNuevo.classList.remove("d-none");
    } else {
        if (boxNuevo) boxNuevo.classList.add("d-none");
        if (elem.value) {
            fetch(`?handler=ContactosPorCliente&clienteId=${elem.value}`)
                .then(res => res.json())
                .then(data => {
                    data.forEach(c => {
                        const opt = document.createElement("option");
                        opt.value = c.nombreContacto;
                        opt.dataset.correo = c.correo || "";
                        opt.textContent = c.nombreContacto;
                        ddlContactos.insertBefore(opt, ddlContactos.lastElementChild);
                    });
                })
                .catch(err => console.error("Error al obtener los contactos:", err));
        }
    }
}

function cambiarContacto(elem) {
    const txtManual = document.getElementById("txtReportoManual");
    const txtCorreo = document.getElementById("txtCorreoReporto");

    if (elem.value === "OTRO") {
        if (txtManual) txtManual.classList.remove("d-none");
        if (txtCorreo) txtCorreo.value = "";
    } else {
        if (txtManual) txtManual.classList.add("d-none");
        const optionSelected = elem.options[elem.selectedIndex];
        if (txtCorreo) txtCorreo.value = optionSelected.dataset.correo || "";
    }
}

function cambiarEscalado(elem) {
    const boxArea = document.getElementById("boxAreaEscalada");
    if (!boxArea) return;

    if (elem.value === "true") {
        boxArea.classList.remove("d-none");
    } else {
        boxArea.classList.add("d-none");
    }
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - FUNCIONALIDAD DE FECHAS Y MODALES
   ========================================================================== */

function evaluarFechaSolucionNuevo(estatus) {
    const inputFecha = document.getElementById("regFechaSolucion");
    if (!inputFecha) return;

    if (estatus === "Cerrado") {
        inputFecha.removeAttribute("disabled");
        if (!inputFecha.value) {
            const hoy = new Date().toISOString().split("T")[0];
            inputFecha.value = hoy;
        }
    } else {
        inputFecha.setAttribute("disabled", "true");
        inputFecha.value = "";
    }
}

function evaluarFechaSolucion(estatus) {
    const inputFecha = document.getElementById("editFechaSolucion");
    if (!inputFecha) return;

    if (estatus === "Cerrado") {
        inputFecha.removeAttribute("disabled");
        if (!inputFecha.value) {
            const hoy = new Date().toISOString().split("T")[0];
            inputFecha.value = hoy;
        }
    } else {
        inputFecha.setAttribute("disabled", "true");
        inputFecha.value = "";
    }
}

function evaluarAreaEscaladaEdit(valorEscalado) {
    const boxArea = document.getElementById("boxEditAreaEscalada");
    const selectArea = document.getElementById("editAreaEscalada");

    if (!boxArea) return;

    if (valorEscalado === "true" || valorEscalado === true) {
        boxArea.classList.remove("d-none");
    } else {
        boxArea.classList.add("d-none");
        if (selectArea) selectArea.value = "";
    }
}

function abrirModalDetalleDesdeFila(filaElem) {
    const id = filaElem.dataset.id;
    const fechaEntrada = filaElem.dataset.fechaentrada;
    const hora = filaElem.dataset.hora;
    const numTicket = filaElem.dataset.numticket;
    const cliente = filaElem.dataset.cliente;
    const reporto = filaElem.dataset.reporto;
    const ejecutivo = filaElem.dataset.ejecutivo;
    const sistema = filaElem.dataset.sistema;
    const tipo = filaElem.dataset.tipo;
    const estatus = filaElem.dataset.estatus;
    const escalado = filaElem.dataset.escalado;
    const areaEscalada = filaElem.dataset.areaescalada;
    const fechaSolucion = filaElem.dataset.fechasolucion;
    const descripcion = filaElem.dataset.descripcion;
    const comentarios = filaElem.dataset.comentarios;
    const solucion = filaElem.dataset.solucion;

    document.getElementById("editTicketId").value = id;
    document.getElementById("lblNumTicket").textContent = "#" + numTicket;
    document.getElementById("editFechaEntrada").value = fechaEntrada || "";

    const inputHora = document.getElementById("editHora");
    if (inputHora) {
        inputHora.value = convertir12a24(hora);
    }

    document.getElementById("editCliente").value = cliente || "";
    document.getElementById("editReporto").value = reporto || "";
    document.getElementById("editEjecutivo").value = ejecutivo || "";
    
    // Asignación de Sistema y actualización de color
    const selectEditSistema = document.getElementById("editSistema");
    if (selectEditSistema) {
        selectEditSistema.value = sistema || "SITA";
        aplicarColorSelectSistema(selectEditSistema);
    }

    document.getElementById("editTipo").value = tipo || "Servicio";
    document.getElementById("editEstatus").value = estatus || "En curso";

    const esEscalado = (escalado === "true");
    document.getElementById("editEscalado").value = esEscalado ? "true" : "false";
    document.getElementById("editAreaEscalada").value = areaEscalada || "";
    evaluarAreaEscaladaEdit(esEscalado);

    const inputFecha = document.getElementById("editFechaSolucion");
    if (inputFecha) inputFecha.value = fechaSolucion || "";
    evaluarFechaSolucion(estatus);

    document.getElementById("txtDetalleDescripcion").value = descripcion || "";
    document.getElementById("txtDetalleComentarios").value = comentarios || "";
    document.getElementById("txtDetalleSolucion").value = solucion || "";

    const esAdmin = (typeof rolUsuario !== 'undefined' && rolUsuario === "Administrador");
    const esMio = (typeof usuarioSesion !== 'undefined' && ejecutivo === usuarioSesion);
    const estaAbierto = (estatus !== "Cerrado");

    const campos = [
        "editFechaEntrada", "editHora", "editCliente", "editReporto", "editEjecutivo", "editSistema",
        "editTipo", "editEstatus", "editEscalado", "editAreaEscalada",
        "txtDetalleDescripcion", "txtDetalleComentarios", "txtDetalleSolucion"
    ];

    const btnGuardar = document.getElementById("btnGuardarCambios");

    if (esAdmin || (estaAbierto && esMio)) {
        campos.forEach(idCampo => {
            const el = document.getElementById(idCampo);
            if (el) {
                el.removeAttribute("readonly");
                el.removeAttribute("disabled");
            }
        });
        if (btnGuardar) btnGuardar.classList.remove("d-none");
    } else {
        campos.forEach(idCampo => {
            const el = document.getElementById(idCampo);
            if (el) {
                if (el.tagName === "SELECT") el.setAttribute("disabled", "true");
                else el.setAttribute("readonly", "true");
            }
        });
        if (inputFecha) inputFecha.setAttribute("disabled", "true");
        if (btnGuardar) btnGuardar.classList.add("d-none");
    }

    const modalElem = document.getElementById("modalDetalleTicket");
    if (modalElem) {
        const modal = new bootstrap.Modal(modalElem);
        modal.show();
    }
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

    /* --- PERSISTENCIA Y EVENTOS MÓDULO TICKETS --- */
    const inputFecha = document.getElementById("fechaReporteConsulta");
    const txtPuntos = document.getElementById("txtPuntosRelevantes");
    const chkActividades = document.getElementById("chkActividades");
    const boxActividades = document.getElementById("boxActividades");
    const txtActividades = document.getElementById("txtSoportesInternos");
    const btnGenerar = document.getElementById("btnGenerarReporte");
    const btnExcel = document.getElementById("btnExportarExcel");

    if (inputFecha && txtPuntos) {
        const fechaActual = inputFecha.value;
        const keyPuntos = `sigesti_puntos_${fechaActual}`;
        const keyActividades = `sigesti_actividades_${fechaActual}`;
        const keyChkActividades = `sigesti_chk_actividades_${fechaActual}`;

        txtPuntos.value = localStorage.getItem(keyPuntos) || "";
        if (txtActividades) {
            txtActividades.value = localStorage.getItem(keyActividades) || "";
        }

        const chkGuardado = localStorage.getItem(keyChkActividades) === "true";
        if (chkActividades) {
            chkActividades.checked = chkGuardado;
            evaluarEstadoActividades(chkGuardado);

            chkActividades.addEventListener("change", function () {
                evaluarEstadoActividades(this.checked);
                localStorage.setItem(keyChkActividades, this.checked);
                if (!this.checked && txtActividades) {
                    txtActividades.value = "";
                    localStorage.removeItem(keyActividades);
                }
            });
        }

        txtPuntos.addEventListener("input", function () {
            localStorage.setItem(keyPuntos, this.value);
        });

        if (txtActividades) {
            txtActividades.addEventListener("input", function () {
                localStorage.setItem(keyActividades, this.value);
            });
        }

        function evaluarEstadoActividades(habilitado) {
            if (!boxActividades || !txtActividades) return;
            if (habilitado) {
                boxActividades.classList.remove("d-none");
                txtActividades.removeAttribute("disabled");
            } else {
                boxActividades.classList.add("d-none");
                txtActividades.setAttribute("disabled", "true");
            }
        }
    }

    if (btnGenerar) {
        btnGenerar.addEventListener("click", abrirVistaPreviaImpresion);
    }

    if (btnExcel) {
        btnExcel.addEventListener("click", exportarExcelLocal);
    }

    // Inicializar hora actual por defecto en modal nuevo ticket si el input está vacío
    const modalNuevoElem = document.getElementById("modalNuevoTicket");
    if (modalNuevoElem) {
        modalNuevoElem.addEventListener("show.bs.modal", function () {
            const regHoraInput = document.getElementById("regHora");
            if (regHoraInput && !regHoraInput.value) {
                const ahora = new Date();
                const hh = String(ahora.getHours()).padStart(2, "0");
                const mm = String(ahora.getMinutes()).padStart(2, "0");
                regHoraInput.value = `${hh}:${mm}`;
            }
        });
    }
});