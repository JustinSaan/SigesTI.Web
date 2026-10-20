document.addEventListener('DOMContentLoaded', function () {
    aplicarColoresTiposTarea();
    sincronizarScrollbars();

    // 1. Botón Nueva Tarea
    const btnNuevaTarea = document.getElementById('btnNuevaTarea');
    if (btnNuevaTarea) {
        btnNuevaTarea.addEventListener('click', function () {
            abrirModalTarea(0);
        });
    }

    // 2. Control dinámico de Fecha de Realización en la Modal
    const ddlEstatusModal = document.getElementById('ddlEstatusModal');
    if (ddlEstatusModal) {
        ddlEstatusModal.addEventListener('change', evaluarEstadoFechaRealizacion);
    }

    // 3. Switches y ComboBox Campaña

    const switchActividades = document.getElementById('switchActividadesAdicionales');
    if (switchActividades) {
    switchActividades.addEventListener('change', function () {
        const panel = document.getElementById('panelActividadesAdicionales');
        if (panel) {
            if (this.checked) panel.classList.remove('d-none');
            else panel.classList.add('d-none');
        }
    });
}

// 2. Función centralizada que extrae mes y año
    function actualizarAvances() {
    const ddlMes = document.getElementById('ddlMesCampana');
    const ddlAnio = document.getElementById('ddlAnioCampana');
    
    if (ddlMes && ddlAnio) {
        const mes = ddlMes.value;
        const anio = ddlAnio.value;
        
        if (mes !== 'Seleccione' && anio !== 'Año') {
            cargarAvancesCampana(mes, anio); 
        } else {
            // Lista de todos los IDs que se actualizan con números
            const idsNum = [
                'campTotalClientes', 'campEncuestasFin', 'campSeguimientoPend', 
                'campEncuestasCurso', 'campContactadosHoy',
                'printCampTotal', 'printCampFin', 'printCampPend', 
                'printCampCurso', 'printCampContactados'
            ];
            
            // Ponemos los contadores en '0'
            idsNum.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = '0';
            });

            // Ponemos los porcentajes en '0%'
            const idsPorcentaje = ['campPorcentaje', 'printCampPorcentaje'];
            idsPorcentaje.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = '0%';
            });
        }
    }
}

// 3. Switch de Campaña de Renovación
const switchCampana = document.getElementById('switchCampanaRenovacion');
if (switchCampana) {
    switchCampana.addEventListener('change', function () {
        const panel = document.getElementById('panelCampanaRenovacion');
        if (panel) {
            if (this.checked) {
                panel.classList.remove('d-none');
                actualizarAvances(); // Carga si ya hay valores seleccionados
            } else {
                panel.classList.add('d-none');
            }
        }
    });
}

// 4. Eventos de cambio para el Mes y el Año
const ddlMes = document.getElementById('ddlMesCampana');
if (ddlMes) {
    ddlMes.addEventListener('change', actualizarAvances);
}

const ddlAnio = document.getElementById('ddlAnioCampana');
if (ddlAnio) {
    ddlAnio.addEventListener('change', actualizarAvances);
}

    // 4. Agregar nuevo tipo de tarea
    const ddlTipo = document.getElementById('ddlTipo');
    if (ddlTipo) {
        ddlTipo.addEventListener('change', function () {
            const divNuevo = document.getElementById('divNuevoTipo');
            if (divNuevo) {
                if (this.value === "-1") divNuevo.classList.remove('d-none');
                else divNuevo.classList.add('d-none');
            }
        });
    }

    // 5. Submit Formulario Modal
    const formTarea = document.getElementById('formTarea');
    if (formTarea) {
        formTarea.addEventListener('submit', guardarTareaHandler);
    }

    // 6. Clics en Filas (Editar Tarea)
    document.querySelectorAll('.fila-tarea').forEach(row => {
        row.addEventListener('click', function (e) {
            if (e.target.closest('select') || e.target.closest('button')) return;
            const id = this.getAttribute('data-id');
            if (id) abrirModalTarea(id);
        });
    });

    // 7. Botones Editar y Eliminar
    document.querySelectorAll('.btn-editar-tarea').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            if (id) abrirModalTarea(id);
        });
    });

    document.querySelectorAll('.btn-eliminar-tarea').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            if (id) eliminarTarea(id);
        });
    });

    // 8. Cambio de Estatus en la Tabla
    document.querySelectorAll('.ddl-estatus-tabla').forEach(select => {
        aplicarEstiloSelectEstatus(select);
        select.addEventListener('change', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            const nuevoEstatus = this.value;
            cambiarEstatusTarea(id, nuevoEstatus, this);
        });
    });

    // 9. Soportes Internos
    cargarSoportesDelDia();
    const txtAreaSoportes = document.getElementById('txtSoportesInternos');
    if (txtAreaSoportes) {
        txtAreaSoportes.addEventListener('blur', guardarSoportesAuto);
    }

    // 10. Filtros Automáticos
    document.querySelectorAll('.filtro-auto').forEach(input => {
        input.addEventListener('change', aplicarFiltrosTabla);
        input.addEventListener('input', aplicarFiltrosTabla);
    });

    aplicarFiltrosTabla();

    // 11. Impresión Reporte
    const btnImprimir = document.getElementById('btnImprimirReporte');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', abrirVistaPreviaImpresionTareas);
    }

    const btnConfirmarImp = document.getElementById('btnConfirmarImpresion');
    if (btnConfirmarImp) {
        btnConfirmarImp.addEventListener('click', imprimirContenidoLimpioTareas);
    }

    window.addEventListener('resize', sincronizarScrollbars);
});

