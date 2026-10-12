document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de sincronización de Scrollbar Superior e Inferior
    inicializarDobleScroll();
});

/* =========================================================
   SINCRONIZACIÓN DE SCROLLBAR HORIZONTAL SUPERIOR E INFERIOR
   ========================================================= */
function inicializarDobleScroll() {
    const topScroll = document.getElementById("topScrollContainer");
    const topDummy = document.getElementById("topScrollDummy");
    const mainTable = document.getElementById("mainTableContainer");
    const tabla = document.getElementById("tablaCampana");

    if (topScroll && topDummy && mainTable && tabla) {
        // Ajusta el ancho del div interno ficticio al ancho real scrollable de la tabla
        function ajustarAnchoScroll() {
            topDummy.style.width = tabla.scrollWidth + "px";
        }

        ajustarAnchoScroll();
        window.addEventListener("resize", ajustarAnchoScroll);

        let isSyncingTop = false;
        let isSyncingMain = false;

        // Desplazamiento desde el scrollbar superior
        topScroll.addEventListener("scroll", () => {
            if (!isSyncingTop) {
                isSyncingMain = true;
                mainTable.scrollLeft = topScroll.scrollLeft;
            }
            isSyncingTop = false;
        });

        // Desplazamiento desde el contenedor inferior de la tabla
        mainTable.addEventListener("scroll", () => {
            if (!isSyncingMain) {
                isSyncingTop = true;
                topScroll.scrollLeft = mainTable.scrollLeft;
            }
            isSyncingMain = false;
        });
    }
}

const SISTEMAS_REGISTRADOS = [
    "DIA 8",
    "SITA",
    "VUCEM",
    "COA",
    "DIAENLINEA PREMIUM",
    "DIAWEB",
    "MÓDULO DE ENLACE"
];

function normalizarNombreSistema(sistemaRaw) {
    if (!sistemaRaw) return "";
    const sysUpper = sistemaRaw.trim().toUpperCase();

    if (sysUpper.includes("DIAENLINEA") || sysUpper.includes("DIA EN LINEA")) return "DIAENLINEA PREMIUM";
    if (sysUpper.includes("DIAWEB") || sysUpper.includes("DIA WEB")) return "DIAWEB";
    if (sysUpper.includes("SITA")) return "SITA";
    if (sysUpper.includes("VUCEM")) return "VUCEM";
    if (sysUpper.includes("ENLACE")) return "MÓDULO DE ENLACE";
    if (sysUpper.includes("COA")) return "COA";
    if (sysUpper.includes("DIA 8") || sysUpper === "DIA") return "DIA 8";

    return sistemaRaw.trim();
}

function deducirSistemaPorSerieJS(serie) {
    if (!serie) return "";
    const s = serie.trim().toUpperCase();

    if (s.startsWith("DNL") || s.startsWith("DNLP")) return "DIAENLINEA PREMIUM";
    if (s.startsWith("COVE")) return "VUCEM";
    if (s.startsWith("M3WIN")) return "SITA";
    if (s.startsWith("DIAW")) return "DIAWEB";
    if (s.startsWith("DIA")) return "DIA 8";
    if (s.startsWith("COA")) return "COA";
    if (s.startsWith("MED")) return "MÓDULO DE ENLACE";

    return "";
}

function autoAjustarAltura(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    const minH = 40;
    const scrollH = textarea.scrollHeight;
    textarea.style.height = (scrollH > minH ? scrollH : minH) + "px";
}

function aplicarColorSelectSistemaModal(selectElement) {
    if (!selectElement) return;

    selectElement.classList.remove("select-sistema-modal", "sys-dia8", "sys-sita", "sys-vucem", "sys-coa", "sys-diaenlinea", "sys-diaweb", "sys-enlace");

    const val = selectElement.value.toUpperCase();
    if (val) {
        selectElement.classList.add("select-sistema-modal");
        if (val.includes("DIA 8")) selectElement.classList.add("sys-dia8");
        else if (val.includes("SITA")) selectElement.classList.add("sys-sita");
        else if (val.includes("VUCEM")) selectElement.classList.add("sys-vucem");
        else if (val.includes("COA")) selectElement.classList.add("sys-coa");
        else if (val.includes("DIAENLINEA")) selectElement.classList.add("sys-diaenlinea");
        else if (val.includes("DIAWEB")) selectElement.classList.add("sys-diaweb");
        else if (val.includes("ENLACE")) selectElement.classList.add("sys-enlace");
    }
}

