"use strict";

/* ==========================================================================
   HELPERS
   ========================================================================== */

function convertir12a24(hora12Str) {
    if (!hora12Str) return "";
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(hora12Str.trim())) return hora12Str.trim();

    const match = hora12Str.match(/(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|AM|PM)?/i);
    if (!match) return "";

    let horas = parseInt(match[1], 10);
    const minutos = match[2];
    const meridiano = match[3] ? match[3].toLowerCase() : "";

    if ((meridiano.includes("p") || meridiano.includes("pm")) && horas < 12) horas += 12;
    else if ((meridiano.includes("a") || meridiano.includes("am")) && horas === 12) horas = 0;

    return `${String(horas).padStart(2, "0")}:${minutos}`;
}

function aplicarColorSelectSistema(selectElement) {
    if (!selectElement) return;
    const val = (selectElement.value || '').toUpperCase().trim();
    
    selectElement.classList.remove(
        'badge-sistema-dia', 'badge-sistema-diaweb', 'badge-sistema-med', 
        'badge-sistema-sita', 'badge-sistema-vucem', 'badge-sistema-diaenlinea', 
        'badge-sistema-coa', 'badge-sistema-admin'
    );

    if (val.includes('CONECTOR') || val.includes('ZOE')) selectElement.classList.add('badge-sistema-med');
    else if (val.includes('DIAWEB')) selectElement.classList.add('badge-sistema-diaweb');
    else if (val.includes('DIAENLINEA')) selectElement.classList.add('badge-sistema-diaenlinea');
    else if (val === 'DIA') selectElement.classList.add('badge-sistema-dia');
    else if (val === 'SITA') selectElement.classList.add('badge-sistema-sita');
    else if (val === 'VUCEM') selectElement.classList.add('badge-sistema-vucem');
    else if (val === 'COA') selectElement.classList.add('badge-sistema-coa');
    else if (val === 'ADMIN') selectElement.classList.add('badge-sistema-admin');
    else selectElement.classList.add('badge-sistema-dia');
}

/* ==========================================================================
   INTERACCIÓN MODALES Y TICKETS
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
                .catch(err => console.error("Error al obtener contactos:", err));
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
    if (boxArea) {
        if (elem.value === "true") boxArea.classList.remove("d-none");
        else boxArea.classList.add("d-none");
    }
}

function evaluarFechaSolucionNuevo(estatus) {
    const inputFecha = document.getElementById("regFechaSolucion");
    if (!inputFecha) return;

    if (estatus === "Cerrado") {
        inputFecha.removeAttribute("disabled");
        if (!inputFecha.value) inputFecha.value = new Date().toISOString().split("T")[0];
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
        if (!inputFecha.value) inputFecha.value = new Date().toISOString().split("T")[0];
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
    if (inputHora) inputHora.value = convertir12a24(hora);

    document.getElementById("editCliente").value = cliente || "";
    document.getElementById("editReporto").value = reporto || "";
    document.getElementById("editEjecutivo").value = ejecutivo || "";
    
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

    const rol = window.rolUsuario || "";
    const usr = window.usuarioSesion || "";

    const esAdmin = (rol === "Administrador");
    const esMio = (usr === ejecutivo);
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
   REPORTES, EXPORTACIÓN Y GRÁFICAS
   ========================================================================== */

function exportarChartCanvasBlanco(chartInstance) {
    if (!chartInstance || !chartInstance.canvas) return '';
    try {
        const canvasOriginal = chartInstance.canvas;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasOriginal.width;
        tempCanvas.height = canvasOriginal.height;
        const ctx = tempCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.filter = 'invert(1) hue-rotate(180deg)';
        ctx.drawImage(canvasOriginal, 0, 0);
        ctx.filter = 'none';

        return tempCanvas.toDataURL('image/png', 1.0);
    } catch (err) {
        console.error("Error al exportar gráfico:", err);
        return chartInstance.toBase64Image ? chartInstance.toBase64Image() : '';
    }
}

function abrirVistaPreviaImpresion() {
    const txtPuntos = document.getElementById("txtPuntosRelevantes")?.value;
    const printPuntos = document.getElementById("printPuntosRelevantes");
    if (printPuntos) printPuntos.innerText = txtPuntos || "Sin observaciones registradas.";

    const tablaInd = document.getElementById("tablaIndicadores");
    const printInd = document.getElementById("contenedorIndicadoresPrint");
    if (tablaInd && printInd) {
        const clonTabla = tablaInd.cloneNode(true);
        clonTabla.className = "tabla-print-indicadores";
        clonTabla.removeAttribute("id");
        printInd.innerHTML = clonTabla.outerHTML;
    }

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
    setTimeout(() => padreOriginal.appendChild(seccion), 500);
}

