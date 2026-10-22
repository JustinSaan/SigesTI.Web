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

    // 3. Switch de Comentarios Adicionales
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

    // 4. Switch de Campaña de Renovación y combobox de Mes / Año
    const switchCampana = document.getElementById('switchCampanaRenovacion');
    if (switchCampana) {
        switchCampana.addEventListener('change', function () {
            const panel = document.getElementById('panelCampanaRenovacion');
            if (panel) {
                if (this.checked) {
                    panel.classList.remove('d-none');
                    actualizarAvances();
                } else {
                    panel.classList.add('d-none');
                }
            }
        });
    }

    const ddlMes = document.getElementById('ddlMesCampana');
    if (ddlMes) {
        ddlMes.addEventListener('change', actualizarAvances);
    }

    const ddlAnio = document.getElementById('ddlAnioCampana');
    if (ddlAnio) {
        ddlAnio.addEventListener('change', actualizarAvances);
    }

    // 5. Agregar nuevo tipo de tarea
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

    // 6. Submit Formulario Modal
    const formTarea = document.getElementById('formTarea');
    if (formTarea) {
        formTarea.addEventListener('submit', guardarTareaHandler);
    }

    // 7. Clics en Filas (Editar Tarea)
    document.querySelectorAll('.fila-tarea').forEach(row => {
        row.addEventListener('click', function (e) {
            if (e.target.closest('select') || e.target.closest('button')) return;
            const id = this.getAttribute('data-id');
            if (id) abrirModalTarea(id);
        });
    });

    // 8. Botones Editar y Eliminar
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

    // 9. Cambio de Estatus en la Tabla (se guarda el valor anterior para regresarlo si falla)
    document.querySelectorAll('.ddl-estatus-tabla').forEach(select => {
        select.dataset.anterior = select.value;
        aplicarEstiloSelectEstatus(select);
        select.addEventListener('change', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            cambiarEstatusTarea(id, this.value, this);
        });
    });

    // 10. Comentarios Adicionales
    cargarSoportesDelDia();
    const txtAreaSoportes = document.getElementById('txtSoportesInternos');
    if (txtAreaSoportes) {
        txtAreaSoportes.addEventListener('blur', guardarSoportesAuto);
    }

    // 11. Filtros Automáticos
    document.querySelectorAll('.filtro-auto').forEach(input => {
        input.addEventListener('change', aplicarFiltrosTabla);
        input.addEventListener('input', aplicarFiltrosTabla);
    });

    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }

    aplicarFiltrosTabla();

    // 12. Impresión Reporte
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

function mostrarErrorConexion() {
    if (typeof Swal !== 'undefined') {
        Swal.fire('Error de conexión', 'No se pudo comunicar con el servidor. Intenta de nuevo.', 'error');
    }
}

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

function limpiarFiltros() {
    const fSolicitud = document.getElementById('filtroFechaSolicitud');
    const fRealizacion = document.getElementById('filtroFechaRealizacion');

    // Las fechas filtran en el servidor, así que hay que recargar la página sin ellas
    if ((fSolicitud && fSolicitud.value) || (fRealizacion && fRealizacion.value)) {
        window.location.href = window.location.pathname;
        return;
    }

    const fGeneral = document.getElementById('filtroGeneral');
    if (fGeneral) fGeneral.value = '';
    aplicarFiltrosTabla();
}

function aplicarFiltrosTabla() {
    const fSolicitud = (document.getElementById('filtroFechaSolicitud')?.value || '').trim();
    const fRealizacion = (document.getElementById('filtroFechaRealizacion')?.value || '').trim();
    const fEstatus = (document.getElementById('filtroEstatus')?.value || '').trim().toLowerCase();
    const fGeneral = (document.getElementById('filtroGeneral')?.value || '').trim().toLowerCase();

    const hoy = obtenerFechaHoyISO();
    const hayFechasActivas = fSolicitud !== '' || fRealizacion !== '';

    const filas = document.querySelectorAll('#tablaTareasOriginal tbody tr.fila-tarea');
    let visibles = 0;

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
            visibles++;
        } else {
            row.classList.add('d-none');
        }
    });

    // Mensaje cuando hay tareas pero ninguna coincide con los filtros
    const rowSinResultados = document.getElementById('rowSinResultados');
    if (rowSinResultados) {
        if (filas.length > 0 && visibles === 0) rowSinResultados.classList.remove('d-none');
        else rowSinResultados.classList.add('d-none');
    }

    if (typeof sincronizarScrollbars === 'function') sincronizarScrollbars();
}

