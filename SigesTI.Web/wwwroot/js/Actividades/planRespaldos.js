"use strict";

// ==========================================
// 1. OBTENER TOKEN DE VERIFICACIÓN
// ==========================================
function getAntiForgeryToken() {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    return tokenInput ? tokenInput.value : '';
}

// ==========================================
// 2. INICIALIZACIÓN DE TOOLTIPS Y EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    inicializarDragAndDrop();
    aplicarColoresAreas();

    document.getElementById('selectEstadoEquipoNuevo')?.addEventListener('change', alternarFechasNuevo);
    document.getElementById('selectEstadoEquipoEditar')?.addEventListener('change', alternarFechasEditar);

    // Inicializar tooltips de Bootstrap para los mensajes flotantes de respaldo
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// ==========================================
// 3. CARGA DINÁMICA DE EJECUTIVOS POR ÁREA
// ==========================================
// ===== MODIFICADO (Plan de Respaldos): opción "Otro (escribir nombre)" para ejecutivos que no están en Personal =====
// tipo = 'Nuevo' o 'Editar' (sufijo de los ids del modal)
async function cargarEjecutivos(tipo, personalIdSeleccionado = null, ejecutivoManual = '') {
    const areaSelect = document.getElementById(`selectArea${tipo}`);
    const selectEjecutivo = document.getElementById(`selectEjecutivo${tipo}`);
    const txtManual = document.getElementById(`txtEjecutivoManual${tipo}`);

    if (!areaSelect || !selectEjecutivo) return;

    const area = areaSelect.value;
    selectEjecutivo.innerHTML = '<option value="">Sin Ejecutivo Asignado</option>';

    // La opción "manual" siempre está disponible, aunque no haya área seleccionada
    const opcionManual = document.createElement('option');
    opcionManual.value = 'manual';
    opcionManual.textContent = 'Otro (escribir nombre)...';
    selectEjecutivo.appendChild(opcionManual);
    selectEjecutivo.disabled = false;

    // Si el equipo ya tenía un nombre escrito a mano, se deja seleccionado "Otro" con ese nombre
    if (txtManual) txtManual.value = ejecutivoManual || '';
    if (!personalIdSeleccionado && ejecutivoManual) selectEjecutivo.value = 'manual';
    alternarEjecutivoManual(tipo);

    if (!area) return;

    try {
        const response = await fetch(`?handler=EjecutivosPorArea&area=${encodeURIComponent(area)}`);
        if (!response.ok) throw new Error('Error al consultar ejecutivos');

        const ejecutivos = await response.json();

        ejecutivos.forEach(e => {
            const option = document.createElement('option');
            option.value = e.id;
            option.textContent = e.nombre;
            if (personalIdSeleccionado && e.id == personalIdSeleccionado) {
                option.selected = true;
            }
            selectEjecutivo.insertBefore(option, opcionManual); // la opción "Otro" queda al final
        });
    } catch (error) {
        console.error('Error al cargar ejecutivos:', error);
    }
}

// Muestra la caja de texto del nombre solo cuando se elige "Otro (escribir nombre)"
function alternarEjecutivoManual(tipo) {
    const selectEjecutivo = document.getElementById(`selectEjecutivo${tipo}`);
    const txtManual = document.getElementById(`txtEjecutivoManual${tipo}`);
    if (!selectEjecutivo || !txtManual) return;

    if (selectEjecutivo.value === 'manual') {
        txtManual.classList.remove('d-none');
        txtManual.focus();
    } else {
        txtManual.classList.add('d-none');
    }
}

// Regresa lo que se manda al servidor: el id de Personal o el nombre escrito a mano (nunca los dos)
function obtenerEjecutivoSeleccionado(tipo) {
    const valor = document.getElementById(`selectEjecutivo${tipo}`).value;
    const nombreManual = document.getElementById(`txtEjecutivoManual${tipo}`).value.trim();

    if (valor === 'manual') {
        return { personalId: null, ejecutivoManual: nombreManual || null };
    }
    return { personalId: valor ? parseInt(valor) : null, ejecutivoManual: null };
}
// ===== FIN MODIFICADO =====

