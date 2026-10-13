// ==========================================
// 1. OBTENER TOKEN DE VERIFICACIÓN
// ==========================================
function getAntiForgeryToken() {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    return tokenInput ? tokenInput.value : '';
}

// ==========================================
// 2. CARGA DINÁMICA DE EJECUTIVOS POR ÁREA
// ==========================================
async function cargarEjecutivos(tipo, personalIdSeleccionado = null) {
    const areaSelect = document.getElementById(`selectArea${tipo}`);
    const selectEjecutivo = document.getElementById(`selectEjecutivo${tipo}`);

    if (!areaSelect || !selectEjecutivo) return;

    const area = areaSelect.value;
    selectEjecutivo.innerHTML = '<option value="">Sin Ejecutivo Asignado</option>';

    if (!area) {
        selectEjecutivo.disabled = true;
        return;
    }

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
            selectEjecutivo.appendChild(option);
        });

        selectEjecutivo.disabled = false;
    } catch (error) {
        console.error('Error al cargar ejecutivos:', error);
    }
}

// ==========================================
// 3. ALTERNAR VISIBILIDAD DE FECHAS (ACTIVO/INACTIVO)
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
// 4. ABRIR MODAL DESDE FILA
// ==========================================
function abrirModalEditarDesdeFila(elemento) {
    const tr = elemento.closest('tr');
    if (!tr || !tr.dataset.id) return;

    const id = tr.dataset.id;
    const area = tr.dataset.area;
    const personalId = tr.dataset.personalid;
    const hostname = tr.dataset.hostname;
    const ip = tr.dataset.ip;
    const activo = tr.dataset.activo === 'true';
    const programaciones = JSON.parse(tr.dataset.programaciones || '[]');

    document.getElementById('txtEquipoIdEditar').value = id;
    document.getElementById('selectAreaEditar').value = (area === 'Sin Área / General' || area === 'N/A') ? '' : area;
    document.getElementById('txtHostnameEditar').value = hostname;
    document.getElementById('txtIpEditar').value = ip;
    document.getElementById('selectEstadoEquipoEditar').value = activo ? 'true' : 'false';

    cargarEjecutivos('Editar', personalId);

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
// 5. CARGAR Y EDITAR FECHA INDIVIDUAL
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
        alert('Seleccione una fecha válida.');
        return;
    }

    const payload = {
        programacionId: parseInt(programacionId),
        nuevaFecha: nuevaFecha
    };

    try {
        const response = await fetch('?handler=EditarFechaProgramada', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('¡La fecha programada se ha actualizado correctamente!');
            location.reload();
        } else {
            alert('Error al actualizar la fecha.');
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// 6. MÉTODOS CRUD Y ACCIONES
// ==========================================
function agregarCampoFechaNuevo() {
    const contenedor = document.getElementById('contenedorFechasNuevo');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="date" class="form-control bg-dark text-white border-secondary fecha-input-nuevo" required />
        <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()"><i class="bi bi-trash"></i></button>
    `;
    contenedor.appendChild(div);
}

async function guardarNuevoEquipo() {
    const area = document.getElementById('selectAreaNuevo').value;
    const personalId = document.getElementById('selectEjecutivoNuevo').value;
    const hostname = document.getElementById('txtHostnameNuevo').value.trim();
    const ip = document.getElementById('txtIpNuevo').value.trim();
    const activo = document.getElementById('selectEstadoEquipoNuevo').value === 'true';

    const fechaElements = document.querySelectorAll('.fecha-input-nuevo');
    const fechas = Array.from(fechaElements).map(input => input.value).filter(val => val !== '');

    if (!hostname || !ip) {
        alert('Por favor ingrese Hostname e IP.');
        return;
    }

    if (activo && fechas.length === 0) {
        alert('Debe agregar al menos una fecha programada para equipos activos.');
        return;
    }

    const payload = {
        area: area || null,
        personalId: personalId ? parseInt(personalId) : null,
        hostname: hostname,
        direccionIP: ip,
        activo: activo,
        fechas: activo ? fechas : []
    };

    try {
        const response = await fetch('?handler=GuardarEquipo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('¡Equipo y respaldo registrados correctamente!');
            location.reload();
        } else {
            alert('Error al guardar el equipo.');
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
        alert('Seleccione una fecha.');
        return;
    }

    if (estado === 'En Curso' && !observaciones) {
        alert('Ingrese las observaciones si el respaldo está "En Curso".');
        return;
    }

    const payload = {
        programacionId: parseInt(programacionId),
        estado: estado,
        observaciones: observaciones
    };

    try {
        const response = await fetch('?handler=CambiarEstadoRespaldo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('¡Estatus de respaldo actualizado correctamente!');
            location.reload();
        }
    } catch (e) {
        console.error(e);
    }
}

async function guardarEdicionEquipo() {
    const equipoId = document.getElementById('txtEquipoIdEditar').value;
    const area = document.getElementById('selectAreaEditar').value;
    const personalId = document.getElementById('selectEjecutivoEditar').value;
    const hostname = document.getElementById('txtHostnameEditar').value.trim();
    const ip = document.getElementById('txtIpEditar').value.trim();
    const activo = document.getElementById('selectEstadoEquipoEditar').value === 'true';

    const payload = {
        id: parseInt(equipoId),
        area: area || null,
        personalId: personalId ? parseInt(personalId) : null,
        hostname: hostname,
        direccionIP: ip,
        activo: activo
    };

    try {
        const response = await fetch('?handler=ActualizarEquipo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('¡Información del equipo actualizada correctamente!');
            location.reload();
        }
    } catch (e) {
        console.error(e);
    }
}

async function agregarFechaAEquipoExistente() {
    const equipoId = document.getElementById('txtEquipoIdEditar').value;
    const area = document.getElementById('selectAreaEditar').value;
    const personalId = document.getElementById('selectEjecutivoEditar').value;
    const hostname = document.getElementById('txtHostnameEditar').value.trim();
    const ip = document.getElementById('txtIpEditar').value.trim();
    const activo = document.getElementById('selectEstadoEquipoEditar').value === 'true';
    const nuevaFecha = document.getElementById('txtNuevaFechaEditar').value;

    if (!nuevaFecha) {
        alert('Seleccione una fecha.');
        return;
    }

    const payload = {
        id: parseInt(equipoId),
        area: area || null,
        personalId: personalId ? parseInt(personalId) : null,
        hostname: hostname,
        direccionIP: ip,
        activo: activo,
        nuevasFechas: [nuevaFecha]
    };

    try {
        const response = await fetch('?handler=ActualizarEquipo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('¡Nueva fecha agregada al plan correctamente!');
            location.reload();
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// 7. INICIALIZACIÓN DRAG & DROP
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
                    headers: {
                        'Content-Type': 'application/json',
                        'RequestVerificationToken': getAntiForgeryToken()
                    },
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
        else if (area.includes('operac') || area.includes('logist')) clase = 'area-operaciones';
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

// Exponer explícitamente las funciones invocadas desde inline HTML (onchange, onclick)
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
window.aplicarColoresAreas = aplicarColoresAreas;