function exportarExcelLocal() {
    if (typeof XLSX === "undefined") {
        console.error("La librería XLSX no está disponible.");
        return;
    }
    try {
        const fecha = window.fechaReporteActual || "Reporte";
        const wb = XLSX.utils.book_new();

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
        const colorHeaderExcel = '2563eb';

        let rows = [];
        rows.push([{ v: 'REPORTE DIARIO DE TICKETS - ' + fecha, s: { font: { name: 'Segoe UI', sz: 14, bold: true, color: { rgb: '0F172A' } } } }]);
        rows.push([{ v: 'Departamento de Soporte Técnico', s: { font: { name: 'Segoe UI', sz: 10, italic: true, color: { rgb: '475569' } } } }]);
        rows.push([]);

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
        const txtPuntos = document.getElementById('txtPuntosRelevantes')?.value || 'Sin observaciones registradas.';
        rows.push([{ v: '2. PUNTOS RELEVANTES DEL DÍA', s: { font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } } } }]);
        rows.push([{ v: txtPuntos, s: { font: fontGeneral, alignment: { wrapText: true, vertical: 'top' }, fill: { fgColor: { rgb: 'F1F5F9' } }, border: borderNegro } }]);
        rows.push([]);

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
            { s: { r: 4, c: 20 }, e: { r: 4, c: 21 } }
        ];

        ws['!cols'] = [
            { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 28 }, 
            { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, 
            { wch: 12 }, { wch: 45 }, { wch: 45 }, { wch: 45 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');

        const ws2_rows = [];
        ws2_rows.push([{ v: 'CONCENTRADO DE TICKETS POR SISTEMA - ' + fecha, s: { font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: '0F172A' } } } }]);
        ws2_rows.push([]);

        const headersWs2 = ['Sistema', 'Total Tickets', 'Incidencias', 'Servicios', 'Por Teléfono', 'Por Correo', 'Atendidos (Tiempo y Forma)', 'Cerrados (Atrasados)', 'En Curso (Seguimiento)'];
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
            { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, 
            { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 26 }
        ];

        XLSX.utils.book_append_sheet(wb, wsConcentrado, 'Concentrado por Sistema');

        XLSX.writeFile(wb, `Reporte_Tickets_${fecha}.xlsx`);
    } catch (err) {
        console.error('Error al exportar Excel:', err);
    }
}

/* FILTRO AUTOMATICO DE FECHA DE CONSUTA */

