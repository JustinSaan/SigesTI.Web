document.addEventListener('DOMContentLoaded', function () {
    // 1. Botón Nueva Tarea
    const btnNuevaTarea = document.getElementById('btnNuevaTarea');
    if (btnNuevaTarea) {
        btnNuevaTarea.addEventListener('click', function () {
            abrirModalTarea(0);
        });
    }

    // 2. Switch e Interruptor de Actividades Adicionales
    const switchActividades = document.getElementById('switchActividadesAdicionales');
    if (switchActividades) {
        switchActividades.addEventListener('change', function () {
            const panel = document.getElementById('panelActividadesAdicionales');
            if (panel) {
                if (this.checked) {
                    panel.classList.remove('d-none');
                } else {
                    panel.classList.add('d-none');
                }
            }
        });
    }

    // 3. Menú Desplegable de Nuevo Tipo
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

    // 4. Submit de Guardar Tarea
    const formTarea = document.getElementById('formTarea');
    if (formTarea) {
        formTarea.addEventListener('submit', guardarTareaHandler);
    }

    // 5. Clics en Filas de la Tabla (Editar Tarea)
    document.querySelectorAll('.fila-tarea').forEach(row => {
        row.addEventListener('click', function (e) {
            // Evitar disparar si se hace clic en el botón resolver interno
            if (e.target.closest('.btn-resolver')) return;

            const id = this.getAttribute('data-id');
            if (id) abrirModalTarea(id);
        });
    });

    // 6. Botón Resolver Tarea
    document.querySelectorAll('.btn-resolver').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            if (id) abrirModalResolver(id);
        });
    });

    // 7. Confirmar Resolver Tarea
    const btnConfirmarResolver = document.getElementById('btnConfirmarResolver');
    if (btnConfirmarResolver) {
        btnConfirmarResolver.addEventListener('click', marcarResuelta);
    }

    // 8. Cargar Soportes Internos del Día
    cargarSoportesDelDia();

    const txtAreaSoportes = document.getElementById('txtSoportesInternos');
    if (txtAreaSoportes) {
        txtAreaSoportes.addEventListener('blur', guardarSoportesAuto);
    }

    // 9. EVENTOS DE IMPRESIÓN Y VISTA PREVIA REPORTE
    const btnImprimir = document.getElementById('btnImprimirReporte');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', abrirVistaPreviaImpresionTareas);
    }

    const btnConfirmarImp = document.getElementById('btnConfirmarImpresion');
    if (btnConfirmarImp) {
        btnConfirmarImp.addEventListener('click', imprimirContenidoLimpioTareas);
    }
});

// --- FUNCIONES DE GESTIÓN DE TAREAS ---