function agregarFilaSistemaSerie(sistemaSeleccionado = "", serieTexto = "") {
    const contenedor = document.getElementById("contenedorSistemasSeries");
    if (!contenedor) return;

    let sistemaLimpio = normalizarNombreSistema(sistemaSeleccionado);

    if (!sistemaLimpio && serieTexto) {
        const primeraSerie = serieTexto.split(",")[0].split("\n")[0];
        sistemaLimpio = deducirSistemaPorSerieJS(primeraSerie);
    }

    let opcionesHtml = `<option value="" class="bg-dark text-white">-- Selecciona Sistema --</option>`;
    SISTEMAS_REGISTRADOS.forEach(sys => {
        const selected = sys.toUpperCase() === sistemaLimpio.toUpperCase() ? "selected" : "";
        opcionesHtml += `<option value="${sys}" ${selected} class="bg-dark text-white">${sys}</option>`;
    });

    const seriesFormateadas = serieTexto.split(", ").join("\n");

    const divRow = document.createElement("div");
    divRow.className = "row g-2 align-items-start sistema-serie-row";
    divRow.innerHTML = `
        <div class="col-md-5">
            <select class="form-select campana-filter-select input-sistema-item" onchange="aplicarColorSelectSistemaModal(this)">
                ${opcionesHtml}
            </select>
        </div>
        <div class="col-md-6">
            <textarea class="form-control campana-filter-input input-serie-item textarea-auto-expand" 
                      rows="1" placeholder="N. de serie (una por línea)..." 
                      oninput="autoSeleccionarSistemaPorSerie(this); autoAjustarAltura(this);">${seriesFormateadas}</textarea>
        </div>
        <div class="col-md-1 text-center pt-1">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="confirmarEliminarSistemaSerie(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    contenedor.appendChild(divRow);

    const selectCreado = divRow.querySelector(".input-sistema-item");
    aplicarColorSelectSistemaModal(selectCreado);

    const textareaSerie = divRow.querySelector(".input-serie-item");
    autoAjustarAltura(textareaSerie);
}

/* Alerta SweetAlert2 al pulsar la papelera */
function confirmarEliminarSistemaSerie(btnElement) {
    const row = btnElement.closest(".sistema-serie-row");
    const selectSys = row.querySelector(".input-sistema-item");
    const nombreSys = selectSys && selectSys.value ? selectSys.value : "este sistema";

    Swal.fire({
        icon: 'warning',
        title: '¿Eliminar sistema?',
        text: `¿Estás seguro de quitar ${nombreSys} de la lista de este cliente?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel' },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            row.remove();
        }
    });
}

function autoSeleccionarSistemaPorSerie(inputSerie) {
    const row = inputSerie.closest(".sistema-serie-row");
    if (!row) return;

    const selectSistema = row.querySelector(".input-sistema-item");
    if (!selectSistema.value) {
        const lineas = inputSerie.value.split("\n");
        for (let l of lineas) {
            const sistemaDeducido = deducirSistemaPorSerieJS(l);
            if (sistemaDeducido) {
                selectSistema.value = sistemaDeducido;
                aplicarColorSelectSistemaModal(selectSistema);
                break;
            }
        }
    }
}