function aplicarFiltrosTabla() {
    const fConsulta = (document.getElementById('fechaReporteConsulta')?.value || '').trim();
    const sConsulta = (document.getElementById('filtroFechaRealizacion')?.value || '').trim();
    const oConsulta = (document.getElementById('filtroEstatus')?.value || '').trim().toLowerCase();

    const hoy = obtenerFechaHoyISO();
    const hayFiltrosActivos = fConsulta !== '' || sConsulta !== '' || oConsulta !== '';

    const filas = document.querySelectorAll('#tablaTareasOriginal tbody tr.fila-tarea');

    filas.forEach(row => {
        const valSolicitud = row.querySelector('.text-fechasolicitud')?.getAttribute('data-fecha') || '';
        const valRealizacion = row.querySelector('.text-fechareal')?.getAttribute('data-fecha') || '';
        const selectEstatus = row.querySelector('.ddl-estatus-tabla');
        const valEstatus = (selectEstatus ? selectEstatus.value : '').trim().toLowerCase();

        if (!hayFiltrosActivos) {
            const esResuelta = valEstatus === 'resuelta';
            if (!esResuelta) {
                row.classList.remove('d-none');
            } else {
                if (valRealizacion === hoy || valRealizacion === '') {
                    row.classList.remove('d-none');
                } else {
                    row.classList.add('d-none');
                }
            }
        } else {
            let cumpleSolicitud = !fSolicitud || valSolicitud === fSolicitud;
            let cumpleRealizacion = !fRealizacion || valRealizacion === fRealizacion;
            let cumpleEstatus = !fEstatus || valEstatus === fEstatus;

            if (cumpleSolicitud && cumpleRealizacion && cumpleEstatus) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        }
    });

/* ==========================================================================
   INICIALIZACIÓN AL CARGAR
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const regSys = document.getElementById('regSistema');
    const editSys = document.getElementById('editSistema');
    if (regSys) aplicarColorSelectSistema(regSys);
    if (editSys) aplicarColorSelectSistema(editSys);

    // Inicialización de Gráficas con variables de window
    const labels = window.labelsSistemas || [];
    const dataTot = window.dataTotales || [];
    const dataTF = window.dataTiempoForma || [];
    const dataCA = window.dataCerradosAtrasados || [];
    const dataEC = window.dataEnCurso || [];

    if (typeof Chart !== "undefined" && labels.length > 0) {
        if (typeof ChartDataLabels !== "undefined") Chart.register(ChartDataLabels);

        window.chartSistemasInstance = null;
        window.chartEstatusInstance = null;

        const obtenerColorSistema = (sistema) => {
            const sysUpper = (sistema || '').toUpperCase().trim();
            if (sysUpper.includes('CONECTOR') || sysUpper.includes('ZOE')) return '#704332';
            if (sysUpper.includes('DIAWEB')) return '#0284c7';
            if (sysUpper.includes('DIAENLINEA')) return '#16a34a';
            if (sysUpper === 'DIA') return '#2563eb';
            if (sysUpper === 'SITA') return '#ea580c';
            if (sysUpper === 'VUCEM') return '#1d4ed8';
            if (sysUpper === 'COA') return '#15803d';
            if (sysUpper === 'ADMIN') return '#0f172a';
            return '#38bdf8';
        };

        const coloresDona = labels.map(sys => obtenerColorSistema(sys));

        const ctx1 = document.getElementById('chartSistemas');
        if (ctx1) {
            window.chartSistemasInstance = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataTot,
                        backgroundColor: coloresDona,
                        borderWidth: 1,
                        borderColor: '#0f172a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#ffffff', font: { size: 10, weight: 'bold' } } },
                        datalabels: {
                            color: '#ffffff',
                            font: { weight: 'bold', size: 11 },
                            formatter: (value, ctx) => {
                                if (!value || value === 0) return '';
                                let sum = 0;
                                let dataArr = ctx.chart.data.datasets[0].data;
                                dataArr.map(data => { sum += data; });
                                return (value * 100 / sum).toFixed(1) + "%";
                            }
                        }
                    }
                }
            });
        }

        const ctx2 = document.getElementById('chartEstatusSistema');
        if (ctx2) {
            window.chartEstatusInstance = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Tiempo y Forma', data: dataTF, backgroundColor: '#22c55e' },
                        { label: 'Cerrado (Atrasados)', data: dataCA, backgroundColor: '#3b82f6' },
                        { label: 'En Curso', data: dataEC, backgroundColor: '#eab308' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        x: { ticks: { color: '#ffffff', font: { size: 9, weight: 'bold' } }, grid: { display: false } },
                        y: { ticks: { color: '#ffffff', precision: 0, font: { weight: 'bold' } }, grid: { color: 'rgba(255,255,255,0.1)' } }
                    },
                    plugins: {
                        legend: { position: 'top', labels: { color: '#ffffff', font: { size: 9, weight: 'bold' } } },
                        datalabels: {
                            anchor: 'end',
                            align: 'start',
                            color: '#ffffff',
                            font: { weight: 'bold', size: 10 },
                            formatter: (value) => value > 0 ? value : ''
                        }
                    }
                }
            });
        }
    }

    const inputFecha = document.getElementById("fechaReporteConsulta");
    const txtPuntos = document.getElementById("txtPuntosRelevantes");
    if (inputFecha && txtPuntos) {
        const fechaActual = inputFecha.value;
        const keyPuntos = `sigesti_puntos_${fechaActual}`;
        txtPuntos.value = localStorage.getItem(keyPuntos) || "";

        txtPuntos.addEventListener("input", function () {
            localStorage.setItem(keyPuntos, this.value);
        });
    }

    const btnGenerar = document.getElementById("btnGenerarReporte");
    const btnExcel = document.getElementById("btnExportarExcel");
    if (btnGenerar) btnGenerar.addEventListener("click", abrirVistaPreviaImpresion);
    if (btnExcel) btnExcel.addEventListener("click", exportarExcelLocal);

    const modalNuevoElem = document.getElementById("modalNuevoTicket");
    if (modalNuevoElem) {
        modalNuevoElem.addEventListener("show.bs.modal", function () {
            const regHoraInput = document.getElementById("regHora");
            if (regHoraInput && !regHoraInput.value) {
                const ahora = new Date();
                regHoraInput.value = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
            }
        });
    }
});

        