function abrirModalTarea(id) {
    const form = document.getElementById('formTarea');
    if (form) form.reset();

    document.getElementById('tareaId').value = id;
    const divNuevoTipo = document.getElementById('divNuevoTipo');
    if (divNuevoTipo) divNuevoTipo.classList.add('d-none');

    if (parseInt(id) === 0) {
        document.getElementById('modalTareaTitulo').innerHTML = '<i class="bi bi-plus-circle me-2 text-info"></i>Nueva Tarea Programada';
        const modalElem = document.getElementById('modalTarea');
        const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
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

                const modalElem = document.getElementById('modalTarea');
                const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
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
    .catch(err => console.error("Error al guardar tarea:", err));
}

function abrirModalResolver(id) {
    document.getElementById('resolverTareaId').value = id;
    const modalElem = document.getElementById('modalResolverTarea');
    const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
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
    .catch(err => console.error("Error al resolver tarea:", err));
}

// --- SOPORTES INTERNOS DEL DÍA ---

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

    if (fechaGuardada !== fechaHoy) {
        localStorage.removeItem('soportes_texto');
        localStorage.setItem('soportes_fecha', fechaHoy);

        if (txtArea) txtArea.value = '';
        if (switchAct) switchAct.checked = false;
        if (panel) panel.classList.add('d-none');
    } else {
        const textoGuardado = localStorage.getItem('soportes_texto');
        if (textoGuardado && textoGuardado.trim() !== '') {
            if (txtArea) txtArea.value = textoGuardado;
            if (switchAct) switchAct.checked = true;
            if (panel) panel.classList.remove('d-none');
        } else {
            if (switchAct) switchAct.checked = false;
            if (panel) panel.classList.add('d-none');
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

// --- CONSTRUCCIÓN Y MÓDULO DE IMPRESIÓN ---

function abrirVistaPreviaImpresionTareas() {
    // 1. Evaluar Soportes Internos
    const switchAct = document.getElementById('switchActividadesAdicionales');
    const txtSoportes = document.getElementById('txtSoportesInternos');
    const printSoportesContainer = document.getElementById('printSoportesContainer');
    const printSoportesTexto = document.getElementById('printSoportesTexto');

    if (switchAct && switchAct.checked && txtSoportes && txtSoportes.value.trim() !== '') {
        if (printSoportesTexto) printSoportesTexto.innerText = txtSoportes.value.trim();
        if (printSoportesContainer) printSoportesContainer.classList.remove('d-none');
    } else {
        if (printSoportesContainer) printSoportesContainer.classList.add('d-none');
    }

    // 2. Poblar la tabla de vista previa leyendo la tabla interactiva
    const tbodyPrint = document.getElementById('tbodyTareasPrint');
    const filasOriginales = document.querySelectorAll('#tablaTareasOriginal tbody tr.fila-tarea');

    if (tbodyPrint) {
        tbodyPrint.innerHTML = '';

        if (filasOriginales.length === 0) {
            tbodyPrint.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No hay tareas para mostrar en el reporte.</td></tr>';
        } else {
            filasOriginales.forEach(tr => {
                const index = tr.querySelector('.text-index')?.innerText.trim() || '-';
                const tarea = tr.querySelector('.text-tarea')?.innerText.trim() || '-';
                const tipo = tr.querySelector('.text-tipo')?.innerText.trim() || '-';
                const asignado = tr.querySelector('.text-asignado')?.innerText.trim() || '-';
                const fechaMax = tr.querySelector('.text-fechamax')?.innerText.trim() || '-';
                const fechaReal = tr.querySelector('.text-fechareal')?.innerText.trim() || '-';
                const obs = tr.querySelector('.text-obs')?.innerText.trim() || '-';
                const estatusText = tr.querySelector('.text-estatus')?.innerText.trim() || 'Pendiente';

                const badgeClass = estatusText.includes('Resuelta') ? 'badge-print-cerrado' : 'badge-print-encurso';

                const newTr = document.createElement('tr');
                newTr.innerHTML = `
                    <td class="text-center">${index}</td>
                    <td class="fw-bold text-start">${tarea}</td>
                    <td class="text-center">${tipo}</td>
                    <td class="text-start">${asignado}</td>
                    <td class="text-center">${fechaMax}</td>
                    <td class="text-center">${fechaReal}</td>
                    <td class="col-solucion text-start">${obs}</td>
                    <td class="text-center"><span class="${badgeClass}">${estatusText}</span></td>
                `;
                tbodyPrint.appendChild(newTr);
            });
        }
    }

    // 3. Desplegar la Modal
    const modalElem = document.getElementById('modalVistaPreviaReporte');
    if (modalElem) {
        const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
        modal.show();
    }
}

function imprimirContenidoLimpioTareas() {
    const seccion = document.getElementById('seccionImpresion');
    if (!seccion) {
        window.print();
        return;
    }

    const tituloAnterior = document.title;
    const fecha = new Date().toISOString().split('T')[0];
    document.title = `Reporte_TareasProgramadas_${fecha}`;

    // Desplazar la sección fuera del árbol modal para evitar recortes del navegador
    const padreOriginal = seccion.parentNode;
    document.body.appendChild(seccion);

    window.print();

    setTimeout(function () {
        padreOriginal.appendChild(seccion);
        document.title = tituloAnterior;
    }, 500);
}