// ==========================================
// 4. ALTERNAR VISIBILIDAD DE FECHAS
// ==========================================
function alternarFechasNuevo() {
    const estadoSelect = document.getElementById('selectEstadoEquipoNuevo');
    const contFechas = document.getElementById('contenedorSeccionFechasNuevo');
    if (!estadoSelect || !contFechas) return;

    const esActivo = estadoSelect.value === 'true';
    const inputsFechas = document.querySelectorAll('.fecha-input-nuevo');

    if (esActivo) {
        contFechas.classList.remove('d-none');
        inputsFechas.forEach(inp => inp.required = true);
    } else {
        contFechas.classList.add('d-none');
        inputsFechas.forEach(inp => inp.required = false);
    }
}

function alternarFechasEditar() {
    const estadoSelect = document.getElementById('selectEstadoEquipoEditar');
    const panelFechas = document.getElementById('panelGestionFechasEditar');
    if (!estadoSelect || !panelFechas) return;

    const esActivo = estadoSelect.value === 'true';
    if (esActivo) {
        panelFechas.classList.remove('d-none');
    } else {
        panelFechas.classList.add('d-none');
    }
}

// ==========================================
// 5. ABRIR MODAL DESDE FILA
// ==========================================
function abrirModalEditarDesdeFila(elemento) {
    const tr = elemento.closest('tr');
    if (!tr || !tr.dataset.id) return;

    const id = tr.dataset.id;
    const area = tr.dataset.area;
    const personalId = tr.dataset.personalid;
    const ejecutivoManual = tr.dataset.ejecutivomanual || '';
    const hostname = tr.dataset.hostname;
    const ip = tr.dataset.ip;
    const activo = tr.dataset.activo === 'true';
    const programaciones = JSON.parse(tr.dataset.programaciones || '[]');

    document.getElementById('txtEquipoIdEditar').value = id;
    document.getElementById('selectAreaEditar').value = (area === 'Sin Área / General' || area === 'N/A') ? '' : area;
    document.getElementById('txtHostnameEditar').value = hostname;
    document.getElementById('txtIpEditar').value = ip;
    document.getElementById('selectEstadoEquipoEditar').value = activo ? 'true' : 'false';

    document.getElementById('lblEquipoEditar').textContent = `${hostname} · ${ip}`;

    cargarEjecutivos('Editar', personalId, ejecutivoManual);

    const selectFechas = document.getElementById('selectFechaProgramacion');
    selectFechas.innerHTML = '<option value="">Seleccione una fecha...</option>';

    programaciones.forEach(p => {
        const option = document.createElement('option');
        option.value = p.Id;
        const rawDate = p.FechaProgramada.split('T')[0];
        const fechaFormateada = new Date(p.FechaProgramada).toLocaleDateString('es-MX', { timeZone: 'UTC' });
        option.textContent = `${fechaFormateada} - [${p.Estado}]`;
        option.dataset.estado = p.Estado;
        option.dataset.rawdate = rawDate;
        option.dataset.obs = p.Observaciones || '';
        selectFechas.appendChild(option);
    });

    document.getElementById('selectNuevoEstatus').value = 'Pendiente';
    document.getElementById('txtObservaciones').value = '';
    document.getElementById('divObservaciones').classList.add('d-none');
    document.getElementById('divEditarFechaDirecta').classList.add('d-none');

    alternarFechasEditar();

    const modal = new bootstrap.Modal(document.getElementById('modalEditarRespaldo'));
    modal.show();
}

// ==========================================
// 6. GESTIÓN DE FECHAS Y ESTATUS CON SWEETALERT
// ==========================================
function cargarFechaSeleccionadaParaEditar() {
    const select = document.getElementById('selectFechaProgramacion');
    const divFecha = document.getElementById('divEditarFechaDirecta');
    const inputFecha = document.getElementById('txtModificarFechaInput');

    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.value) {
        divFecha.classList.remove('d-none');
        inputFecha.value = selectedOption.dataset.rawdate || '';
    } else {
        divFecha.classList.add('d-none');
    }

    evaluarEstadoProgramacion();
}

async function guardarCambioFechaIndividual() {
    const programacionId = document.getElementById('selectFechaProgramacion').value;
    const nuevaFecha = document.getElementById('txtModificarFechaInput').value;

    if (!programacionId || !nuevaFecha) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione una fecha válida.', background: '#0b132b', color: '#fff' });
        return;
    }

    const payload = { programacionId: parseInt(programacionId), nuevaFecha: nuevaFecha };

    try {
        const response = await fetch('?handler=EditarFechaProgramada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Fecha Actualizada!',
                text: 'La fecha programada se ha actualizado correctamente.',
                background: '#0b132b',
                color: '#fff',
                confirmButtonColor: '#0284c7'
            }).then(() => location.reload());
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la fecha.', background: '#0b132b', color: '#fff' });
        }
    } catch (e) {
        console.error(e);
    }
}

