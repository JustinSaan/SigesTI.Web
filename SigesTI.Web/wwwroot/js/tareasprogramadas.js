document.addEventListener('DOMContentLoaded', function () {
    // 1. Inicializar Botón Nueva Tarea
    const btnNuevaTarea = document.getElementById('btnNuevaTarea');
    if (btnNuevaTarea) {
        btnNuevaTarea.addEventListener('click', function () {
            abrirModalTarea(0);
        });
    }

    // 2. Inicializar Switch de Actividades Adicionales
    const switchActividades = document.getElementById('switchActividadesAdicionales');
    if (switchActividades) {
        switchActividades.addEventListener('change', function () {
            const panel = document.getElementById('panelActividadesAdicionales');
            if (panel) {
                if (this.checked) {
                    panel.classList.add('show');
                } else {
                    panel.classList.remove('show');
                }
            }
        });
    }

    // 3. Evaluar Selección de Tipo Nuevo
    const ddlTipo = document.getElementById('ddlTipo');
    if (ddlTipo) {
        ddlTipo.addEventListener('change', function () {
            const divNuevo = document.getElementById('divNuevoTipo');
            if (divNuevo) {
                if (this.value === "-1") {
                    divNuevo.classList.remove('d-none');
                } else {
                    divNuevo.classList.add('d-none');
                }
            }
        });
    }

    // 4. Submit de Formulario
    const formTarea = document.getElementById('formTarea');
    if (formTarea) {
        formTarea.addEventListener('submit', guardarTareaHandler);
    }

    // 5. Clics en Filas de la Tabla (Editar)
    document.querySelectorAll('.fila-tarea').forEach(row => {
        row.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            if (id) abrirModalTarea(id);
        });
    });

    // 6. Clics en Botón Marcar Resuelta
    document.querySelectorAll('.btn-resolver').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            if (id) abrirModalResolver(id);
        });
    });

    // 7. Confirmar Resolver
    const btnConfirmarResolver = document.getElementById('btnConfirmarResolver');
    if (btnConfirmarResolver) {
        btnConfirmarResolver.addEventListener('click', marcarResuelta);
    }

    // 8. Cargar Soportes Internos del Día y Configurar Autoguardado (Opción C)
    cargarSoportesDelDia();

    const txtAreaSoportes = document.getElementById('txtSoportesInternos');
    if (txtAreaSoportes) {
        txtAreaSoportes.addEventListener('blur', guardarSoportesAuto);
    }
});

function abrirModalTarea(id) {
    const form = document.getElementById('formTarea');
    if (form) form.reset();

    document.getElementById('tareaId').value = id;
    document.getElementById('divNuevoTipo').classList.add('d-none');

    if (parseInt(id) === 0) {
        document.getElementById('modalTareaTitulo').innerHTML = '<i class="bi bi-plus-circle me-2 text-info"></i>Nueva Tarea Programada';
        const modal = new bootstrap.Modal(document.getElementById('modalTarea'));
        modal.show();
    } else {
        document.getElementById('modalTareaTitulo').innerHTML = '<i class="bi bi-pencil-square me-2 text-info"></i>Editar Tarea Programada';
        fetch(`?handler=ObtenerTarea&id=${id}`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('tareaId').value = data.id;
                document.getElementById('txtTarea').value = data.tarea;
                document.getElementById('ddlTipo').value = data.tipoTareaId;
                document.getElementById('ddlUsuario').value = data.personaAsignadaId;
                document.getElementById('txtFechaMaxima').value = data.fechaMaximaRealizacion;
                document.getElementById('txtObjetivo').value = data.objetivo || '';
                document.getElementById('txtObservaciones').value = data.observaciones || '';

                const modal = new bootstrap.Modal(document.getElementById('modalTarea'));
                modal.show();
            })
            .catch(err => console.error("Error al obtener tarea:", err));
    }
}

function guardarTareaHandler(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

    fetch('?handler=GuardarTarea', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': tokenInput ? tokenInput.value : ''
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (typeof mostrarModalExito === 'function') {
                mostrarModalExito(data.message, () => location.reload());
            } else if (typeof Swal !== 'undefined') {
                Swal.fire('¡Éxito!', data.message, 'success').then(() => location.reload());
            } else {
                alert(data.message);
                location.reload();
            }
        }
    })
    .catch(err => console.error("Error al guardar:", err));
}

function abrirModalResolver(id) {
    document.getElementById('resolverTareaId').value = id;
    const modal = new bootstrap.Modal(document.getElementById('modalResolverTarea'));
    modal.show();
}

function marcarResuelta() {
    const id = document.getElementById('resolverTareaId').value;
    const fecha = document.getElementById('txtFechaRealizacion').value;
    const obs = document.getElementById('txtObservacionesResolver').value;
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

    const formData = new FormData();
    formData.append('id', id);
    formData.append('fechaRealizacion', fecha);
    formData.append('observaciones', obs);

    fetch('?handler=MarcarResuelta', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': tokenInput ? tokenInput.value : ''
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (typeof mostrarModalExito === 'function') {
                mostrarModalExito(data.message, () => location.reload());
            } else if (typeof Swal !== 'undefined') {
                Swal.fire('¡Resuelta!', data.message, 'success').then(() => location.reload());
            } else {
                alert(data.message);
                location.reload();
            }
        }
    })
    .catch(err => console.error("Error al marcar resuelta:", err));
}

// --- Lógica de Soportes Internos / Actividades Adicionales del Día ---

function obtenerFechaHoy() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function cargarSoportesDelDia() {
    const fechaHoy = obtenerFechaHoy();
    const fechaGuardada = localStorage.getItem('soportes_fecha');
    const txtArea = document.getElementById('txtSoportesInternos');
    const switchAct = document.getElementById('switchActividadesAdicionales');
    const panel = document.getElementById('panelActividadesAdicionales');

    // Si cambió el día respecto al último registro, se reinicia y se mantiene deshabilitado/oculto
    if (fechaGuardada !== fechaHoy) {
        localStorage.removeItem('soportes_texto');
        localStorage.setItem('soportes_fecha', fechaHoy);

        if (txtArea) txtArea.value = '';
        if (switchAct) switchAct.checked = false;
        if (panel) panel.classList.remove('show');
    } else {
        // Mismo día: restaurar texto e iluminar switch/panel si hay información guardada
        const textoGuardado = localStorage.getItem('soportes_texto');
        if (textoGuardado && textoGuardado.trim() !== '') {
            if (txtArea) txtArea.value = textoGuardado;
            if (switchAct) switchAct.checked = true;
            if (panel) panel.classList.add('show');
        } else {
            if (switchAct) switchAct.checked = false;
            if (panel) panel.classList.remove('show');
        }
    }
}

function guardarSoportesAuto() {
    const fechaHoy = obtenerFechaHoy();
    const txtArea = document.getElementById('txtSoportesInternos');
    const lbl = document.getElementById('lblEstadoGuardado');

    if (txtArea) {
        const texto = txtArea.value.trim();
        localStorage.setItem('soportes_fecha', fechaHoy);
        localStorage.setItem('soportes_texto', texto);

        if (lbl) {
            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            lbl.innerText = `Guardado automáticamente (${hora})`;
            lbl.classList.remove('text-muted');
            lbl.classList.add('text-info');

            setTimeout(() => {
                lbl.classList.remove('text-info');
                lbl.classList.add('text-muted');
            }, 2500);
        }
    }
}