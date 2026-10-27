/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - IMPRESIÓN Y EXPORTACIÓN EXCEL ESTILIZADA
   ========================================================================== */

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

    // Gráficas en tema claro para que se lean sobre la hoja blanca
    const imagenes = imagenesGraficasParaImpresion();
    const imgSistemas = document.getElementById("imgChartSistemasPrint");
    const imgEstatus = document.getElementById("imgChartEstatusPrint");
    if (imgSistemas) imgSistemas.src = imagenes.sistemas;
    if (imgEstatus) imgEstatus.src = imagenes.estatus;

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

    imprimirConNombre("ReporteDiarioDeTickets");

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

        // Encabezados copiados de la tabla de la página; el color depende del grupo de cada columna
        const coloresGrupo = {
            'th-tickets': '8EA9DB', 'th-total': '8EA9DB', 'th-tipo': 'DB6E6E', 'th-sistemas-ext': 'A9D18E',
            'th-sistema-int': 'FFD966', 'th-origen': 'FCE4D6', 'th-escalados': 'B4A7D6', 'th-estatus': 'FFF2CC'
        };
        const colorDeEncabezado = th => coloresGrupo[[...th.classList].find(c => coloresGrupo[c])] || 'FFFFFF';
        const encabezado = (texto, color) => ({ v: texto, s: { fill: { fgColor: { rgb: color } }, font: fontBlackBold, alignment: alignCenter, border: borderNegro } });

        const filasEncabezado = document.querySelectorAll('#tablaIndicadores thead tr');
        // Celdas combinadas de los encabezados (fila 5 y 6 del Excel)
        const headerInd1 = [];
        const combinadasIndicadores = [];
        filasEncabezado[0].querySelectorAll('th').forEach(th => {
            const color = colorDeEncabezado(th);
            const columna = headerInd1.length;
            if (th.rowSpan > 1) combinadasIndicadores.push({ s: { r: 4, c: columna }, e: { r: 5, c: columna } });
            if (th.colSpan > 1) combinadasIndicadores.push({ s: { r: 4, c: columna }, e: { r: 4, c: columna + th.colSpan - 1 } });

            headerInd1.push(encabezado(th.textContent.replace(/\s+/g, " ").trim(), color));
            for (let i = 1; i < th.colSpan; i++) headerInd1.push(encabezado('', color));
        });
        rows.push(headerInd1);

        const headerInd2 = [encabezado('', '8EA9DB'), encabezado('', '8EA9DB')];
        filasEncabezado[1].querySelectorAll('th').forEach(th => headerInd2.push(encabezado(th.textContent.replace(/\s+/g, " ").trim(), colorDeEncabezado(th))));
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

        // Mismo orden de columnas que el reporte manual que se usaba en Excel
        const headersDetalle = [
            'Fecha de apertura del Ticket', 'Fecha de Solución', 'Hora del reporte', 'No. de Cliente', 'Nombre del Cliente',
            'Ejecutivo', 'Ticket', 'Estatus', 'Contacto', 'Sistema', 'Entrada', 'Tipo',
            'Descripción', 'Comentarios', 'Solución', 'Escalado', 'Área Escalada'
        ];
        rows.push(headersDetalle.map(h => ({
            v: h,
            s: { fill: { fgColor: { rgb: colorHeaderExcel } }, font: fontHeader, alignment: { ...alignCenter, wrapText: true }, border: borderNegro }
        })));

        // yyyy-MM-dd -> dd/MM/yyyy
        const fechaCorta = (valor) => valor ? valor.split('-').reverse().join('/') : '';

        const tablaDetalleHTML = document.getElementById('tablaDetalleTickets');
        if (tablaDetalleHTML) {
            const trs = tablaDetalleHTML.querySelectorAll('tbody tr[data-id]');
            trs.forEach((tr, rowIdx) => {
                const bgRow = rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
                const d = tr.dataset;
                const estatus = d.estatus || '';

                const celda = (valor, font = fontGeneral, alineacion = alignCenter) =>
                    ({ v: valor || '', s: { fill: { fgColor: { rgb: bgRow } }, font: font, alignment: alineacion, border: borderNegro } });

                rows.push([
                    celda(fechaCorta(d.fechaentrada)),
                    celda(fechaCorta(d.fechasolucion)),
                    celda(d.hora),
                    celda(d.clavecliente),
                    celda(d.cliente, fontBlackBold),
                    celda(d.ejecutivo),
                    celda(d.numticket, fontBlackBold),
                    {
                        v: estatus,
                        s: {
                            fill: { fgColor: { rgb: estatus === 'Cerrado' ? 'DCFCE7' : 'FEF9C3' } },
                            font: { name: 'Segoe UI', sz: 8.5, bold: true, color: { rgb: estatus === 'Cerrado' ? '166534' : '854D0E' } },
                            alignment: alignCenter,
                            border: borderNegro
                        }
                    },
                    celda(d.reporto),
                    celda(normalizarSistema(d.sistema), fontBlackBold),
                    celda(d.origen),
                    celda(d.tipo),
                    celda(d.descripcion, fontGeneral, alignLeft),
                    celda(d.comentarios, fontGeneral, alignLeft),
                    celda(d.solucion, fontGeneral, alignLeft),
                    celda(d.escalado === 'true' ? 'Sí' : 'No'),
                    celda(d.areaescalada || 'Ninguna')
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws['!merges'] = [
            { s: { r: 3, c: 0 }, e: { r: 3, c: headerInd2.length - 1 } },
            ...combinadasIndicadores,
            { s: { r: 9, c: 0 }, e: { r: 9, c: 16 } },
            { s: { r: 10, c: 0 }, e: { r: 10, c: 16 } }
        ];

        ws['!cols'] = [
            { wch: 12 }, // Fecha de apertura
            { wch: 12 }, // Fecha de solución
            { wch: 11 }, // Hora del reporte
            { wch: 10 }, // No. de cliente
            { wch: 26 }, // Nombre del cliente
            { wch: 18 }, // Ejecutivo
            { wch: 8 },  // Ticket
            { wch: 10 }, // Estatus
            { wch: 18 }, // Contacto
            { wch: 14 }, // Sistema
            { wch: 9 },  // Entrada
            { wch: 10 }, // Tipo
            { wch: 45 }, // Descripción
            { wch: 45 }, // Comentarios
            { wch: 45 }, // Solución
            { wch: 9 },  // Escalado
            { wch: 13 }  // Área escalada
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');

        /* HOJA 2: CONCENTRADO POR SISTEMA (MISMAS COLUMNAS QUE LA PANTALLA) */
        const ws2_rows = [];
        ws2_rows.push([{ v: 'CONCENTRADO DE TICKETS POR SISTEMA - ' + fecha, s: { font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: '0F172A' } } } }]);
        ws2_rows.push([]);

        const headersWs2 = [
            'Sistema', 'Total',
            'Incidencias', 'Servicios', 'Otros (Ajuste/Mejora)',
            'Teléfono', 'Correo', 'Interno',
            'Tiempo y forma', 'Atrasados', 'En curso',
            '% en tiempo'
        ];
        ws2_rows.push(headersWs2.map(h => ({ v: h, s: { fill: { fgColor: { rgb: colorHeaderExcel } }, font: fontHeader, alignment: { ...alignCenter, wrapText: true }, border: borderNegro } })));

        // Columnas de estatus pintadas con los colores de la gráfica
        const colorEstatusColumna = {
            8: colorPaleta('--estatus-tiempo'),
            9: colorPaleta('--estatus-atrasado'),
            10: colorPaleta('--estatus-encurso')
        };
        const sinGato = (color) => (color || '#FFFFFF').replace('#', '').toUpperCase();

        const filasConcentrado = document.querySelectorAll('#tablaConcentradoSistema tbody tr.fila-concentrado, #tablaConcentradoSistema tfoot tr');
        filasConcentrado.forEach((tr, rowIdx) => {
            const esTotal = tr.parentElement.tagName === 'TFOOT';
            const bgRow = esTotal ? 'E2E8F0' : (rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC');
            const sistema = tr.dataset.sistema || 'TOTAL';

            const rData = [...tr.querySelectorAll('td')].map((td, colIdx) => {
                const txt = td.innerText.trim();
                const estilo = { fill: { fgColor: { rgb: bgRow } }, font: esTotal ? fontBlackBold : fontGeneral, alignment: alignCenter, border: borderNegro };

                if (colIdx === 0) {
                    if (!esTotal) {
                        estilo.fill = { fgColor: { rgb: sinGato(colorSistema(sistema)) } };
                        estilo.font = { ...fontBlackBold, color: { rgb: sinGato(colorTextoSistema(sistema)) } };
                    }
                    return { v: sistema, s: estilo };
                }

                if (colIdx === 11) {
                    return txt.endsWith('%')
                        ? { v: Number(txt.replace('%', '')) / 100, t: 'n', z: '0%', s: estilo }
                        : { v: '—', s: estilo };
                }

                const valor = (txt === '—' || txt === '') ? 0 : Number(txt);
                if (colorEstatusColumna[colIdx] && valor > 0 && !esTotal) {
                    estilo.fill = { fgColor: { rgb: sinGato(colorEstatusColumna[colIdx]) } };
                    estilo.font = fontBlackBold;
                }
                return { v: valor, t: 'n', s: estilo };
            });

            ws2_rows.push(rData);
        });

        const wsConcentrado = XLSX.utils.aoa_to_sheet(ws2_rows);
        wsConcentrado['!cols'] = [
            { wch: 24 }, { wch: 8 },
            { wch: 12 }, { wch: 11 }, { wch: 14 },
            { wch: 11 }, { wch: 9 }, { wch: 9 },
            { wch: 15 }, { wch: 11 }, { wch: 10 },
            { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, wsConcentrado, 'Concentrado por Sistema');

        const nombreArchivo = nombreReporte("ReporteDiarioDeTickets") + ".xlsx";
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

// Fecha de hoy en formato yyyy-MM-dd según la hora local (no UTC)
function fechaLocalHoy() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function normalizarSistema(sistema) {
    return (sistema || "").trim();
}

function evaluarFechaSolucionNuevo(estatus) {
    const inputFecha = document.getElementById("regFechaSolucion");
    if (!inputFecha) return;

    if (estatus === "Cerrado") {
        inputFecha.removeAttribute("disabled");
        if (!inputFecha.value) {
            inputFecha.value = fechaLocalHoy();
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
            inputFecha.value = fechaLocalHoy();
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

    seleccionarClienteDetalle(cliente, reporto);
    document.getElementById("editEjecutivo").value = ejecutivo || "";

    // Asignación de Sistema y actualización de color
    const selectEditSistema = document.getElementById("editSistema");
    if (selectEditSistema) {
        // Un ticket de un sistema que ya se quitó del catálogo conserva su nombre
        const valorSistema = normalizarSistema(sistema);
        if (valorSistema && ![...selectEditSistema.options].some(o => o.value === valorSistema)) {
            selectEditSistema.add(new Option(valorSistema, valorSistema));
        }
        selectEditSistema.value = valorSistema;
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

    const esAdmin = (typeof rolUsuario !== 'undefined' && rolUsuario === "Admin");
    const ejecutivoMinus = (ejecutivo || "").toLowerCase();
    const esMio = (typeof usuarioSesion !== 'undefined' && ejecutivoMinus === usuarioSesion.toLowerCase())
        || (typeof nombreSesion !== 'undefined' && nombreSesion !== "" && ejecutivoMinus === nombreSesion.toLowerCase());
    const estaAbierto = (estatus !== "Cerrado");

    const campos = [
        "editFechaEntrada", "editHora", "editCliente", "editReporto", "editEjecutivo", "editSistema",
        "editTipo", "editEstatus", "editEscalado", "editAreaEscalada",
        "txtDetalleDescripcion", "txtDetalleComentarios", "txtDetalleSolucion"
    ];

    const btnGuardar = document.getElementById("btnGuardarCambios");

    // Sin el permiso "Editar" del rol el ticket solo se puede consultar
    const editable = permisoEditarTickets && (esAdmin || (estaAbierto && esMio));

    if (editable) {
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

    // Los combos con búsqueda se activan o bloquean junto con el resto de campos
    [comboEditCliente, comboEditReporto].forEach(combo => {
        if (combo) editable ? combo.enable() : combo.disable();
    });

    const modalElem = document.getElementById("modalDetalleTicket");
    if (modalElem) {
        bootstrap.Modal.getOrCreateInstance(modalElem).show();
    }
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - COMBOS CON BÚSQUEDA (CLIENTE Y PERSONA QUE REPORTÓ)
   ========================================================================== */

let comboNuevoCliente = null;
let comboEditCliente = null;
let comboEditReporto = null;

// Convierte un <select> en un combo donde se puede escribir para buscar
function crearComboBuscable(select, opciones) {
    if (!select || typeof TomSelect === 'undefined') return null;

    return new TomSelect(select, Object.assign({
        maxOptions: null,
        allowEmptyOption: false,
        dropdownParent: 'body',
        render: {
            no_results: () => '<div class="no-results">Sin coincidencias</div>'
        }
    }, opciones));
}

function inicializarCombosCliente() {
    comboNuevoCliente = crearComboBuscable(document.getElementById('ddlClientes'), {
        placeholder: 'Escribe para buscar el cliente...'
    });

    const selectEditCliente = document.getElementById('editCliente');
    comboEditCliente = crearComboBuscable(selectEditCliente, {
        placeholder: 'Escribe para buscar el cliente...'
    });

    // Permite escribir un nombre que no esté en la lista de contactos
    comboEditReporto = crearComboBuscable(document.getElementById('editReporto'), {
        placeholder: 'Escribe o elige quien reporta...',
        create: true,
        createOnBlur: true,
        render: {
            option_create: (data, escape) => `<div class="create">+ Usar "<strong>${escape(data.input)}</strong>"</div>`,
            no_results: () => '<div class="no-results">Sin coincidencias</div>'
        }
    });

    // Al cambiar de empresa se quita la persona anterior y se cargan los contactos de la nueva
    if (comboEditCliente) {
        comboEditCliente.on('change', (valor) => cargarContactosDetalle(idClienteDetalle(valor), ''));
    }
}

function idClienteDetalle(nombreCliente) {
    const opcion = [...document.querySelectorAll('#editCliente option')].find(o => o.value === nombreCliente);
    return opcion ? opcion.dataset.id || '' : '';
}

async function cargarContactosDetalle(clienteId, reportoActual) {
    if (!comboEditReporto) return;

    comboEditReporto.clear(true);
    comboEditReporto.clearOptions();

    if (clienteId) {
        try {
            const respuesta = await fetch(`?handler=ContactosPorCliente&clienteId=${clienteId}`);
            const contactos = await respuesta.json();
            contactos.forEach(c => comboEditReporto.addOption({ value: c.nombreContacto, text: c.nombreContacto }));
        } catch (error) {
            console.error('Error al obtener los contactos:', error);
        }
    }

    if (reportoActual) {
        comboEditReporto.addOption({ value: reportoActual, text: reportoActual });
        comboEditReporto.setValue(reportoActual, true);
    }
}

// Coloca el cliente y la persona del ticket sin disparar el borrado de la persona
function seleccionarClienteDetalle(cliente, reporto) {
    if (!comboEditCliente) {
        document.getElementById('editCliente').value = cliente || '';
        document.getElementById('editReporto').value = reporto || '';
        return;
    }

    if (cliente && !comboEditCliente.options[cliente]) {
        comboEditCliente.addOption({ value: cliente, text: cliente });
    }
    comboEditCliente.setValue(cliente || '', true);
    cargarContactosDetalle(idClienteDetalle(cliente), reporto || '');
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - GRÁFICAS, ESTILOS Y FILTROS AUTOMÁTICOS
   ========================================================================== */

// Lee un color de la paleta definida en reporte-tickets.css
function colorPaleta(nombreVariable) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombreVariable).trim();
}

// Clave de la paleta de cada sistema (equivale a ClaseSistema del servidor):
// el id del catálogo, o "otro" si el sistema ya no existe
function claveSistema(sistema) {
    const valor = normalizarSistema(sistema).toUpperCase();
    const encontrado = (window.catalogoSistemas || []).find(s => s.nombre.toUpperCase() === valor);
    return encontrado ? encontrado.id : 'otro';
}

function colorSistema(sistema) {
    return colorPaleta(`--sis-${claveSistema(sistema)}`);
}

function colorTextoSistema(sistema) {
    return colorPaleta(`--sis-${claveSistema(sistema)}-texto`);
}

// Pinta el <select> de Sistema con el color del sistema elegido
function aplicarColorSelectSistema(selectElement) {
    if (!selectElement) return;

    [...selectElement.classList]
        .filter(clase => clase.startsWith('badge-sistema-'))
        .forEach(clase => selectElement.classList.remove(clase));

    selectElement.classList.add(`badge-sistema-${claveSistema(selectElement.value)}`);
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

        inicializarBuscador(formFiltros);
    }

    // 2. Inicializar color del select al cargar
    const regSys = document.getElementById('regSistema');
    const editSys = document.getElementById('editSistema');
    if (regSys) aplicarColorSelectSistema(regSys);
    if (editSys) aplicarColorSelectSistema(editSys);

    inicializarCombosCliente();

    // Puntos Relevantes: se guardan en el navegador por fecha consultada
    const inputFecha = document.getElementById("fechaReporteConsulta");
    const txtPuntos = document.getElementById("txtPuntosRelevantes");
    if (inputFecha && txtPuntos) {
        const keyPuntos = `sigesti_puntos_${inputFecha.value}`;
        txtPuntos.value = localStorage.getItem(keyPuntos) || "";
        txtPuntos.addEventListener("input", function () {
            localStorage.setItem(keyPuntos, this.value);
        });
    }

    const btnGenerar = document.getElementById("btnGenerarReporte");
    if (btnGenerar) btnGenerar.addEventListener("click", abrirVistaPreviaImpresion);

    const btnExcel = document.getElementById("btnExportarExcel");
    if (btnExcel) btnExcel.addEventListener("click", exportarExcelLocal);

    // Hora actual por defecto al abrir el modal de nuevo ticket
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

    // 3. Registrar plugin para datalabels
    if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    inicializarGraficasConcentrado();
    inicializarFiltroPorSistema();
});

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - GRÁFICAS DEL CONCENTRADO
   ========================================================================== */

const temaGraficaOscuro = { texto: '#e2e8f0', rejilla: 'rgba(255, 255, 255, 0.1)', borde: '#111c33' };
const temaGraficaClaro = { texto: '#0f172a', rejilla: 'rgba(15, 23, 42, 0.12)', borde: '#ffffff' };

function porcentajeDe(valor, datos) {
    const total = datos.reduce((suma, n) => suma + n, 0);
    return total === 0 ? 0 : Math.round(valor * 100 / total);
}

// Dibuja el total de tickets en el centro de la dona
// Con la leyenda a la derecha, deja el mismo espacio a la izquierda
// para que la dona quede centrada bajo el título
const pluginCentrarDona = {
    id: 'centrarDona',
    afterLayout(chart) {
        const leyenda = chart.legend;
        if (!leyenda || leyenda.options.position !== 'right') return;

        const area = chart.chartArea;
        area.left += leyenda.width;
        area.width = area.right - area.left;
    }
};

const pluginTotalCentro = {
    id: 'totalCentro',
    afterDraw(chart, args, opciones) {
        const { ctx, chartArea } = chart;
        const total = chart.data.datasets[0].data.reduce((suma, n) => suma + n, 0);
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = opciones.color;
        ctx.font = 'bold 26px "Segoe UI", sans-serif';
        ctx.fillText(total, x, y - 8);
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillText(total === 1 ? 'ticket' : 'tickets', x, y + 16);
        ctx.restore();
    }
};

function cursorDeClic(evento, elementos) {
    evento.native.target.style.cursor = elementos.length ? 'pointer' : 'default';
}

// Leyenda a un lado si hay espacio; abajo en pantallas angostas
function posicionLeyendaDona(ancho) {
    return ancho < 520 ? 'bottom' : 'right';
}

function crearGraficaSistemas(canvas) {
    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labelsSistemas,
            datasets: [{
                data: dataTotales,
                backgroundColor: labelsSistemas.map(colorSistema),
                borderColor: temaGraficaOscuro.borde,
                borderWidth: 2
            }]
        },
        plugins: [pluginTotalCentro, pluginCentrarDona],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: '58%',
            layout: { padding: 6 },
            onResize: (chart, tamano) => {
                chart.options.plugins.legend.position = posicionLeyendaDona(tamano.width);
            },
            onHover: cursorDeClic,
            onClick: (evento, elementos) => {
                if (elementos.length) filtrarDetallePorSistema(labelsSistemas[elementos[0].index]);
            },
            plugins: {
                legend: {
                    position: posicionLeyendaDona(canvas.parentElement.clientWidth),
                    labels: {
                        color: temaGraficaOscuro.texto,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10,
                        padding: 10,
                        font: { size: 11, weight: 'bold' }
                    }
                },
                totalCentro: { color: temaGraficaOscuro.texto },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.parsed} tickets · ${porcentajeDe(ctx.parsed, ctx.dataset.data)}%`
                    }
                },
                datalabels: {
                    color: (ctx) => colorTextoSistema(labelsSistemas[ctx.dataIndex]),
                    font: { weight: 'bold', size: 11 },
                    textAlign: 'center',
                    formatter: (valor, ctx) => {
                        const porcentaje = porcentajeDe(valor, ctx.dataset.data);
                        return porcentaje < 5 ? '' : `${valor}\n${porcentaje}%`;
                    }
                }
            }
        }
    });
}

function crearGraficaEstatus(canvas) {
    const estatus = [
        { nombre: 'Tiempo y forma', datos: dataTiempoForma, variable: '--estatus-tiempo' },
        { nombre: 'Atrasados', datos: dataCerradosAtrasados, variable: '--estatus-atrasado' },
        { nombre: 'En curso', datos: dataEnCurso, variable: '--grafica-encurso' }
    ];

    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labelsSistemas,
            datasets: estatus.map(e => ({
                label: e.nombre,
                data: e.datos,
                backgroundColor: colorPaleta(e.variable),
                borderRadius: 4,
                maxBarThickness: 26,
                datalabels: { color: colorPaleta(e.variable + '-texto') }
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            onHover: cursorDeClic,
            onClick: (evento, elementos) => {
                if (elementos.length) filtrarDetallePorSistema(labelsSistemas[elementos[0].index]);
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: temaGraficaOscuro.texto, precision: 0 },
                    grid: { color: temaGraficaOscuro.rejilla },
                    title: { display: true, text: 'Tickets', color: temaGraficaOscuro.texto }
                },
                y: {
                    stacked: true,
                    ticks: { color: temaGraficaOscuro.texto, font: { size: 11, weight: 'bold' } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: temaGraficaOscuro.texto, boxWidth: 12, font: { size: 11, weight: 'bold' } }
                },
                datalabels: {
                    font: { weight: 'bold', size: 10 },
                    formatter: (valor) => valor > 0 ? valor : ''
                }
            }
        }
    });
}

function inicializarGraficasConcentrado() {
    if (typeof Chart === 'undefined' || typeof labelsSistemas === 'undefined' || labelsSistemas.length === 0) return;

    const canvasSistemas = document.getElementById('chartSistemas');
    if (canvasSistemas) window.chartSistemasInstance = crearGraficaSistemas(canvasSistemas);

    const canvasEstatus = document.getElementById('chartEstatusSistema');
    if (canvasEstatus) window.chartEstatusInstance = crearGraficaEstatus(canvasEstatus);
}

function aplicarTemaGraficas(tema) {
    const dona = window.chartSistemasInstance;
    if (dona) {
        dona.data.datasets[0].borderColor = tema.borde;
        dona.options.plugins.totalCentro.color = tema.texto;
        dona.options.plugins.legend.labels.color = tema.texto;
        dona.update('none');
    }

    const barras = window.chartEstatusInstance;
    if (barras) {
        barras.options.scales.x.ticks.color = tema.texto;
        barras.options.scales.y.ticks.color = tema.texto;
        barras.options.scales.x.grid.color = tema.rejilla;
        barras.options.scales.x.title.color = tema.texto;
        barras.options.plugins.legend.labels.color = tema.texto;
        barras.update('none');
    }
}

// Genera las imágenes de las gráficas en tema claro (texto oscuro) para el PDF
function imagenesGraficasParaImpresion() {
    aplicarTemaGraficas(temaGraficaClaro);

    const imagenes = {
        sistemas: window.chartSistemasInstance ? window.chartSistemasInstance.toBase64Image('image/png', 1) : '',
        estatus: window.chartEstatusInstance ? window.chartEstatusInstance.toBase64Image('image/png', 1) : ''
    };

    aplicarTemaGraficas(temaGraficaOscuro);
    return imagenes;
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - FILTRO DEL DETALLE POR SISTEMA
   ========================================================================== */

window.sistemaFiltrado = '';

function claveFiltroSistema(sistema) {
    return normalizarSistema(sistema).trim().toUpperCase() || 'SIN SISTEMA';
}

// Muestra solo los tickets del sistema elegido; un segundo clic quita el filtro
function filtrarDetallePorSistema(sistema) {
    const tabla = document.getElementById('tablaDetalleTickets');
    if (!tabla) return;

    const clave = sistema ? claveFiltroSistema(sistema) : '';
    window.sistemaFiltrado = (clave === window.sistemaFiltrado) ? '' : clave;
    const filtro = window.sistemaFiltrado;

    let visibles = 0;
    tabla.querySelectorAll('tbody tr[data-id]').forEach(fila => {
        const coincide = !filtro || claveFiltroSistema(fila.dataset.sistema) === filtro;
        fila.classList.toggle('d-none', !coincide);
        if (coincide) visibles++;
    });

    document.querySelectorAll('#tablaConcentradoSistema .fila-concentrado').forEach(fila => {
        fila.classList.toggle('activa', filtro !== '' && fila.dataset.sistema === filtro);
    });

    const chip = document.getElementById('chipFiltroSistema');
    if (chip) {
        chip.textContent = filtro ? `Sistema: ${filtro}  ✕` : '';
        chip.classList.toggle('d-none', !filtro);
    }

    const lblRegistros = document.getElementById('lblRegistrosDetalle');
    if (lblRegistros) lblRegistros.textContent = `Registros: ${visibles}`;
}

function inicializarFiltroPorSistema() {
    document.querySelectorAll('#tablaConcentradoSistema .fila-concentrado').forEach(fila => {
        fila.addEventListener('click', () => filtrarDetallePorSistema(fila.dataset.sistema));
    });

    activarChipFiltroSistema();
}

function activarChipFiltroSistema() {
    const chip = document.getElementById('chipFiltroSistema');
    if (chip) chip.addEventListener('click', () => filtrarDetallePorSistema(window.sistemaFiltrado));
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - BÚSQUEDA EN VIVO
   ========================================================================== */

let temporizadorBusqueda = null;
let peticionBusqueda = null;

// Busca mientras se escribe: pide la página con el término y reemplaza solo el Detalle
function inicializarBuscador(formFiltros) {
    const txtBusqueda = document.getElementById('txtBusqueda');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
    if (!txtBusqueda) return;

    txtBusqueda.addEventListener('input', () => {
        btnLimpiar?.classList.toggle('d-none', txtBusqueda.value === '');
        clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = setTimeout(() => buscarTickets(formFiltros), 400);
    });

    txtBusqueda.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            clearTimeout(temporizadorBusqueda);
            buscarTickets(formFiltros);
        }
    });

    btnLimpiar?.addEventListener('click', () => {
        txtBusqueda.value = '';
        btnLimpiar.classList.add('d-none');
        buscarTickets(formFiltros);
        txtBusqueda.focus();
    });
}

async function buscarTickets(formFiltros) {
    const parametros = new URLSearchParams(new FormData(formFiltros));
    if (!parametros.get('Busqueda')) parametros.delete('Busqueda');

    if (peticionBusqueda) peticionBusqueda.abort();
    peticionBusqueda = new AbortController();

    const cargando = document.getElementById('buscadorCargando');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
    cargando?.classList.remove('d-none');
    btnLimpiar?.classList.add('d-none');

    try {
        const respuesta = await fetch(`?${parametros}`, { signal: peticionBusqueda.signal });
        const html = await respuesta.text();
        const pagina = new DOMParser().parseFromString(html, 'text/html');

        // Detalle en pantalla y su copia para el PDF
        ['panelDetalle', 'tablaDetallePrint'].forEach(id => {
            const nuevo = pagina.getElementById(id);
            const actual = document.getElementById(id);
            if (nuevo && actual) actual.replaceWith(nuevo);
        });

        window.sistemaFiltrado = '';
        document.querySelectorAll('#tablaConcentradoSistema .fila-concentrado.activa').forEach(f => f.classList.remove('activa'));
        activarChipFiltroSistema();

        history.replaceState(null, '', `?${parametros}`);
    } catch (error) {
        if (error.name !== 'AbortError') console.error('Error al buscar tickets:', error);
    } finally {
        cargando?.classList.add('d-none');
        const txtBusqueda = document.getElementById('txtBusqueda');
        btnLimpiar?.classList.toggle('d-none', !txtBusqueda || txtBusqueda.value === '');
    }
}