function agregarCampoFechaNuevo() {
    const contenedor = document.getElementById('contenedorFechasNuevo');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="date" class="form-control fecha-input-nuevo" required />
        <button type="button" class="btn mer-btn-quitar-fecha" title="Quitar fecha" onclick="this.parentElement.remove()"><i class="bi bi-trash3"></i></button>
    `;
    contenedor.appendChild(div);
}

async function guardarNuevoEquipo() {
    const area = document.getElementById('selectAreaNuevo').value;
    const ejecutivo = obtenerEjecutivoSeleccionado('Nuevo');
    const hostname = document.getElementById('txtHostnameNuevo').value.trim();
    const ip = document.getElementById('txtIpNuevo').value.trim();
    const activo = document.getElementById('selectEstadoEquipoNuevo').value === 'true';

    const fechaElements = document.querySelectorAll('.fecha-input-nuevo');
    const fechas = Array.from(fechaElements).map(input => input.value).filter(val => val !== '');

    if (!hostname || !ip) {
        Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Por favor ingrese Hostname e IP.', background: '#0b132b', color: '#fff' });
        return;
    }

    if (activo && fechas.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Fechas requeridas', text: 'Debe agregar al menos una fecha programada para equipos activos.', background: '#0b132b', color: '#fff' });
        return;
    }

    const payload = {
        area: area || null,
        personalId: ejecutivo.personalId,
        ejecutivoManual: ejecutivo.ejecutivoManual,
        hostname: hostname,
        direccionIP: ip,
        activo: activo,
        fechas: activo ? fechas : []
    };

    try {
        const response = await fetch('?handler=GuardarEquipo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Equipo Agregado!',
                text: 'El equipo y sus fechas de respaldo se han registrado correctamente.',
                background: '#0b132b',
                color: '#fff',
                confirmButtonColor: '#0284c7'
            }).then(() => location.reload());
        }
    } catch (error) {
        console.error(error);
    }
}

function evaluarEstadoProgramacion() {
    const estatus = document.getElementById('selectNuevoEstatus').value;
    const divObs = document.getElementById('divObservaciones');
    if (!divObs) return;

    if (estatus === 'En Curso') {
        divObs.classList.remove('d-none');
    } else {
        divObs.classList.add('d-none');
    }
}

async function guardarEstatusRespaldo() {
    const programacionId = document.getElementById('selectFechaProgramacion').value;
    const estado = document.getElementById('selectNuevoEstatus').value;
    const observaciones = document.getElementById('txtObservaciones').value.trim();

    if (!programacionId) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione una fecha de respaldo.', background: '#0b132b', color: '#fff' });
        return;
    }

    if (estado === 'En Curso' && !observaciones) {
        Swal.fire({ icon: 'warning', title: 'Observación requerida', text: 'Ingrese las observaciones si el respaldo está "En Curso".', background: '#0b132b', color: '#fff' });
        return;
    }

    const payload = { programacionId: parseInt(programacionId), estado: estado, observaciones: observaciones };

    try {
        const response = await fetch('?handler=CambiarEstadoRespaldo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const tituloSwal = estado === 'Realizado' ? '¡Respaldo Completado!' : '¡Estatus Actualizado!';
            const textoSwal = estado === 'Realizado' ? 'El respaldo se ha marcado como completado correctamente.' : 'El estatus del respaldo se actualizó con éxito.';

            Swal.fire({
                icon: 'success',
                title: tituloSwal,
                text: textoSwal,
                background: '#0b132b',
                color: '#fff',
                confirmButtonColor: '#0284c7'
            }).then(() => location.reload());
        }
    } catch (e) {
        console.error(e);
    }
}

async function guardarEdicionEquipo() {
    const equipoId = document.getElementById('txtEquipoIdEditar').value;
    const area = document.getElementById('selectAreaEditar').value;
    const ejecutivo = obtenerEjecutivoSeleccionado('Editar');
    const hostname = document.getElementById('txtHostnameEditar').value.trim();
    const ip = document.getElementById('txtIpEditar').value.trim();
    const activo = document.getElementById('selectEstadoEquipoEditar').value === 'true';

    const payload = {
        id: parseInt(equipoId),
        area: area || null,
        personalId: ejecutivo.personalId,
        ejecutivoManual: ejecutivo.ejecutivoManual,
        hostname: hostname,
        direccionIP: ip,
        activo: activo
    };

    try {
        const response = await fetch('?handler=ActualizarEquipo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Datos Actualizados!',
                text: 'La información y/o estado del equipo se ha actualizado correctamente.',
                background: '#0b132b',
                color: '#fff',
                confirmButtonColor: '#0284c7'
            }).then(() => location.reload());
        }
    } catch (e) {
        console.error(e);
    }
}

async function agregarFechaAEquipoExistente() {
    const equipoId = document.getElementById('txtEquipoIdEditar').value;
    const area = document.getElementById('selectAreaEditar').value;
    const ejecutivo = obtenerEjecutivoSeleccionado('Editar');
    const hostname = document.getElementById('txtHostnameEditar').value.trim();
    const ip = document.getElementById('txtIpEditar').value.trim();
    const activo = document.getElementById('selectEstadoEquipoEditar').value === 'true';
    const nuevaFecha = document.getElementById('txtNuevaFechaEditar').value;

    if (!nuevaFecha) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione una fecha.', background: '#0b132b', color: '#fff' });
        return;
    }

    const payload = {
        id: parseInt(equipoId),
        area: area || null,
        personalId: ejecutivo.personalId,
        ejecutivoManual: ejecutivo.ejecutivoManual,
        hostname: hostname,
        direccionIP: ip,
        activo: activo,
        nuevasFechas: [nuevaFecha]
    };

    try {
        const response = await fetch('?handler=ActualizarEquipo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Fecha Agregada!',
                text: 'Se ha añadido la nueva fecha al plan correctamente.',
                background: '#0b132b',
                color: '#fff',
                confirmButtonColor: '#0284c7'
            }).then(() => location.reload());
        }
    } catch (e) {
        console.error(e);
    }
}
// ===== NUEVO (Plan de Respaldos): eliminar equipo desde el modal de edición =====
async function eliminarEquipo() {
    const equipoId = document.getElementById('txtEquipoIdEditar').value;
    const hostname = document.getElementById('txtHostnameEditar').value.trim();

    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar equipo?',
        html: `Se eliminará <b>${escaparHtml(hostname)}</b> y todas sus fechas de respaldo.<br/>Esta acción no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: '#0b132b',
        color: '#fff',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#334155'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const response = await fetch('?handler=EliminarEquipo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
            body: JSON.stringify({ id: parseInt(equipoId) })
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Equipo Eliminado!',
                text: 'El equipo se eliminó del plan de respaldos.',
                background: '#0b132b',
                color: '#fff',
                confirmButtonColor: '#0284c7'
            }).then(() => location.reload());
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el equipo.', background: '#0b132b', color: '#fff' });
        }
    } catch (e) {
        console.error(e);
    }
}
// ===== FIN NUEVO =====