function abrirModalEdicionDesdeFila(trElement) {
    const ds = trElement.dataset;

    document.getElementById("editId").value = ds.id || "";
    document.getElementById("editTipoCliente").value = ds.tipo || "Normal";
    document.getElementById("editNoCliente").value = ds.nocliente || "";
    document.getElementById("editEmpresa").value = ds.empresa || "";
    document.getElementById("editNombreCliente").value = ds.nombre || "";
    document.getElementById("editCorreo").value = ds.correo || "";
    document.getElementById("editTelefono").value = ds.telefono || "";
    document.getElementById("editEjecutivo").value = ds.ejecutivo || "";
    document.getElementById("editTicket").value = ds.ticket || "";
    document.getElementById("editEstatus").value = ds.estatus || "Pendiente";

    actualizarColorEstatusModal(ds.estatus || "Pendiente");

    ["editNombreCliente", "editCorreo", "editTelefono"].forEach(id => {
        const el = document.getElementById(id);
        if (el) autoAjustarAltura(el);
    });

    const contenedor = document.getElementById("contenedorSistemasSeries");
    contenedor.innerHTML = "";

    const listaSistemas = (ds.sistemas || "").split("\n");
    const listaSeries = (ds.noserie || "").split("\n");

    const maxFilas = Math.max(listaSistemas.length, listaSeries.length);
    if (maxFilas > 0 && (listaSistemas[0] || listaSeries[0])) {
        for (let i = 0; i < maxFilas; i++) {
            agregarFilaSistemaSerie(listaSistemas[i] || "", listaSeries[i] || "");
        }
    } else {
        agregarFilaSistemaSerie("", "");
    }

    const modalElement = document.getElementById("modalEdicion");
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

async function guardarEdicionRegistro() {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

    const sistemasInputs = document.querySelectorAll(".input-sistema-item");
    const seriesInputs = document.querySelectorAll(".input-serie-item");

    let arraySistemas = [];
    let arraySeries = [];

    sistemasInputs.forEach((sel, idx) => {
        const valSys = sel.value.trim();
        const rawSerie = seriesInputs[idx] ? seriesInputs[idx].value.trim() : "";
        
        const arraySeriesLimpio = rawSerie.split("\n").map(s => s.trim()).filter(s => s.length > 0);
        const valSerieFormateado = arraySeriesLimpio.join(", ");

        if (valSys || valSerieFormateado) {
            arraySistemas.push(valSys || deducirSistemaPorSerieJS(arraySeriesLimpio[0]));
            arraySeries.push(valSerieFormateado);
        }
    });

    const formData = new FormData();
    formData.append("model.Id", document.getElementById("editId").value);
    formData.append("model.TipoCliente", document.getElementById("editTipoCliente").value);
    formData.append("model.NoCliente", document.getElementById("editNoCliente").value);
    formData.append("model.Empresa", document.getElementById("editEmpresa").value);
    formData.append("model.NombreCliente", document.getElementById("editNombreCliente").value);
    formData.append("model.CorreoElectronico", document.getElementById("editCorreo").value);
    formData.append("model.Telefono", document.getElementById("editTelefono").value);
    formData.append("model.Sistemas", arraySistemas.join("\n"));
    formData.append("model.NoSerie", arraySeries.join("\n"));
    formData.append("model.EjecutivoAsignado", document.getElementById("editEjecutivo").value);
    formData.append("model.Ticket", document.getElementById("editTicket").value);
    formData.append("model.Estatus", document.getElementById("editEstatus").value);

    try {
        const response = await fetch('?handler=EditarRegistro', {
            method: 'POST',
            headers: { 'RequestVerificationToken': tokenInput ? tokenInput.value : '' },
            body: formData
        });

        const res = await response.json();
        if (res.exito) {
            Swal.fire({
                icon: 'success',
                title: 'Cliente actualizado',
                text: 'Los datos fueron modificados correctamente.',
                confirmButtonText: 'Aceptar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
                buttonsStyling: false
            }).then(() => { location.reload(); });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.mensaje,
                confirmButtonText: 'Aceptar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al intentar actualizar el registro.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

async function procesarEnvioArchivo(confirmarSobrescritura) {
    const fileInput = document.getElementById('archivoExcel').files[0];
    const mes = document.getElementById('selectMes').value;
    const anio = document.getElementById('selectAnio').value;
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

    if (!fileInput) {
        Swal.fire({
            icon: 'warning',
            title: 'Archivo no seleccionado',
            text: 'Por favor selecciona un archivo Excel.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
        return;
    }

    const formData = new FormData();
    formData.append("Input.Archivo", fileInput);
    formData.append("Input.Mes", mes);
    formData.append("Input.Anio", anio);
    formData.append("Input.ConfirmarSobrescritura", confirmarSobrescritura);

    try {
        const response = await fetch('?handler=CargarExcel', {
            method: 'POST',
            headers: { 'RequestVerificationToken': tokenInput ? tokenInput.value : '' },
            body: formData
        });

        const res = await response.json();

        if (res.exito) {
            Swal.fire({
                icon: 'success',
                title: 'Carga completada',
                text: res.mensaje,
                confirmButtonText: 'Aceptar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
                buttonsStyling: false
            }).then(() => { location.reload(); });
        } else if (res.requiereConfirmacion) {
            Swal.fire({
                icon: 'warning',
                title: '¿Sobrescribir Campaña?',
                text: res.mensaje,
                showCancelButton: true,
                confirmButtonText: 'Sí, sobrescribir',
                cancelButtonText: 'Cancelar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel' },
                buttonsStyling: false
            }).then((result) => {
                if (result.isConfirmed) {
                    procesarEnvioArchivo(true);
                }
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.mensaje,
                confirmButtonText: 'Aceptar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
                buttonsStyling: false
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de servidor',
            text: 'Ocurrió un error al procesar la solicitud.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

/**
 * Abre el Modal de Bitácora mediante doble clic en la celda de comentarios
 */
function abrirModalComentarios(id, empresa, historial, estatusActual, ticketActual) {
    document.getElementById('detalleIdModal').value = id;
    document.getElementById('empresaModalTitle').innerText = empresa;
    
    const historialBox = document.getElementById('historialText');

    if (historial && historial.includes("Encuesta atendida")) {
        let textoFormateado = historial.replace(/Encuesta atendida/g, "<span class='atendida-tag'><i class='bi bi-check-circle-fill me-1'></i>Encuesta atendida</span>");
        historialBox.innerHTML = textoFormateado;
    } else {
        historialBox.innerText = historial || "Sin comentarios previos.";
    }

    document.getElementById('nuevoSeguimientoText').value = "";
    
    // Asignar el valor del Ticket al input del modal
    const inputTicket = document.getElementById('bitacoraTicketInput');
    if (inputTicket) {
        inputTicket.value = ticketActual || "";
    }

    // Asignar el valor del Estatus
    const selectEstatus = document.getElementById('bitacoraEstatusSelect');
    if (selectEstatus) {
        selectEstatus.value = estatusActual || "Pendiente";
        actualizarColorEstatusModal(selectEstatus.value);
    }

    const modal = new bootstrap.Modal(document.getElementById('modalComentarios'));
    modal.show();
}

/**
 * Guarda el comentario, el número de ticket y el estatus actual
 */
async function guardarComentarioModal() {
    const id = document.getElementById('detalleIdModal').value;
    const texto = document.getElementById('nuevoSeguimientoText').value;
    const estatus = document.getElementById('bitacoraEstatusSelect').value;
    const ticket = document.getElementById('bitacoraTicketInput').value;
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

    if (!texto.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'Campo vacío',
            text: 'Ingresa un comentario antes de guardar.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
        return;
    }

    const formData = new FormData();
    formData.append("id", id);
    formData.append("nuevoSeguimiento", texto);
    formData.append("nuevoEstatus", estatus);
    formData.append("nuevoTicket", ticket);

    try {
        const response = await fetch('?handler=GuardarComentario', {
            method: 'POST',
            headers: { 'RequestVerificationToken': tokenInput ? tokenInput.value : '' },
            body: formData
        });

        const res = await response.json();
        if (res.exito) {
            Swal.fire({
                icon: 'success',
                title: 'Bitácora guardada',
                text: 'Se ha registrado la nueva entrada correctamente.',
                confirmButtonText: 'Aceptar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
                buttonsStyling: false
            }).then(() => { location.reload(); });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.mensaje,
                confirmButtonText: 'Aceptar',
                customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
                buttonsStyling: false
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al guardar el comentario.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

function filtrarTablaLocal() {
    const input = document.getElementById("inputBuscador").value.toLowerCase();
    const filas = document.querySelectorAll("#tablaCampana tbody tr");

    filas.forEach(fila => {
        const textoFila = fila.innerText.toLowerCase();
        fila.style.display = textoFila.includes(input) ? "" : "none";
    });

    // Actualizar el ancho del scrollbar superior falso por si cambia el layout
    const topDummy = document.getElementById("topScrollDummy");
    const tabla = document.getElementById("tablaCampana");
    if (topDummy && tabla) {
        topDummy.style.width = tabla.scrollWidth + "px";
    }
}

function cambiarPeriodo() {
    const mes = document.getElementById("filtroMes").value;
    const anio = document.getElementById("filtroAnio").value;
    window.location.href = `?mes=${mes}&anio=${anio}`;
}

function actualizarColorEstatusModal(estatus) {
    const select = document.getElementById("editEstatus");
    if (select) {
        select.classList.remove("st-pendiente", "st-encurso", "st-cerrado");
        const st = (estatus || "").trim().toLowerCase();
        if (st === "cerrado") select.classList.add("st-cerrado");
        else if (st === "en curso") select.classList.add("st-encurso");
        else select.classList.add("st-pendiente");
    }

    const selectBitacora = document.getElementById("bitacoraEstatusSelect");
    if (selectBitacora) {
        selectBitacora.classList.remove("st-pendiente", "st-encurso", "st-cerrado");
        const stB = (estatus || "").trim().toLowerCase();
        if (stB === "cerrado") selectBitacora.classList.add("st-cerrado");
        else if (stB === "en curso") selectBitacora.classList.add("st-encurso");
        else selectBitacora.classList.add("st-pendiente");
    }
}

/**
 * Descarga el reporte en Excel de la campaña del periodo seleccionado
 */
function exportarExcelCampana() {
    const mes = document.getElementById("filtroMes").value;
    const anio = document.getElementById("filtroAnio").value;

    window.location.href = `?handler=ExportarExcel&mes=${mes}&anio=${anio}`;
}