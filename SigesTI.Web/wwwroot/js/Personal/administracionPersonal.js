"use strict";

// ==========================================
// 1. TOKEN Y UTILIDADES
// ==========================================
function getAntiForgeryToken() {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    return tokenInput ? tokenInput.value : '';
}

// Evita que un nombre con caracteres especiales se interprete como HTML en las alertas
function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

async function enviarPost(url, datos) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': getAntiForgeryToken() },
        body: datos === undefined ? null : JSON.stringify(datos)
    });

    if (!response.ok) {
        return { success: false, message: 'El servidor respondió con un error. Intenta de nuevo.' };
    }
    return await response.json();
}

document.addEventListener('DOMContentLoaded', function () {
    inicializarDragAndDrop();
});

// ==========================================
// 2. MODAL REGISTRAR / EDITAR
// ==========================================
function abrirModalNuevoPersonal() {
    llenarModalPersonal({ id: 0, nombre: '', area: '', puesto: '', correo: '', activo: 'true', responsable: 'false', usuario: '' });

    document.getElementById('tituloModalPersonal').textContent = 'Registrar Personal';
    document.getElementById('subtituloModalPersonal').textContent = 'Nuevo integrante del personal';
    document.getElementById('iconoModalPersonal').className = 'bi bi-person-plus-fill';

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPersonal')).show();
}

// Los datos se toman de los data-* de la fila, así no hace falta ir al servidor
function abrirModalEditarPersonal(boton) {
    const datos = boton.closest('tr').dataset;
    llenarModalPersonal(datos);

    document.getElementById('tituloModalPersonal').textContent = 'Editar Personal';
    document.getElementById('subtituloModalPersonal').textContent = datos.nombre;
    document.getElementById('iconoModalPersonal').className = 'bi bi-pencil-square';

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPersonal')).show();
}

function llenarModalPersonal(datos) {
    document.getElementById('txtPersonalId').value = datos.id;
    document.getElementById('txtNombre').value = datos.nombre;
    document.getElementById('selectArea').value = datos.area;
    document.getElementById('txtPuesto').value = datos.puesto;
    document.getElementById('txtCorreo').value = datos.correo;
    document.getElementById('selectActivo').value = datos.activo;
    document.getElementById('chkResponsable').checked = datos.responsable === 'true';
    document.getElementById('selectUsuario').value = datos.usuario || '';
}

async function guardarPersonal() {
    const datos = {
        id: parseInt(document.getElementById('txtPersonalId').value) || 0,
        nombre: document.getElementById('txtNombre').value.trim(),
        area: document.getElementById('selectArea').value,
        puesto: document.getElementById('txtPuesto').value.trim(),
        correo: document.getElementById('txtCorreo').value.trim(),
        activo: document.getElementById('selectActivo').value === 'true',
        esResponsable: document.getElementById('chkResponsable').checked,
        idUsuario: parseInt(document.getElementById('selectUsuario').value) || null
    };

    if (!datos.nombre || !datos.area || !datos.puesto || !datos.correo) {
        mostrarAdvertencia('Nombre, área, puesto y correo son obligatorios.', 'Faltan datos');
        return;
    }

    const btnGuardar = document.getElementById('btnGuardarPersonal');
    btnGuardar.disabled = true;

    try {
        const result = await enviarPost('?handler=Guardar', datos);

        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalPersonal'))?.hide();
            const mensaje = datos.id === 0 ? 'El personal se registró correctamente.' : 'Los datos del personal se actualizaron correctamente.';
            mostrarExito(mensaje, 'Guardado').then(() => location.reload());
        } else {
            mostrarError(result.message || 'No se pudo guardar.');
        }
    } catch (err) {
        mostrarError('No se pudo comunicar con el servidor. Intenta de nuevo.', 'Error de conexión');
    } finally {
        btnGuardar.disabled = false;
    }
}

// ==========================================
// 3. ELIMINAR
// ==========================================
function eliminarPersonal(boton) {
    const fila = boton.closest('tr');

    mostrarConfirmacion({
        icono: 'warning',
        titulo: '¿Eliminar personal?',
        mensaje: `¿Estás seguro de eliminar a <b>${escaparHtml(fila.dataset.nombre)}</b>? Esta acción no se puede deshacer.`,
        textoConfirmar: 'Sí, eliminar',
        alConfirmar: async function () {
            try {
                const result = await enviarPost(`?handler=Eliminar&id=${fila.dataset.id}`);

                if (result.success) {
                    mostrarExito('El personal fue eliminado correctamente.', 'Eliminado').then(() => location.reload());
                } else {
                    mostrarError(result.message || 'No se pudo eliminar.');
                }
            } catch (err) {
                mostrarError('No se pudo comunicar con el servidor. Intenta de nuevo.', 'Error de conexión');
            }
        }
    });
}

// ==========================================
// 4. DRAG & DROP (mismo funcionamiento que Plan de Respaldos)
// ==========================================
function inicializarDragAndDrop() {
    const el = document.getElementById('tablaPersonalBody');
    if (!el || typeof Sortable === 'undefined') return;

    Sortable.create(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        forceFallback: true,
        onStart: function () {
            document.body.classList.add('arrastrando-fila');
        },
        onEnd: async function (evt) {
            document.body.classList.remove('arrastrando-fila');
            if (evt.oldIndex === evt.newIndex) return;

            const ids = Array.from(el.querySelectorAll('tr[data-id]')).map(tr => parseInt(tr.dataset.id));

            try {
                await enviarPost('?handler=GuardarOrden', ids);
            } catch (err) {
                console.error('Error al guardar el nuevo orden:', err);
            }
        }
    });
}