// ==========================================
// 7. CONSULTA DE RESPALDOS (MODAL) - CALENDARIO
// ===== MODIFICADO (Plan de Respaldos): filtrado automático (sin botón Filtrar) y vista de calendario =====
// ==========================================
const NOMBRES_MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Colores e iconos de cada estatus (el orden aquí es el orden del resumen de arriba del calendario)
const ESTATUS_CALENDARIO = {
    'Realizado': { clase: 'chip-realizado', icono: 'bi-check-circle-fill', plural: 'Realizados' },
    'En Curso': { clase: 'chip-encurso', icono: 'bi-clock-history', plural: 'En Curso' },
    'Pendiente': { clase: 'chip-pendiente', icono: 'bi-clock', plural: 'Pendientes' },
    'Atrasado': { clase: 'chip-atrasado', icono: 'bi-exclamation-triangle-fill', plural: 'Atrasados' }
};

// Cuántos respaldos se ven por día antes de mostrar el botón "+N más"
const MAX_CHIPS_POR_DIA = 3;

let consultaRespaldosActual = 0;

function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Llena el filtro de Ejecutivo con los ejecutivos de la tabla principal (solo los del área elegida, si hay una)
function cargarEjecutivosFiltroConsulta() {
    const areaSeleccionada = document.getElementById('filtroConsultaArea').value.toLowerCase();
    const selectEjecutivo = document.getElementById('filtroConsultaEjecutivo');
    const ejecutivos = new Map();

    document.querySelectorAll('#tablaEquiposBody tr[data-id]').forEach(tr => {
        const personalId = tr.dataset.personalid;
        if (!personalId) return;
        if (areaSeleccionada && (tr.dataset.area || '').toLowerCase() !== areaSeleccionada) return;
        if (!ejecutivos.has(personalId)) ejecutivos.set(personalId, tr.dataset.ejecutivo || '');
    });

    selectEjecutivo.innerHTML = '<option value="">-- Todos los Ejecutivos --</option>';
    Array.from(ejecutivos.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .forEach(([id, nombre]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = nombre;
            selectEjecutivo.appendChild(option);
        });
}

async function ejecutarFiltroConsultaRespaldos() {
    const anio = parseInt(document.getElementById('filtroConsultaAnio').value);
    const mes = parseInt(document.getElementById('filtroConsultaMes').value);
    const area = document.getElementById('filtroConsultaArea').value;
    const personalId = document.getElementById('filtroConsultaEjecutivo').value;
    const contenedor = document.getElementById('calendarioRespaldos');

    const idConsulta = ++consultaRespaldosActual;
    limpiarTooltipsCalendario();
    contenedor.innerHTML = '<div class="text-muted text-center py-4">Cargando respaldos...</div>';

    const params = new URLSearchParams({ handler: 'ConsultaRespaldos', anio: anio, mes: mes });
    if (area) params.append('area', area);
    if (personalId) params.append('personalId', personalId);

    try {
        const response = await fetch(`?${params.toString()}`);
        if (!response.ok) throw new Error('Error al consultar respaldos');

        const respaldos = await response.json();
        if (idConsulta !== consultaRespaldosActual) return; // Llegó una consulta más reciente

        dibujarCalendarioRespaldos(anio, mes, respaldos, !!personalId);
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = '<div class="text-danger text-center py-4">No se pudieron cargar los respaldos.</div>';
    }
}

function dibujarCalendarioRespaldos(anio, mes, respaldos, ejecutivoSeleccionado) {
    const contenedor = document.getElementById('calendarioRespaldos');
    const respaldosPorDia = {};
    respaldos.forEach(r => {
        (respaldosPorDia[r.dia] = respaldosPorDia[r.dia] || []).push(r);
    });

    const diasEnMes = new Date(anio, mes, 0).getDate();
    const primerDiaSemana = (new Date(anio, mes - 1, 1).getDay() + 6) % 7; // 0 = Lunes
    const hoy = new Date();

    document.getElementById('lblMesCalendario').textContent = `${NOMBRES_MESES[mes]} ${anio}`;
    dibujarResumenCalendario(respaldos);

    let html = '<div class="cal-grid">';
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((d, i) => {
        html += `<div class="cal-encabezado${i >= 5 ? ' cal-finde' : ''}">${d}</div>`;
    });

    for (let i = 0; i < primerDiaSemana; i++) {
        html += '<div class="cal-dia cal-vacio"></div>';
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const esHoy = hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes && hoy.getDate() === dia;
        const diaSemana = (primerDiaSemana + dia - 1) % 7; // 5 = Sábado, 6 = Domingo
        const clases = 'cal-dia' + (esHoy ? ' cal-hoy' : '') + (diaSemana >= 5 ? ' cal-finde' : '');
        const respaldosDelDia = respaldosPorDia[dia] || [];

        html += `<div class="${clases}"><div class="cal-numero">${dia}</div>`;

        respaldosDelDia.forEach((r, indice) => {
            const estatus = ESTATUS_CALENDARIO[r.estatus] || ESTATUS_CALENDARIO['Pendiente'];
            // Con un ejecutivo filtrado se muestra el estatus; sin filtro, el nombre del ejecutivo
            const texto = ejecutivoSeleccionado ? r.estatus : r.ejecutivo;
            // Detalle del tooltip (se escapa cada dato porque el tooltip acepta HTML)
            const detalle = `<b>${escaparHtml(r.estatus)}</b> - ${escaparHtml(r.ejecutivo)} (${escaparHtml(r.area)})`
                + `<br/>Equipo: ${escaparHtml(r.hostname)} (${escaparHtml(r.ip)})`
                + (r.observaciones ? `<br/>Observaciones: ${escaparHtml(r.observaciones)}` : '');
            // Los que pasan del máximo se ocultan hasta que se da clic en "+N más"
            const oculto = indice >= MAX_CHIPS_POR_DIA ? ' chip-oculto' : '';

            html += `<div class="chip-cal ${estatus.clase}${oculto}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="${escaparHtml(detalle)}">`
                + `<i class="bi ${estatus.icono} me-1"></i>${escaparHtml(texto)}</div>`;
        });

        const restantes = respaldosDelDia.length - MAX_CHIPS_POR_DIA;
        if (restantes > 0) {
            html += `<button type="button" class="chip-mas" data-restantes="${restantes}" onclick="alternarChipsDia(this)">+${restantes} más</button>`;
        }

        html += '</div>';
    }

    html += '</div>';

    if (respaldos.length === 0) {
        html += '<div class="text-muted text-center small mt-3">No hay respaldos programados en este mes con los filtros seleccionados.</div>';
    }

    limpiarTooltipsCalendario();
    contenedor.innerHTML = html;
    activarTooltipsCalendario();
}

// Resumen de arriba: cuántos respaldos hay de cada estatus en el mes
function dibujarResumenCalendario(respaldos) {
    const resumen = document.getElementById('resumenCalendario');
    let html = '';

    Object.entries(ESTATUS_CALENDARIO).forEach(([nombre, estatus]) => {
        const total = respaldos.filter(r => r.estatus === nombre).length;
        html += `<span class="chip-cal chip-resumen ${estatus.clase}"><i class="bi ${estatus.icono} me-1"></i>${estatus.plural} <b>${total}</b></span>`;
    });

    resumen.innerHTML = html;
}

// Muestra / oculta los respaldos extra de un día ("+N más" / "Ver menos")
function alternarChipsDia(boton) {
    const dia = boton.closest('.cal-dia');
    const expandido = dia.classList.toggle('cal-expandido');
    boton.textContent = expandido ? 'Ver menos' : `+${boton.dataset.restantes} más`;
}

// Tooltips de Bootstrap del calendario (se quitan antes de redibujar para que no queden "colgados")
function activarTooltipsCalendario() {
    document.querySelectorAll('#calendarioRespaldos [data-bs-toggle="tooltip"]').forEach(el => {
        new bootstrap.Tooltip(el, { customClass: 'tooltip-respaldo', container: '#modalConsultarRespaldos' });
    });
}

function limpiarTooltipsCalendario() {
    document.querySelectorAll('#calendarioRespaldos [data-bs-toggle="tooltip"]').forEach(el => {
        bootstrap.Tooltip.getInstance(el)?.dispose();
    });
}

// Flechas ‹ ›: avanza o retrocede un mes (cambia de año si hace falta)
function cambiarMesConsulta(cambio) {
    const selectAnio = document.getElementById('filtroConsultaAnio');
    const selectMes = document.getElementById('filtroConsultaMes');

    const fecha = new Date(parseInt(selectAnio.value), parseInt(selectMes.value) - 1 + cambio, 1);
    seleccionarMesConsulta(fecha.getFullYear(), fecha.getMonth() + 1);
}

// Botón "Hoy": regresa al mes actual
function irAMesActualConsulta() {
    const hoy = new Date();
    seleccionarMesConsulta(hoy.getFullYear(), hoy.getMonth() + 1);
}

function seleccionarMesConsulta(anio, mes) {
    const selectAnio = document.getElementById('filtroConsultaAnio');

    // Si el año no está en la lista (por navegar con las flechas), se agrega
    if (!Array.from(selectAnio.options).some(o => o.value === String(anio))) {
        const option = document.createElement('option');
        option.value = anio;
        option.textContent = anio;
        selectAnio.appendChild(option);
        Array.from(selectAnio.options)
            .sort((a, b) => a.value - b.value)
            .forEach(o => selectAnio.appendChild(o));
    }

    selectAnio.value = String(anio);
    document.getElementById('filtroConsultaMes').value = String(mes);
    ejecutarFiltroConsultaRespaldos();
}

document.addEventListener('DOMContentLoaded', function () {
    const modalConsulta = document.getElementById('modalConsultarRespaldos');
    if (!modalConsulta) return;

    // El año y mes actuales ya vienen seleccionados desde la vista
    cargarEjecutivosFiltroConsulta();

    document.getElementById('filtroConsultaArea').addEventListener('change', function () {
        cargarEjecutivosFiltroConsulta();
        ejecutarFiltroConsultaRespaldos();
    });
    ['filtroConsultaAnio', 'filtroConsultaMes', 'filtroConsultaEjecutivo'].forEach(id => {
        document.getElementById(id).addEventListener('change', ejecutarFiltroConsultaRespaldos);
    });

    // Al abrir el modal se carga el calendario con los filtros actuales
    modalConsulta.addEventListener('shown.bs.modal', ejecutarFiltroConsultaRespaldos);
    // Al cerrar se quitan los tooltips para que no se queden visibles
    modalConsulta.addEventListener('hide.bs.modal', limpiarTooltipsCalendario);
});
// ===== FIN MODIFICADO =====

// ==========================================
// 8. DRAG & DROP Y COLORES DE ÁREA
// ==========================================
function inicializarDragAndDrop() {
    const el = document.getElementById('tablaEquiposBody');
    if (!el || typeof Sortable === 'undefined') return;

    Sortable.create(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: async function () {
            const filas = el.querySelectorAll('tr[data-id]');
            const ordenIds = Array.from(filas).map(tr => parseInt(tr.dataset.id));

            try {
                await fetch('?handler=GuardarOrden', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
                    body: JSON.stringify(ordenIds)
                });
            } catch (err) {
                console.error('Error al guardar el nuevo orden:', err);
            }
        }
    });
}