function evaluarEstadoFechaRealizacion() {
    const ddlEstatus = document.getElementById('ddlEstatusModal');
    const txtFechaReal = document.getElementById('txtFechaRealizacion');
    if (!ddlEstatus || !txtFechaReal) return;

    if (ddlEstatus.value === 'Resuelta') {
        txtFechaReal.disabled = false;
        if (!txtFechaReal.value) {
            txtFechaReal.value = obtenerFechaHoyISO();
        }
    } else {
        txtFechaReal.disabled = true;
        txtFechaReal.value = '';
    }
}

function obtenerFechaHoyISO() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function aplicarFiltrosTabla() {
    const fSolicitud = (document.getElementById('filtroFechaSolicitud')?.value || '').trim();
    const fRealizacion = (document.getElementById('filtroFechaRealizacion')?.value || '').trim();
    const fEstatus = (document.getElementById('filtroEstatus')?.value || '').trim().toLowerCase();
    const fGeneral = (document.getElementById('filtroGeneral')?.value || '').trim().toLowerCase();

    const hoy = obtenerFechaHoyISO();
    const hayFechasActivas = fSolicitud !== '' || fRealizacion !== '';

    const filas = document.querySelectorAll('#tablaTareasOriginal tbody tr.fila-tarea');

    filas.forEach(row => {
        const selectEstatus = row.querySelector('.ddl-estatus-tabla');
        const valEstatus = (selectEstatus ? selectEstatus.value : '').trim().toLowerCase();

        // Obtenemos de forma segura las fechas de los atributos data-fecha
        const valSolicitud = row.querySelector('.text-fechasolicitud')?.getAttribute('data-fecha') || '';
        const valRealizacion = row.querySelector('.text-fechareal')?.getAttribute('data-fecha') || '';

        // Texto completo de la fila para la búsqueda general (abarca nombre, tipo, personal, observaciones, etc.)
        const textoFila = row.innerText.toLowerCase();

        // 1. Búsqueda general por palabras (permite buscar varias palabras ej. "Juan ESET")
        let cumpleGeneral = true;
        if (fGeneral !== '') {
            const palabras = fGeneral.split(/\s+/);
            cumpleGeneral = palabras.every(palabra => textoFila.includes(palabra));
        }

        // 2. Filtro por Estatus
        let cumpleEstatus = !fEstatus || valEstatus === fEstatus;

        // 3. Filtro por Fechas
        let cumpleFechas = true;
        if (hayFechasActivas) {
            if (fSolicitud && valSolicitud && valSolicitud < fSolicitud) {
                cumpleFechas = false;
            }
            if (fRealizacion && valRealizacion && valRealizacion > fRealizacion) {
                cumpleFechas = false;
            }

            // si hay texto en la búsqueda general, se muestran tareas de cualquier estatus 
        } else if (fGeneral === '') {
            // Sin búsqueda: las tareas que solo se cargan para la búsqueda (Resueltas) quedan ocultas como antes
            if (row.getAttribute('data-solo-busqueda') === 'true') {
                cumpleFechas = false;
            }

            // Si no hay fechas activas, oculta las resueltas antiguas por defecto para limpiar la vista diaria
            const esResuelta = valEstatus === 'resuelta';
            if (esResuelta && valRealizacion !== hoy && valRealizacion !== '') {
                cumpleFechas = false;
            }
        }

        // Aplicar visibilidad final
        if (cumpleGeneral && cumpleEstatus && cumpleFechas) {
            row.classList.remove('d-none');
        } else {
            row.classList.add('d-none');
        }
    });

    if (typeof sincronizarScrollbars === 'function') sincronizarScrollbars();
}