function actualizarContadorPendientes() {
    const badge = document.getElementById('badgeContadorTareas');
    if (!badge) return;

    let pendientes = 0;
    document.querySelectorAll('.ddl-estatus-tabla').forEach(select => {
        if (select.value === 'Pendiente' || select.value === 'En Curso') pendientes++;
    });

    badge.innerText = `Pendientes: ${pendientes}`;
}

function cambiarEstatusTarea(id, nuevoEstatus, selectElement) {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    const formData = new FormData();
    formData.append('id', id);
    formData.append('nuevoEstatus', nuevoEstatus);

    // Si algo falla, el combobox regresa al estatus que tenía
    const regresarEstatus = () => {
        selectElement.value = selectElement.dataset.anterior;
        aplicarEstiloSelectEstatus(selectElement);
    };

    fetch('?handler=CambiarEstatus', {
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
            selectElement.dataset.anterior = nuevoEstatus;
            aplicarEstiloSelectEstatus(selectElement);

            const row = selectElement.closest('tr');
            if (row) {
                const tdFechaReal = row.querySelector('.text-fechareal');
                if (tdFechaReal) {
                    tdFechaReal.innerText = data.fechaRealizacion;
                    tdFechaReal.setAttribute('data-fecha', data.fechaRealizacionIso);
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

            actualizarContadorPendientes();
            aplicarFiltrosTabla();
        } else {
            regresarEstatus();
            if (typeof Swal !== 'undefined') {
                Swal.fire('Error', data.message, 'error');
            }
        }
    })
    .catch(() => {
        regresarEstatus();
        mostrarErrorConexion();
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

function renderizarHistorial(contenedor, texto) {
    contenedor.innerHTML = '';

    if (!texto || texto.trim() === '') {
        contenedor.innerHTML = '<span class="text-muted small fst-italic">No hay observaciones registradas.</span>';
        return;
    }

    // Cada comentario empieza con "Agregado el: {fecha} Por: {usuario}" seguido del texto
    const bloques = texto.split(/(?=Agregado el: )/).map(b => b.trim()).filter(b => b !== '');

    bloques.forEach(bloque => {
        const item = document.createElement('div');
        item.className = 'comentario-item';

        let cuerpo = bloque;
        const partes = bloque.match(/^Agregado el: (.+?) Por: (.*)\n?([\s\S]*)$/);

        if (partes) {
            const cabecera = document.createElement('div');
            cabecera.className = 'comentario-cabecera';

            const autor = document.createElement('span');
            autor.className = 'comentario-autor';
            autor.innerHTML = '<i class="bi bi-person-circle me-1"></i>';
            autor.append(partes[2].trim() || 'Sin usuario');

            const fecha = document.createElement('span');
            fecha.className = 'comentario-fecha';
            fecha.textContent = partes[1];

            cabecera.append(autor, fecha);
            item.appendChild(cabecera);
            cuerpo = partes[3].trim();
        }

        const textoComentario = document.createElement('div');
        textoComentario.className = 'comentario-texto';
        textoComentario.textContent = cuerpo;
        item.appendChild(textoComentario);

        contenedor.appendChild(item);
    });
}

// Si la tarea es antigua y la persona asignada no es de Soporte Técnico, se agrega como opción temporal para no perderla
function establecerPersonaAsignada(id, nombre) {
    const ddlUsuario = document.getElementById('ddlUsuario');
    if (!ddlUsuario) return;

    const valor = String(id);
    const existe = Array.from(ddlUsuario.options).some(o => o.value === valor);

    if (!existe && nombre) {
        const opcion = new Option(`${nombre} (otra área)`, valor);
        opcion.dataset.temporal = 'true';
        ddlUsuario.add(opcion);
    }

    ddlUsuario.value = valor;
}

function abrirModalTarea(id) {
    const form = document.getElementById('formTarea');
    if (form) form.reset();

    document.querySelectorAll('#ddlUsuario option[data-temporal="true"]').forEach(o => o.remove());

    document.getElementById('tareaId').value = id;
    const divNuevoTipo = document.getElementById('divNuevoTipo');
    if (divNuevoTipo) divNuevoTipo.classList.add('d-none');

    const txtNuevoComentario = document.getElementById('txtNuevoComentario');
    if (txtNuevoComentario) txtNuevoComentario.value = '';

    const modalElem = document.getElementById('modalTarea');
    const titulo = document.getElementById('modalTareaTitulo');
    const icono = document.getElementById('modalTareaIcono');
    const subtitulo = document.getElementById('modalTareaSubtitulo');
    const contHistorial = document.getElementById('contenedorHistorialComentarios');

    if (parseInt(id) === 0) {
        titulo.innerText = 'Nueva Tarea Programada';
        icono.className = 'bi bi-plus-circle';
        subtitulo.innerText = 'Completa los datos para registrar la tarea';

        const inputFecha = document.getElementById('txtFechaSolicitud');
        if (inputFecha) inputFecha.value = obtenerFechaHoyISO();

        const ddlEst = document.getElementById('ddlEstatusModal');
        if (ddlEst) ddlEst.value = 'Pendiente';

        evaluarEstadoFechaRealizacion();

        if (contHistorial) renderizarHistorial(contHistorial, '');

        const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
        modal.show();
    } else {
        titulo.innerText = 'Editar Tarea Programada';
        icono.className = 'bi bi-pencil-square';
        subtitulo.innerText = '';

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
                establecerPersonaAsignada(data.personaAsignadaId, data.personaAsignadaNombre);
                if (document.getElementById('txtFechaSolicitud')) {
                    document.getElementById('txtFechaSolicitud').value = data.fechaSolicitud;
                }
                document.getElementById('txtObjetivo').value = data.objetivo || '';

                const ddlEst = document.getElementById('ddlEstatusModal');
                if (ddlEst) ddlEst.value = data.estatus || 'Pendiente';

                const txtFechaReal = document.getElementById('txtFechaRealizacion');
                if (txtFechaReal) txtFechaReal.value = data.fechaRealizacion || '';

                evaluarEstadoFechaRealizacion();

                const [anio, mes, dia] = data.fechaSolicitud.split('-');
                subtitulo.innerText = `Solicitada el ${dia}/${mes}/${anio} por ${data.personaSolicitante || 'Sin Especificar'}`;

                if (contHistorial) renderizarHistorial(contHistorial, data.observaciones);

                const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
                modal.show();
            })
            .catch(mostrarErrorConexion);
    }
}

function guardarTareaHandler(e) {
    e.preventDefault();

    // Si eligió "+ Agregar tipo..." tiene que escribir el nombre del nuevo tipo
    const ddlTipo = document.getElementById('ddlTipo');
    const txtNuevoTipo = document.getElementById('txtNuevoTipo');
    if (ddlTipo && ddlTipo.value === '-1' && txtNuevoTipo && txtNuevoTipo.value.trim() === '') {
        if (typeof Swal !== 'undefined') {
            Swal.fire('Falta el tipo', 'Escribe el nombre del nuevo tipo de tarea.', 'warning')
                .then(() => txtNuevoTipo.focus());
        }
        return;
    }

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
    })
    .catch(() => {
        if (btnSubmit) btnSubmit.disabled = false;
        mostrarErrorConexion();
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
    })
    .catch(mostrarErrorConexion);
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

function actualizarAvances() {
    const ddlMes = document.getElementById('ddlMesCampana');
    const ddlAnio = document.getElementById('ddlAnioCampana');
    if (ddlMes && ddlAnio) {
        cargarAvancesCampana(ddlMes.value, ddlAnio.value);
    }
}

function cargarAvancesCampana(mes, anio) {
    fetch(`?handler=ResumenCampana&mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {
            if (data.redirect) {
                window.location.href = data.redirect;
                return;
            }

            document.getElementById('campTotalClientes').innerText = data.totalClientes;
            document.getElementById('campEncuestasFin').innerText = data.encuestasFinalizadas;
            document.getElementById('campSeguimientoPend').innerText = data.seguimientoPendiente;
            document.getElementById('campEncuestasCurso').innerText = data.encuestasEnCurso;
            document.getElementById('campPorcentaje').innerText = data.porcentaje + '%';
            document.getElementById('campContactadosHoy').innerText = data.contactadosHoy;
            document.getElementById('barraAvanceCampana').style.width = Math.min(data.porcentaje, 100) + '%';

            document.getElementById('printCampTotal').innerText = data.totalClientes;
            document.getElementById('printCampFin').innerText = data.encuestasFinalizadas;
            document.getElementById('printCampPend').innerText = data.seguimientoPendiente;
            document.getElementById('printCampCurso').innerText = data.encuestasEnCurso;
            document.getElementById('printCampPorcentaje').innerText = data.porcentaje + '%';
            document.getElementById('printCampContactados').innerText = data.contactadosHoy;
        })
        .catch(mostrarErrorConexion);
}

function aplicarColoresTiposTarea() {
    // Tipos conocidos con su color fijo
    const coloresFijos = {
        'Red': { bg: '#0f3d61', border: '#1d6fa5' },
        'Interno': { bg: '#3d2b0f', border: '#855b18' },
        'Plan de Respaldos': { bg: '#0f4229', border: '#1b7a4d' },
        'Mantenimiento': { bg: '#3b1f52', border: '#6b3ba4' },
        'Licenciamiento': { bg: '#521f3a', border: '#942b65' }
    };

    // Tipos nuevos: el color sale del nombre, así siempre les toca el mismo
    const coloresExtra = [
        { bg: '#0f4044', border: '#166e75' }, // Cyan
        { bg: '#1e1b4b', border: '#4338ca' }, // Índigo
        { bg: '#3a3f0f', border: '#6b7a1b' }, // Oliva
        { bg: '#4a1d0f', border: '#9a3412' }, // Óxido
        { bg: '#1e293b', border: '#64748b' }, // Gris pizarra
        { bg: '#0c3b2e', border: '#0f766e' }  // Verde azulado
    ];

    document.querySelectorAll('.badge-tipo-tabla').forEach(badge => {
        const nombre = badge.innerText.trim();
        let config = coloresFijos[nombre];

        if (!config) {
            let suma = 0;
            for (const letra of nombre) suma += letra.charCodeAt(0);
            config = coloresExtra[suma % coloresExtra.length];
        }

        // 'important' para ganarle a ".glass-panel span { background-color: transparent !important }"
        badge.style.setProperty('background-color', config.bg, 'important');
        badge.style.setProperty('border-color', config.border, 'important');
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
        const textoMes = ddlMes ? ddlMes.options[ddlMes.selectedIndex].text : '';
        const textoAnio = ddlAnio ? ddlAnio.options[ddlAnio.selectedIndex].text : '';
        document.getElementById('printCampanaTitulo').innerText = `Avances Campaña de Renovación - ${textoMes} ${textoAnio}`;
        if (printCampanaContainer) printCampanaContainer.classList.remove('d-none');
    } else {
        if (printCampanaContainer) printCampanaContainer.classList.add('d-none');
    }

    const tbodyPrint = document.getElementById('tbodyTareasPrint');
    const filasOriginales = document.querySelectorAll('#tablaTareasOriginal tbody tr.fila-tarea:not(.d-none)');

    // Resumen del reporte: se cuenta cada estatus de las tareas que se van a imprimir
    const conteo = { 'Pendiente': 0, 'En Curso': 0, 'Resuelta': 0 };
    filasOriginales.forEach(tr => {
        const estatus = tr.querySelector('.ddl-estatus-tabla')?.value || 'Pendiente';
        if (conteo[estatus] !== undefined) conteo[estatus]++;
    });

    document.getElementById('repTotalTareas').innerText = filasOriginales.length;
    document.getElementById('repPendientes').innerText = conteo['Pendiente'];
    document.getElementById('repEnCurso').innerText = conteo['En Curso'];
    document.getElementById('repResueltas').innerText = conteo['Resuelta'];

    if (tbodyPrint) {
        tbodyPrint.innerHTML = '';

        if (filasOriginales.length === 0) {
            tbodyPrint.innerHTML = '<tr><td colspan="9" class="rep-sin-tareas">No hay tareas para mostrar en el reporte.</td></tr>';
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

                let badgeClass = 'badge-print-pendiente';
                if (estatusText === 'Resuelta') badgeClass = 'badge-print-cerrado';
                else if (estatusText === 'En Curso') badgeClass = 'badge-print-encurso';

                // Se usa textContent para que el texto escrito por el usuario nunca se interprete como HTML
                const celdas = [
                    [index, 'rep-col-num'],
                    [tarea, 'rep-col-tarea'],
                    [tipo, ''],
                    [asignado, ''],
                    [fechaMax, ''],
                    [fechaReal, ''],
                    [objetivo, 'rep-col-texto'],
                    [obs, 'rep-col-texto']
                ];

                const newTr = document.createElement('tr');
                celdas.forEach(([texto, clase]) => {
                    const td = document.createElement('td');
                    td.className = clase;
                    td.textContent = texto;
                    newTr.appendChild(td);
                });

                const tdEstatus = document.createElement('td');
                const badge = document.createElement('span');
                badge.className = badgeClass;
                badge.textContent = estatusText;
                tdEstatus.appendChild(badge);
                newTr.appendChild(tdEstatus);

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
