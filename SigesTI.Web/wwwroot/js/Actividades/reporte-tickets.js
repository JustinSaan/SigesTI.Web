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
        rows.push([{ v: 'Área de Soporte Técnico', s: { font: { name: 'Segoe UI', sz: 10, italic: true, color: { rgb: '475569' } } } }]);
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
   MÓDULO REPORTE DE TICKETS - GRÁFICAS, ESTILOS Y FILTROS AUTOMÁTICOS
   ========================================================================== */

// Función para cambiar dinámicamente la clase/color del <select> de Sistema
function aplicarColorSelectSistema(selectElement) {
    if (!selectElement) return;
    const val = (selectElement.value || '').toUpperCase().trim();

    // Remover todas las clases de sistemas previas
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
        selectElement.classList.add('badge-sistema-dia');
    }
}

// Variables globales para las instancias
window.chartSistemasInstance = null;
window.chartEstatusInstance = null;

document.addEventListener('DOMContentLoaded', function () {
    // 1. FILTROS AUTOMÁTICOS: Enviar el formulario en cuanto cambie algún filtro
    const formFiltros = document.getElementById('formFiltros');
    if (formFiltros) {
        const inputsFiltro = formFiltros.querySelectorAll('select, input[type="date"]');
        inputsFiltro.forEach(input => {
            input.addEventListener('change', () => {
                formFiltros.submit();
            });
        });
    }

    // 2. Inicializar color del select al cargar
    const regSys = document.getElementById('regSistema');
    const editSys = document.getElementById('editSistema');
    if (regSys) aplicarColorSelectSistema(regSys);
    if (editSys) aplicarColorSelectSistema(editSys);

    // 3. Registrar plugin para datalabels
    if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    // Asegurarse de que las variables de Razor existan en window (Vienen del cshtml)
    if (typeof labelsSistemas === 'undefined') return;

    const obtenerColorSistema = (sistema) => {
        const sysUpper = (sistema || '').toUpperCase().trim();

        if (sysUpper.includes('CONECTOR') || sysUpper.includes('ZOE')) return '#704332';
        if (sysUpper.includes('DIAWEB')) return '#0284c7';
        if (sysUpper.includes('DIAENLINEA')) return '#16a34a';
        if (sysUpper === 'DIA') return '#25B3EB';
        if (sysUpper === 'SITA') return '#ea580c';
        if (sysUpper === 'VUCEM') return '#1d4ed8';
        if (sysUpper === 'COA') return '#15803d';
        if (sysUpper === 'ADMIN') return '#0f172a';

        return '#38bdf8';
    };

    const coloresDona = labelsSistemas.map(sys => obtenerColorSistema(sys));

    // Gráfica de Dona
    const ctx1 = document.getElementById('chartSistemas');
    if (ctx1 && labelsSistemas.length > 0) {
        window.chartSistemasInstance = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: labelsSistemas,
                datasets: [{
                    data: dataTotales,
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
                    title: { display: false },
                    legend: {
                        position: 'right',
                        labels: { color: '#ffffff', font: { size: 10, weight: 'bold' } }
                    },
                    datalabels: {
                        color: '#ffffff',
                        font: { weight: 'bold', size: 11 },
                        formatter: (value, ctx) => {
                            if (!value || value === 0) return '';
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        }
                    }
                }
            }
        });
    }

    // Gráfica de Barras
    const ctx2 = document.getElementById('chartEstatusSistema');
    if (ctx2 && labelsSistemas.length > 0) {
        window.chartEstatusInstance = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: labelsSistemas,
                datasets: [
                    {
                        label: 'Tiempo y Forma',
                        data: dataTiempoForma,
                        backgroundColor: '#22c55e'
                    },
                    {
                        label: 'Cerrado (Atrasados)',
                        data: dataCerradosAtrasados,
                        backgroundColor: '#3b82f6'
                    },
                    {
                        label: 'En Curso',
                        data: dataEnCurso,
                        backgroundColor: '#eab308'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        ticks: { color: '#ffffff', font: { size: 9, weight: 'bold' } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#ffffff', precision: 0, font: { weight: 'bold' } },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                plugins: {
                    title: { display: false },
                    legend: {
                        position: 'top',
                        labels: { color: '#ffffff', font: { size: 9, weight: 'bold' } }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'start',
                        color: '#ffffff',
                        font: { weight: 'bold', size: 10 },
                        formatter: (value) => {
                            return value > 0 ? value : '';
                        }
                    }
                }
            }
        });
    }
});