function cambiarEstatusTarea(id, nuevoEstatus, selectElement) {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    const formData = new FormData();
    formData.append('id', id);
    formData.append('nuevoEstatus', nuevoEstatus);

    fetch('?handler=CambiarEstatus', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': tokenInput ? tokenInput.value : ''
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            aplicarEstiloSelectEstatus(selectElement);

            const row = selectElement.closest('tr');
            if (row) {
                const tdFechaReal = row.querySelector('.text-fechareal');
                if (tdFechaReal) {
                    tdFechaReal.innerText = data.fechaRealizacion;
                    if (data.fechaRealizacion !== '-') {
                        tdFechaReal.setAttribute('data-fecha', obtenerFechaHoyISO());
                    } else {
                        tdFechaReal.setAttribute('data-fecha', '');
                    }
                }
            }

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: '¡Estatus Actualizado!',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false
                });
            }

            aplicarFiltrosTabla();
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire('Error', data.message, 'error');
            }
        }
    });
}

function aplicarEstiloSelectEstatus(select) {
    if (!select) return;
    const val = select.value;
    select.className = 'form-select form-select-sm ddl-estatus-tabla text-center fw-bold py-1 px-2';

    if (val === 'Resuelta') {
        select.classList.add('estatus-resuelta');
    } else if (val === 'En Curso') {
        select.classList.add('estatus-encurso');
    } else {
        select.classList.add('estatus-pendiente');
    }
}