// ==========================================
// 8. ASIGNACIÓN DINÁMICA DE CLASES POR ÁREA
// ==========================================
function aplicarColoresAreas() {
    const badges = document.querySelectorAll('.badge-area-sigest');

    badges.forEach(badge => {
        const area = (badge.dataset.area || badge.textContent || '').toLowerCase().trim();
        let clase = 'area-general';

        if (area.includes('dirección') || area.includes('direccion')) clase = 'area-direccion-general';
        else if (area.includes('ventas')) clase = 'area-ventas';
        else if (area.includes('cobranza')) clase = 'area-cobranza';
        else if (area.includes('consultor')) clase = 'area-consultoria';
        else if (area.includes('desarrollo')) clase = 'area-desarrollo';
        else if (area.includes('sistemas') || area.includes('ti')) clase = 'area-sistemas';
        else if (area.includes('soporte')) clase = 'area-soporte';
        else if (area.includes('admin') || area.includes('capital')) clase = 'area-administracion';
        else if (area.includes('conta') || area.includes('finanz')) clase = 'area-contabilidad';

        badge.classList.add(clase);
    });
}

// ==========================================
// 9. EVENT LISTENERS Y EXPONER A WINDOW
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    inicializarDragAndDrop();
    aplicarColoresAreas();

    document.getElementById('selectEstadoEquipoNuevo')?.addEventListener('change', alternarFechasNuevo);
    document.getElementById('selectEstadoEquipoEditar')?.addEventListener('change', alternarFechasEditar);
});

// Exponer funciones globales
window.cargarEjecutivos = cargarEjecutivos;
window.abrirModalEditarDesdeFila = abrirModalEditarDesdeFila;
window.cargarFechaSeleccionadaParaEditar = cargarFechaSeleccionadaParaEditar;
window.guardarCambioFechaIndividual = guardarCambioFechaIndividual;
window.agregarCampoFechaNuevo = agregarCampoFechaNuevo;
window.guardarNuevoEquipo = guardarNuevoEquipo;
window.evaluarEstadoProgramacion = evaluarEstadoProgramacion;
window.guardarEstatusRespaldo = guardarEstatusRespaldo;
window.guardarEdicionEquipo = guardarEdicionEquipo;
window.agregarFechaAEquipoExistente = agregarFechaAEquipoExistente;
window.ejecutarFiltroConsultaRespaldos = ejecutarFiltroConsultaRespaldos;
window.alternarEjecutivoManual = alternarEjecutivoManual;
window.eliminarEquipo = eliminarEquipo;
window.cambiarMesConsulta = cambiarMesConsulta;
window.irAMesActualConsulta = irAMesActualConsulta;
window.alternarChipsDia = alternarChipsDia;
