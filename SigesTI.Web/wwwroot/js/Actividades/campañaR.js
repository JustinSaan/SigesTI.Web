document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de sincronización de Scrollbar Superior e Inferior
    inicializarDobleScroll();

    // Permite arrastrar el archivo Excel al modal de carga
    inicializarZonaArchivo();

    // Si la página se recargó después de guardar, se recuperan filtros y scroll
    restaurarVista();
});

/* =========================================================
   ALERTAS (SweetAlert2 con estilo oscuro)
   ========================================================= */
function alerta(icono, titulo, texto) {
    return Swal.fire({
        icon: icono,
        title: titulo,
        text: texto,
        confirmButtonText: 'Aceptar',
        customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
        buttonsStyling: false
    });
}

function confirmar(titulo, texto, textoBoton) {
    return Swal.fire({
        icon: 'warning',
        title: titulo,
        text: texto,
        showCancelButton: true,
        confirmButtonText: textoBoton,
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel' },
        buttonsStyling: false
    });
}

/* =========================================================
   UTILIDADES
   ========================================================= */
function abrirModal(idModal) {
    bootstrap.Modal.getOrCreateInstance(document.getElementById(idModal)).show();
}

function obtenerToken() {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    return tokenInput ? tokenInput.value : '';
}

// Evita que texto escrito por usuarios se interprete como HTML
function escaparHtml(texto) {
    return (texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function autoAjustarAltura(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    const minH = 40;
    const scrollH = textarea.scrollHeight;
    textarea.style.height = (scrollH > minH ? scrollH : minH) + "px";
}

/* =========================================================
   SINCRONIZACIÓN DE SCROLLBAR HORIZONTAL SUPERIOR E INFERIOR
   ========================================================= */
function ajustarAnchoScrollSuperior() {
    const topDummy = document.getElementById("topScrollDummy");
    const tabla = document.getElementById("tablaCampana");
    if (topDummy && tabla) {
        topDummy.style.width = tabla.scrollWidth + "px";
    }
}

function inicializarDobleScroll() {
    const topScroll = document.getElementById("topScrollContainer");
    const mainTable = document.getElementById("mainTableContainer");

    if (!topScroll || !mainTable) return;

    ajustarAnchoScrollSuperior();
    window.addEventListener("resize", ajustarAnchoScrollSuperior);

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

/* =========================================================
   CATÁLOGO DE SISTEMAS (SISTEMAS_CATALOGO viene del servidor)
   ========================================================= */
function buscarSistema(sistemaRaw) {
    if (!sistemaRaw) return null;

    let sysUpper = sistemaRaw.trim().toUpperCase();
    if (sysUpper === "DIA") sysUpper = "DIA 8";

    return SISTEMAS_CATALOGO.find(s => s.claves.some(c => sysUpper.includes(c))) || null;
}

function normalizarNombreSistema(sistemaRaw) {
    const sistema = buscarSistema(sistemaRaw);
    return sistema ? sistema.nombre : (sistemaRaw || "").trim();
}

function deducirSistemaPorSerie(serie) {
    if (!serie) return "";
    const s = serie.trim().toUpperCase();

    const sistema = SISTEMAS_CATALOGO.find(x => x.prefijos.some(p => s.startsWith(p)));
    return sistema ? sistema.nombre : "";
}

function aplicarColorSelectSistemaModal(selectElement) {
    if (!selectElement) return;

    // Quitar los colores anteriores
    SISTEMAS_CATALOGO.forEach(s => selectElement.classList.remove(s.claseCss));

    const sistema = buscarSistema(selectElement.value);
    if (sistema) {
        selectElement.classList.add(sistema.claseCss);
    }
}

/* =========================================================
   MODAL DE EDICIÓN: FILAS DE SISTEMA Y SERIE
   ========================================================= */
function agregarFilaSistemaSerie(sistemaSeleccionado = "", serieTexto = "") {
    const contenedor = document.getElementById("contenedorSistemasSeries");
    if (!contenedor) return;

    let sistemaLimpio = normalizarNombreSistema(sistemaSeleccionado);

    if (!sistemaLimpio && serieTexto) {
        const primeraSerie = serieTexto.split(",")[0].split("\n")[0];
        sistemaLimpio = deducirSistemaPorSerie(primeraSerie);
    }

    let opcionesHtml = `<option value="" class="bg-dark text-white">-- Selecciona Sistema --</option>`;
    SISTEMAS_CATALOGO.forEach(sys => {
        const selected = sys.nombre === sistemaLimpio ? "selected" : "";
        opcionesHtml += `<option value="${sys.nombre}" ${selected} class="bg-dark text-white">${sys.nombre}</option>`;
    });

    const seriesFormateadas = serieTexto.split(", ").join("\n");

    const divRow = document.createElement("div");
    divRow.className = "row g-2 align-items-start sistema-serie-row";
    divRow.innerHTML = `
        <div class="col-md-5">
            <select class="form-select campana-filter-select select-sistema-modal input-sistema-item" onchange="aplicarColorSelectSistemaModal(this)">
                ${opcionesHtml}
            </select>
        </div>
        <div class="col-md-6">
            <textarea class="form-control campana-filter-input input-serie-item textarea-auto-expand"
                      rows="1" placeholder="N. de serie (una por línea)..."
                      oninput="autoSeleccionarSistemaPorSerie(this); autoAjustarAltura(this);"></textarea>
        </div>
        <div class="col-md-1 text-center pt-1">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="confirmarEliminarSistemaSerie(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    contenedor.appendChild(divRow);

    // El texto de las series se asigna con .value para que no se interprete como HTML
    const textareaSerie = divRow.querySelector(".input-serie-item");
    textareaSerie.value = seriesFormateadas;
    autoAjustarAltura(textareaSerie);

    aplicarColorSelectSistemaModal(divRow.querySelector(".input-sistema-item"));
}

function confirmarEliminarSistemaSerie(btnElement) {
    const row = btnElement.closest(".sistema-serie-row");
    const selectSys = row.querySelector(".input-sistema-item");
    const nombreSys = selectSys && selectSys.value ? selectSys.value : "este sistema";

    confirmar('¿Eliminar sistema?', `¿Estás seguro de quitar ${nombreSys} de la lista de este cliente?`, 'Sí, eliminar')
        .then((result) => {
            if (result.isConfirmed) {
                row.remove();
            }
        });
}

function autoSeleccionarSistemaPorSerie(inputSerie) {
    const row = inputSerie.closest(".sistema-serie-row");
    if (!row) return;

    const selectSistema = row.querySelector(".input-sistema-item");
    if (selectSistema.value) return;

    for (const linea of inputSerie.value.split("\n")) {
        const sistemaDeducido = deducirSistemaPorSerie(linea);
        if (sistemaDeducido) {
            selectSistema.value = sistemaDeducido;
            aplicarColorSelectSistemaModal(selectSistema);
            break;
        }
    }
}

/* =========================================================
   MODAL DE EDICIÓN: ABRIR Y GUARDAR
   ========================================================= */
function abrirModalEdicionDesdeFila(trElement) {
    const ds = trElement.dataset;

    document.getElementById("editSubtitulo").innerText = `${ds.empresa || ""} · No. ${ds.nocliente || ""}`;
    document.getElementById("editId").value = ds.id || "";
    document.getElementById("editTipoCliente").value = ds.tipo || "Normal";
    document.getElementById("editNoCliente").value = ds.nocliente || "";
    document.getElementById("editEmpresa").value = ds.empresa || "";
    document.getElementById("editNombreCliente").value = ds.nombre || "";
    document.getElementById("editCorreo").value = ds.correo || "";
    document.getElementById("editTelefono").value = ds.telefono || "";
    document.getElementById("editEjecutivo").value = ds.ejecutivo || "";
    document.getElementById("editTicket").value = ds.ticket || "";

    const selectEstatus = document.getElementById("editEstatus");
    selectEstatus.value = normalizarEstatus(ds.estatus);
    pintarSelectEstatus(selectEstatus);

    ["editNombreCliente", "editCorreo", "editTelefono"].forEach(id => {
        autoAjustarAltura(document.getElementById(id));
    });

    const contenedor = document.getElementById("contenedorSistemasSeries");
    contenedor.innerHTML = "";

    const listaSistemas = (ds.sistemas || "").split("\n");
    const listaSeries = (ds.noserie || "").split("\n");

    if (listaSistemas[0] || listaSeries[0]) {
        const maxFilas = Math.max(listaSistemas.length, listaSeries.length);
        for (let i = 0; i < maxFilas; i++) {
            agregarFilaSistemaSerie(listaSistemas[i] || "", listaSeries[i] || "");
        }
    } else {
        agregarFilaSistemaSerie("", "");
    }

    abrirModal("modalEdicion");
}

async function guardarEdicionRegistro() {
    const noCliente = document.getElementById("editNoCliente").value.trim();
    const empresa = document.getElementById("editEmpresa").value.trim();

    if (!noCliente || !empresa) {
        alerta('warning', 'Campos obligatorios', 'El No. Cliente y la Empresa son obligatorios.');
        return;
    }

    // Juntar los sistemas y series de cada fila
    const arraySistemas = [];
    const arraySeries = [];

    document.querySelectorAll(".sistema-serie-row").forEach(row => {
        const valSys = row.querySelector(".input-sistema-item").value.trim();
        const rawSerie = row.querySelector(".input-serie-item").value.trim();

        const seriesLimpias = rawSerie.split("\n").map(s => s.trim()).filter(s => s.length > 0);
        const valSerieFormateado = seriesLimpias.join(", ");

        if (valSys || valSerieFormateado) {
            arraySistemas.push(valSys || deducirSistemaPorSerie(seriesLimpias[0]));
            arraySeries.push(valSerieFormateado);
        }
    });

    const formData = new FormData();
    formData.append("model.Id", document.getElementById("editId").value);
    formData.append("model.TipoCliente", document.getElementById("editTipoCliente").value);
    formData.append("model.NoCliente", noCliente);
    formData.append("model.Empresa", empresa);
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
            headers: { 'RequestVerificationToken': obtenerToken() },
            body: formData
        });

        const res = await response.json();
        if (res.exito) {
            alerta('success', 'Cliente actualizado', 'Los datos fueron modificados correctamente.')
                .then(() => recargarConservandoVista());
        } else {
            alerta('error', 'Error', res.mensaje);
        }
    } catch (err) {
        alerta('error', 'Error', 'Ocurrió un error al intentar actualizar el registro.');
    }
}

/* =========================================================
   CARGA DE ARCHIVO EXCEL
   ========================================================= */
// Muestra el nombre del archivo elegido dentro de la zona punteada
function mostrarNombreArchivo() {
    const archivo = document.getElementById("archivoExcel").files[0];
    const zona = document.getElementById("zonaArchivo");
    const texto = document.getElementById("nombreArchivo");

    if (archivo) {
        texto.innerText = archivo.name;
        zona.classList.add("con-archivo");
    } else {
        texto.innerText = "Haz clic o arrastra aquí tu archivo";
        zona.classList.remove("con-archivo");
    }
}

function inicializarZonaArchivo() {
    const zona = document.getElementById("zonaArchivo");
    const input = document.getElementById("archivoExcel");
    if (!zona || !input) return;

    zona.addEventListener("dragover", (e) => {
        e.preventDefault();
        zona.classList.add("arrastrando");
    });

    zona.addEventListener("dragleave", () => zona.classList.remove("arrastrando"));

    zona.addEventListener("drop", (e) => {
        e.preventDefault();
        zona.classList.remove("arrastrando");
        input.files = e.dataTransfer.files;
        mostrarNombreArchivo();
    });
}

async function procesarEnvioArchivo(confirmarSobrescritura) {
    const archivo = document.getElementById('archivoExcel').files[0];
    const mes = document.getElementById('selectMes').value;
    const anio = document.getElementById('selectAnio').value;

    if (!archivo) {
        alerta('warning', 'Archivo no seleccionado', 'Por favor selecciona un archivo Excel.');
        return;
    }

    const formData = new FormData();
    formData.append("Input.Archivo", archivo);
    formData.append("Input.Mes", mes);
    formData.append("Input.Anio", anio);
    formData.append("Input.ConfirmarSobrescritura", confirmarSobrescritura);

    try {
        const response = await fetch('?handler=CargarExcel', {
            method: 'POST',
            headers: { 'RequestVerificationToken': obtenerToken() },
            body: formData
        });

        const res = await response.json();

        if (res.exito) {
            // Se abre directamente el mes que se acaba de cargar
            alerta('success', 'Carga completada', res.mensaje)
                .then(() => { window.location.href = `?mes=${mes}&anio=${anio}`; });
        } else if (res.requiereConfirmacion) {
            confirmar('¿Sobrescribir Campaña?', res.mensaje, 'Sí, sobrescribir')
                .then((result) => {
                    if (result.isConfirmed) {
                        procesarEnvioArchivo(true);
                    }
                });
        } else {
            alerta('error', 'Error', res.mensaje);
        }
    } catch (error) {
        alerta('error', 'Error de servidor', 'Ocurrió un error al procesar la solicitud.');
    }
}

/* =========================================================
   BITÁCORA DE SEGUIMIENTO
   ========================================================= */

// Valores con los que se abrió la bitácora, para saber si hubo cambios
let bitacoraOriginal = { estatus: "", ticket: "" };

function abrirModalComentarios(trElement) {
    const ds = trElement.dataset;

    document.getElementById('detalleIdModal').value = ds.id;
    document.getElementById('empresaModalTitle').innerText = ds.empresa || "";

    // Se quitan las líneas "Encuesta atendida" del texto y, si está cerrado, la etiqueta se muestra una sola vez arriba
    const comentarios = (ds.comentarios || "")
        .split("\n")
        .filter(linea => linea.trim().toLowerCase() !== "encuesta atendida")
        .join("\n")
        .trim();

    let html = "";
    if (normalizarEstatus(ds.estatus) === "Cerrado") {
        html += "<span class='atendida-tag'><i class='bi bi-check-circle-fill me-1'></i>Encuesta atendida</span>\n";
    }
    html += comentarios ? escaparHtml(comentarios) : "Sin comentarios previos.";

    document.getElementById('historialText').innerHTML = html;

    document.getElementById('nuevoSeguimientoText').value = "";
    document.getElementById('bitacoraTicketInput').value = ds.ticket || "";

    const selectEstatus = document.getElementById('bitacoraEstatusSelect');
    selectEstatus.value = normalizarEstatus(ds.estatus);
    pintarSelectEstatus(selectEstatus);

    bitacoraOriginal = { estatus: selectEstatus.value, ticket: ds.ticket || "" };

    abrirModal('modalComentarios');
}

async function guardarComentarioModal() {
    const id = document.getElementById('detalleIdModal').value;
    const texto = document.getElementById('nuevoSeguimientoText').value.trim();
    const estatus = document.getElementById('bitacoraEstatusSelect').value;
    const ticket = document.getElementById('bitacoraTicketInput').value.trim();

    // Se puede guardar solo un cambio de ticket o estatus, sin comentario
    const huboCambios = texto || estatus !== bitacoraOriginal.estatus || ticket !== bitacoraOriginal.ticket;
    if (!huboCambios) {
        alerta('warning', 'Sin cambios', 'Escribe un comentario o cambia el ticket o estatus antes de guardar.');
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
            headers: { 'RequestVerificationToken': obtenerToken() },
            body: formData
        });

        const res = await response.json();
        if (res.exito) {
            alerta('success', 'Bitácora guardada', 'Se ha registrado la nueva entrada correctamente.')
                .then(() => recargarConservandoVista());
        } else {
            alerta('error', 'Error', res.mensaje);
        }
    } catch (error) {
        alerta('error', 'Error', 'Ocurrió un error al guardar el comentario.');
    }
}

/* =========================================================
   ESTATUS
   ========================================================= */
function normalizarEstatus(estatus) {
    const st = (estatus || "").trim().toLowerCase();
    if (st === "cerrado") return "Cerrado";
    if (st === "en curso") return "En curso";
    return "Pendiente";
}

function pintarSelectEstatus(select) {
    if (!select) return;

    select.classList.remove("st-pendiente", "st-encurso", "st-cerrado");

    if (select.value === "Cerrado") select.classList.add("st-cerrado");
    else if (select.value === "En curso") select.classList.add("st-encurso");
    else select.classList.add("st-pendiente");
}

/* =========================================================
   FILTROS DE LA TABLA
   ========================================================= */
let temporizadorBusqueda = null;

// Espera a que el usuario deje de escribir para filtrar
function filtrarConEspera() {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(filtrarTablaLocal, 250);
}

function filtrarTablaLocal() {
    const texto = document.getElementById("inputBuscador").value.trim().toLowerCase();
    const estatus = document.getElementById("filtroEstatus").value;
    const ejecutivo = document.getElementById("filtroEjecutivo").value;
    const sistema = document.getElementById("filtroSistema").value;

    let visibles = 0;

    document.querySelectorAll("#tablaCampana tbody tr.fila-registro").forEach(fila => {
        const ds = fila.dataset;

        const textoFila = `${ds.empresa} ${ds.nocliente} ${ds.nombre} ${ds.ticket}`.toLowerCase();
        const sistemasFila = (ds.sistemas || "").split("\n").map(normalizarNombreSistema);

        const coincide =
            textoFila.includes(texto) &&
            (!estatus || normalizarEstatus(ds.estatus) === estatus) &&
            (!ejecutivo || ds.ejecutivo === ejecutivo) &&
            (!sistema || sistemasFila.includes(sistema));

        fila.style.display = coincide ? "" : "none";
        if (coincide) visibles++;
    });

    const filaSinResultados = document.getElementById("filaSinResultados");
    if (filaSinResultados) {
        filaSinResultados.style.display = visibles === 0 ? "" : "none";
    }

    // Actualizar el ancho del scrollbar superior por si cambia el layout
    ajustarAnchoScrollSuperior();
}

/* =========================================================
   CONSERVAR FILTROS Y SCROLL AL RECARGAR
   ========================================================= */
const CLAVE_VISTA = "campanaR_vista";

function recargarConservandoVista() {
    const vista = {
        busqueda: document.getElementById("inputBuscador").value,
        estatus: document.getElementById("filtroEstatus").value,
        ejecutivo: document.getElementById("filtroEjecutivo").value,
        sistema: document.getElementById("filtroSistema").value,
        scrollY: window.scrollY,
        scrollX: document.getElementById("mainTableContainer").scrollLeft,
        scrollTabla: document.getElementById("mainTableContainer").scrollTop
    };

    try {
        sessionStorage.setItem(CLAVE_VISTA, JSON.stringify(vista));
    } catch (e) { /* Si el navegador no lo permite, solo se recarga */ }

    location.reload();
}

function restaurarVista() {
    let vista = null;
    try {
        vista = JSON.parse(sessionStorage.getItem(CLAVE_VISTA));
        sessionStorage.removeItem(CLAVE_VISTA);
    } catch (e) { return; }

    if (!vista) return;

    document.getElementById("inputBuscador").value = vista.busqueda || "";
    document.getElementById("filtroEstatus").value = vista.estatus || "";
    document.getElementById("filtroEjecutivo").value = vista.ejecutivo || "";
    document.getElementById("filtroSistema").value = vista.sistema || "";
    filtrarTablaLocal();

    window.scrollTo(0, vista.scrollY || 0);
    document.getElementById("mainTableContainer").scrollLeft = vista.scrollX || 0;
    document.getElementById("mainTableContainer").scrollTop = vista.scrollTabla || 0;
}

/* =========================================================
   LAYOUT DE LA CAMPAÑA (EXISTE_LAYOUT viene del servidor)
   ========================================================= */
function descargarLayout() {
    window.location.href = '?handler=DescargarLayout';
}

async function cargarLayout(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    // Si ya hay un layout se pide confirmación para reemplazarlo
    if (EXISTE_LAYOUT) {
        const respuesta = await confirmar('¿Reemplazar layout?', 'Ya existe un layout cargado. ¿Deseas reemplazarlo por el nuevo archivo?', 'Sí, reemplazar');
        if (!respuesta.isConfirmed) {
            input.value = "";
            return;
        }
    }

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
        const response = await fetch('?handler=CargarLayout', {
            method: 'POST',
            headers: { 'RequestVerificationToken': obtenerToken() },
            body: formData
        });

        const res = await response.json();
        if (res.exito) {
            alerta('success', 'Layout guardado', res.mensaje).then(() => recargarConservandoVista());
        } else {
            alerta('error', 'Error', res.mensaje);
        }
    } catch (error) {
        alerta('error', 'Error de servidor', 'Ocurrió un error al guardar el layout.');
    }

    // Limpiar el input para poder elegir el mismo archivo otra vez
    input.value = "";
}

/* =========================================================
   CAMBIO DE PERIODO Y EXPORTACIÓN
   ========================================================= */
function cambiarPeriodo() {
    const mes = document.getElementById("filtroMes").value;
    const anio = document.getElementById("filtroAnio").value;
    window.location.href = `?mes=${mes}&anio=${anio}`;
}

/**
 * Descarga el reporte en Excel de la campaña del periodo seleccionado
 */
function exportarExcelCampana() {
    const mes = document.getElementById("filtroMes").value;
    const anio = document.getElementById("filtroAnio").value;

    window.location.href = `?handler=ExportarExcel&mes=${mes}&anio=${anio}`;
}