function abrirModalTarea(id) {
    const form = document.getElementById('formTarea');
    if (form) form.reset();

    document.getElementById('tareaId').value = id;
    const divNuevoTipo = document.getElementById('divNuevoTipo');
    if (divNuevoTipo) divNuevoTipo.classList.add('d-none');

    const txtNuevoComentario = document.getElementById('txtNuevoComentario');
    if (txtNuevoComentario) txtNuevoComentario.value = '';

    const modalElem = document.getElementById('modalTarea');

    if (parseInt(id) === 0) {
        document.getElementById('modalTareaTitulo').innerHTML = '<i class="bi bi-plus-circle me-2 text-info"></i>Nueva Tarea Programada';

        const inputFecha = document.getElementById('txtFechaSolicitud');
        if (inputFecha) inputFecha.value = obtenerFechaHoyISO();

        const ddlEst = document.getElementById('ddlEstatusModal');
        if (ddlEst) ddlEst.value = 'Pendiente';

        evaluarEstadoFechaRealizacion();

        const contHistorial = document.getElementById('contenedorHistorialComentarios');
        if (contHistorial) contHistorial.innerHTML = '<span class="text-muted small fst-italic">No hay observaciones registradas.</span>';

        const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
        modal.show();
    } else {
        document.getElementById('modalTareaTitulo').innerHTML = '<i class="bi bi-pencil-square me-2 text-info"></i>Editar Tarea Programada';

        fetch(`?handler=ObtenerTarea&id=${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.redirect) {
                    window.location.href = data.redirect;
                    return;
                }

                document.getElementById('tareaId').value = data.id;
                document.getElementById('txtTarea').value = data.tarea;
                document.getElementById('ddlTipo').value = data.tipoTareaId;
                if (document.getElementById('ddlPersonaSolicitante')) {
                    document.getElementById('ddlPersonaSolicitante').value = data.personaSolicitante || '';
                }
                document.getElementById('ddlUsuario').value = data.personaAsignadaId;
                if (document.getElementById('txtFechaSolicitud')) {
                    document.getElementById('txtFechaSolicitud').value = data.fechaSolicitud;
                }
                document.getElementById('txtObjetivo').value = data.objetivo || '';

                const ddlEst = document.getElementById('ddlEstatusModal');
                if (ddlEst) ddlEst.value = data.estatus || 'Pendiente';

                const txtFechaReal = document.getElementById('txtFechaRealizacion');
                if (txtFechaReal) txtFechaReal.value = data.fechaRealizacion || '';

                evaluarEstadoFechaRealizacion();

                const contHistorial = document.getElementById('contenedorHistorialComentarios');
                if (contHistorial) {
                    if (data.observaciones && data.observaciones.trim() !== '') {
                        contHistorial.innerText = data.observaciones;
                    } else {
                        contHistorial.innerHTML = '<span class="text-muted small fst-italic">No hay observaciones registradas.</span>';
                    }
                }

                const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
                modal.show();
            });
    }
}

function guardarTareaHandler(e) {
    e.preventDefault();

    const btnSubmit = this.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    const formData = new FormData(this);
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');

    fetch('?handler=GuardarTarea', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': tokenInput ? tokenInput.value : ''
        }
    })
    .then(async res => {
        const data = await res.json();
        if (data.redirect) {
            window.location.href = data.redirect;
            return;
        }

        if (data.success) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: data.message,
                    timer: 1800,
                    showConfirmButton: false
                }).then(() => location.reload());
            } else {
                location.reload();
            }
        } else {
            if (btnSubmit) btnSubmit.disabled = false;
            if (typeof Swal !== 'undefined') {
                Swal.fire('Error al Guardar', data.message, 'error');
            }
        }
    });
}

function eliminarTarea(id) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¿Eliminar tarea?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                ejecutarEliminacion(id);
            }
        });
    }
}

function ejecutarEliminacion(id) {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    const formData = new FormData();
    formData.append('id', id);

    fetch('?handler=EliminarTarea', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': tokenInput ? tokenInput.value : ''
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.redirect) {
            window.location.href = data.redirect;
            return;
        }

        if (data.success) {
            Swal.fire('Eliminado', data.message, 'success').then(() => location.reload());
        } else {
            Swal.fire('No permitido', data.message, 'error');
        }
    });
}

function cargarSoportesDelDia() {
    const fechaHoy = obtenerFechaHoyISO();
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
        }
    }
}

function guardarSoportesAuto() {
    const fechaHoy = obtenerFechaHoyISO();
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

function cargarAvancesCampana(mes, anio) {
    fetch(`?handler=ResumenCampana&mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('campTotalClientes').innerText = data.totalClientes;
            document.getElementById('campEncuestasFin').innerText = data.encuestasFinalizadas;
            document.getElementById('campSeguimientoPend').innerText = data.seguimientoPendiente;
            document.getElementById('campEncuestasCurso').innerText = data.encuestasEnCurso;
            document.getElementById('campPorcentaje').innerText = data.porcentaje + '%';
            document.getElementById('campContactadosHoy').innerText = data.contactadosHoy;

            document.getElementById('printCampTotal').innerText = data.totalClientes;
            document.getElementById('printCampFin').innerText = data.encuestasFinalizadas;
            document.getElementById('printCampPend').innerText = data.seguimientoPendiente;
            document.getElementById('printCampCurso').innerText = data.encuestasEnCurso;
            document.getElementById('printCampPorcentaje').innerText = data.porcentaje + '%';
            document.getElementById('printCampContactados').innerText = data.contactadosHoy;
        });
}

function aplicarColoresTiposTarea() {
    // Paleta con relleno sólido elegante, bordes definidos y texto blanco (#ffffff)
    const colores = [
        { bg: '#0f3d61', border: '#1d6fa5', color: '#ffffff' }, // Azul (Red)
        { bg: '#3d2b0f', border: '#855b18', color: '#ffffff' }, // Ámbar (Interno)
        { bg: '#0f4229', border: '#1b7a4d', color: '#ffffff' }, // Verde (Plan de Respaldos)
        { bg: '#3b1f52', border: '#6b3ba4', color: '#ffffff' }, // Morado (Mantenimiento)
        { bg: '#521f3a', border: '#942b65', color: '#ffffff' }, // Rosa (Licenciamiento)
        { bg: '#0f4044', border: '#166e75', color: '#ffffff' }  // Cyan
    ];

    const mapa = {};
    let colorIndex = 0;

    document.querySelectorAll('.badge-tipo-tabla').forEach(badge => {
        const nombre = badge.innerText.trim();
        if (!mapa[nombre]) {
            mapa[nombre] = colores[colorIndex % colores.length];
            colorIndex++;
        }
        const config = mapa[nombre];
        badge.style.backgroundColor = config.bg;
        badge.style.borderColor = config.border;
        badge.style.color = config.color;
        badge.style.borderStyle = 'solid';
        badge.style.borderWidth = '1px';
    });
}

function sincronizarScrollbars() {
    const tableContainer = document.getElementById('scrollTableContainer');
    const topContainer = document.getElementById('scrollTopContainer');
    const topDummy = document.getElementById('scrollTopDummy');

    if (!tableContainer || !topContainer || !topDummy) return;

    if (tableContainer.scrollWidth > tableContainer.clientWidth) {
        topContainer.style.display = 'block';
        topDummy.style.width = tableContainer.scrollWidth + 'px';

        topContainer.onscroll = function () {
            tableContainer.scrollLeft = topContainer.scrollLeft;
        };
        tableContainer.onscroll = function () {
            topContainer.scrollLeft = tableContainer.scrollLeft;
        };
    } else {
        topContainer.style.display = 'none';
    }
}

function abrirVistaPreviaImpresionTareas() {
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

    const switchCampana = document.getElementById('switchCampanaRenovacion');
    const printCampanaContainer = document.getElementById('printCampanaContainer');
    const ddlMes = document.getElementById('ddlMesCampana');
    const ddlAnio = document.getElementById('ddlAnioCampana');

    if (switchCampana && switchCampana.checked) {
        //const textoMesAnio = ddlMesAnio ? ddlMesAnio.options[ddlMesAnio.selectedIndex].text : '';
        const textoMes = ddlMes ? ddlMes.options[ddlMes.selectedIndex].text : '';
        const textoAnio = ddlAnio ? ddlAnio.options[ddlAnio.selectedIndex].text : '';
        document.getElementById('printCampanaTitulo').innerText = `Avances Campaña de Renovación - ${textoMes} ${textoAnio}`;
        if (printCampanaContainer) printCampanaContainer.classList.remove('d-none');
    } else {
        if (printCampanaContainer) printCampanaContainer.classList.add('d-none');
    }

    const tbodyPrint = document.getElementById('tbodyTareasPrint');
    const filasOriginales = document.querySelectorAll('#tablaTareasOriginal tbody tr.fila-tarea:not(.d-none)');

    if (tbodyPrint) {
        tbodyPrint.innerHTML = '';

        if (filasOriginales.length === 0) {
            tbodyPrint.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">No hay tareas para mostrar en el reporte.</td></tr>';
        } else {
            filasOriginales.forEach(tr => {
                const index = tr.querySelector('.text-index')?.innerText.trim() || '-';
                const tarea = tr.querySelector('.text-tarea')?.innerText.trim() || '-';
                const tipo = tr.querySelector('.text-tipo')?.innerText.trim() || '-';
                const asignado = tr.querySelector('.text-asignado')?.innerText.trim() || '-';
                const fechaMax = tr.querySelector('.text-fechasolicitud')?.innerText.trim() || '-';
                const fechaReal = tr.querySelector('.text-fechareal')?.innerText.trim() || '-';
                
                // Intenta obtener el objetivo desde el elemento con la clase .text-objetivo o desde el atributo data-objetivo de la fila
                const elemObjetivo = tr.querySelector('.text-objetivo');
                const objetivo = elemObjetivo ? elemObjetivo.innerText.trim() : (tr.getAttribute('data-objetivo') || '-');

                const elemObs = tr.querySelector('.text-obs');
                const obs = elemObs ? (elemObs.title || elemObs.innerText.trim()) : '-';
                const selectEst = tr.querySelector('.ddl-estatus-tabla');
                const estatusText = selectEst ? selectEst.value : 'Pendiente';

                const badgeClass = estatusText === 'Resuelta' ? 'badge-print-cerrado' : 'badge-print-encurso';

                const newTr = document.createElement('tr');
                newTr.innerHTML = `
                    <td class="text-center">${index}</td>
                    <td class="fw-bold text-start">${tarea}</td>
                    <td class="text-center">${tipo}</td>
                    <td class="text-start">${asignado}</td>
                    <td class="text-center">${fechaMax}</td>
                    <td class="text-center">${fechaReal}</td>
                    <td class="text-start col-texto-largo">${objetivo}</td>
                    <td class="col-solucion text-start">${obs}</td>
                    <td class="text-center"><span class="${badgeClass}">${estatusText}</span></td>
                `;
                tbodyPrint.appendChild(newTr);
            });
        }
    }

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

    const padreOriginal = seccion.parentNode;
    document.body.appendChild(seccion);

    window.print();

    setTimeout(function () {
        padreOriginal.appendChild(seccion);
        document.title = tituloAnterior;
    }, 500);
}