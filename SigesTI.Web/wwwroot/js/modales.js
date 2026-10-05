"use strict";

/* ==========================================================================
   VARIABLES GLOBALES PROTEGIDAS (PREVIENEN SINTAX ERROR POR CARGA DOBLE)
   ========================================================================== */

if (typeof window.paginaUsuarios === "undefined") {
    window.paginaUsuarios = 1;
}
if (typeof window.paginaBitacora === "undefined") {
    window.paginaBitacora = 1;
}

/* ==========================================================================
   MODALES GENERALES DEL SISTEMA
   ========================================================================== */

function abrirModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.classList.add("show");
    }
}

function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.classList.remove("show");
    }
}

/* ==========================================================================
   MÓDULO CUENTA
   ========================================================================== */

function abrirModalNuevoUsuario() {
    abrirModal("modalNuevoUsuario");
}

function cerrarModalNuevoUsuario() {
    cerrarModal("modalNuevoUsuario");
}

function abrirModalEditarUsuario(boton) {
    const id = boton.dataset.id || "";
    const nombre = boton.dataset.nombre || "";
    const usuario = boton.dataset.usuario || "";
    const correo = boton.dataset.correo || "";
    const rol = boton.dataset.rol || "";
    const activo = boton.dataset.activo === "true";

    document.getElementById("editIdUsuario").value = id;
    document.getElementById("editNombreCompleto").value = nombre;
    document.getElementById("editNombreUsuario").value = usuario;
    document.getElementById("editCorreo").value = correo;
    document.getElementById("editRol").value = rol;
    document.getElementById("editActivo").checked = activo;

    abrirModal("modalEditarUsuario");
}

function cerrarModalEditarUsuario() {
    cerrarModal("modalEditarUsuario");
}

function cambiarVisibilidadPassword(boton) {
    const idInput = boton.dataset.input;
    const input = document.getElementById(idInput);
    const icono = boton.querySelector("i");

    if (!input || !icono) return;

    if (input.type === "password") {
        input.type = "text";
        icono.classList.remove("bi-eye");
        icono.classList.add("bi-eye-slash");
    } else {
        input.type = "password";
        icono.classList.remove("bi-eye-slash");
        icono.classList.add("bi-eye");
    }
}

function validarPasswordTemporal(evento) {
    const password = document.getElementById("passwordTemporal");
    const confirmacion = document.getElementById("confirmarPasswordTemporal");

    if (!password || !confirmacion) {
        evento.preventDefault();
        mostrarError("No se encontraron los campos de contraseña.");
        return;
    }

    if (password.value !== confirmacion.value) {
        evento.preventDefault();
        mostrarError(
            "La contraseña temporal y la confirmación no coinciden.",
            "Contraseñas diferentes"
        );
        return;
    }

    if (password.value.length < 8) {
        evento.preventDefault();
        mostrarAdvertencia(
            "La contraseña temporal debe tener al menos 8 caracteres.",
            "Contraseña demasiado corta"
        );
    }
}

function confirmarEliminarUsuario(boton) {
    const idUsuario = boton.dataset.id;
    const nombreUsuario = boton.dataset.usuario;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Eliminar usuario?",
        mensaje: "Se eliminará la cuenta <b>" + nombreUsuario + "</b>.<br><br>La información histórica se conservará.",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("eliminarIdUsuario").value = idUsuario;
            document.getElementById("formEliminarUsuario").submit();
        }
    });
}

function confirmarRestablecerPassword(boton) {
    const idUsuario = boton.dataset.id;
    const nombreUsuario = boton.dataset.usuario;

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Restablecer contraseña?",
        mensaje: "Se generará una nueva contraseña temporal para <b>" + nombreUsuario + "</b>.",
        textoConfirmar: "Sí, restablecer",
        textoCancelar: "Cancelar",
        alConfirmar: function () {
            document.getElementById("passwordIdUsuario").value = idUsuario;
            document.getElementById("formRestablecerPassword").submit();
        }
    });
}

function filtrarUsuarios() {
    const buscador = document.getElementById("buscarUsuario");
    const filas = document.querySelectorAll("#tablaUsuarios tbody tr");

    if (!buscador) return;

    const texto = buscador.value.trim().toLocaleLowerCase("es-MX");
    let totalVisibles = 0;

    filas.forEach(function (fila) {
        const columnas = fila.querySelectorAll("td");
        if (columnas.length < 2) return;

        const contenido = fila.innerText.toLocaleLowerCase("es-MX");
        const mostrar = contenido.includes(texto);

        fila.style.display = mostrar ? "" : "none";
        if (mostrar) totalVisibles++;
    });

    const resultado = document.getElementById("resultadoUsuarios");
    if (resultado) {
        resultado.textContent = "Mostrando " + totalVisibles + (totalVisibles === 1 ? " usuario" : " usuarios");
    }
}

function abrirModalDesdeServidor() {
    const abrirNuevo = document.getElementById("abrirModalNuevo");
    if (abrirNuevo && abrirNuevo.value.toLowerCase() === "true") {
        abrirModalNuevoUsuario();
    }
}

/* ==========================================================================
   TABLAS DEL MÓDULO CUENTA Y BITÁCORA (CORREGIDAS VARIABLES GLOBALES)
   ========================================================================== */

function normalizarTexto(texto) {
    return (texto || "").toString().trim().toLocaleLowerCase("es-MX");
}

function crearPaginacion(contenedorId, paginaActual, totalPaginas, cambiarPagina) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = "";
    if (totalPaginas <= 1) return;

    const botonAnterior = document.createElement("button");
    botonAnterior.type = "button";
    botonAnterior.innerHTML = "&lsaquo;";
    botonAnterior.disabled = paginaActual === 1;
    botonAnterior.addEventListener("click", function () {
        cambiarPagina(paginaActual - 1);
    });
    contenedor.appendChild(botonAnterior);

    for (let numero = 1; numero <= totalPaginas; numero++) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = numero;
        if (numero === paginaActual) boton.classList.add("active");
        boton.addEventListener("click", function () {
            cambiarPagina(numero);
        });
        contenedor.appendChild(boton);
    }

    const botonSiguiente = document.createElement("button");
    botonSiguiente.type = "button";
    botonSiguiente.innerHTML = "&rsaquo;";
    botonSiguiente.disabled = paginaActual === totalPaginas;
    botonSiguiente.addEventListener("click", function () {
        cambiarPagina(paginaActual + 1);
    });
    contenedor.appendChild(botonSiguiente);
}

function actualizarTablaUsuarios() {
    const buscador = document.getElementById("buscarUsuario");
    const selectorCantidad = document.getElementById("cantidadUsuarios");
    const resultado = document.getElementById("resultadoUsuarios");
    const filas = Array.from(document.querySelectorAll(".fila-usuario"));

    if (!selectorCantidad) return;

    const textoBusqueda = normalizarTexto(buscador ? buscador.value : "");
    const cantidad = parseInt(selectorCantidad.value, 10);

    const filasFiltradas = filas.filter(function (fila) {
        return normalizarTexto(fila.innerText).includes(textoBusqueda);
    });

    const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / cantidad));
    if (window.paginaUsuarios > totalPaginas) window.paginaUsuarios = totalPaginas;

    const inicio = (window.paginaUsuarios - 1) * cantidad;
    const fin = inicio + cantidad;

    filas.forEach(fila => fila.style.display = "none");
    filasFiltradas.slice(inicio, fin).forEach(fila => fila.style.display = "");

    if (resultado) {
        if (filasFiltradas.length === 0) {
            resultado.textContent = "No se encontraron usuarios";
        } else {
            resultado.textContent = `Mostrando ${inicio + 1} a ${Math.min(fin, filasFiltradas.length)} de ${filasFiltradas.length} usuarios`;
        }
    }

    crearPaginacion("paginacionUsuarios", window.paginaUsuarios, totalPaginas, function (pagina) {
        window.paginaUsuarios = pagina;
        actualizarTablaUsuarios();
    });
}

function actualizarTablaBitacora() {
    const nombre = normalizarTexto(document.getElementById("filtroNombre")?.value);
    const modulo = normalizarTexto(document.getElementById("filtroModulo")?.value);
    const accion = normalizarTexto(document.getElementById("filtroAccion")?.value);
    const fechaInicio = document.getElementById("filtroFechaInicio")?.value || "";
    const fechaFin = document.getElementById("filtroFechaFin")?.value || "";
    const selectorCantidad = document.getElementById("cantidadBitacora");
    const resultado = document.getElementById("resultadoBitacora");
    const filas = Array.from(document.querySelectorAll(".fila-bitacora"));

    if (!selectorCantidad) return;

    const cantidad = parseInt(selectorCantidad.value, 10);

    const filasFiltradas = filas.filter(function (fila) {
        const nombreFila = normalizarTexto(fila.dataset.nombre);
        const moduloFila = normalizarTexto(fila.dataset.modulo);
        const accionFila = normalizarTexto(fila.dataset.accion);
        const fechaFila = fila.dataset.fecha || "";

        return (!nombre || nombreFila === nombre) &&
            (!modulo || moduloFila === modulo) &&
            (!accion || accionFila === accion) &&
            (!fechaInicio || fechaFila >= fechaInicio) &&
            (!fechaFin || fechaFila <= fechaFin);
    });

    const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / cantidad));
    if (window.paginaBitacora > totalPaginas) window.paginaBitacora = totalPaginas;

    const inicio = (window.paginaBitacora - 1) * cantidad;
    const fin = inicio + cantidad;

    filas.forEach(fila => fila.style.display = "none");
    filasFiltradas.slice(inicio, fin).forEach(fila => fila.style.display = "");

    if (resultado) {
        if (filasFiltradas.length === 0) {
            resultado.textContent = "No se encontraron registros";
        } else {
            resultado.textContent = `Mostrando ${inicio + 1} a ${Math.min(fin, filasFiltradas.length)} de ${filasFiltradas.length} registros`;
        }
    }

    crearPaginacion("paginacionBitacora", window.paginaBitacora, totalPaginas, function (pagina) {
        window.paginaBitacora = pagina;
        actualizarTablaBitacora();
    });
}

function limpiarFiltrosBitacora() {
    ["filtroNombre", "filtroModulo", "filtroAccion", "filtroFechaInicio", "filtroFechaFin"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });
    window.paginaBitacora = 1;
    actualizarTablaBitacora();
}

/* ==========================================================================
   EVENTOS GENERALES
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const btnNuevo = document.getElementById("btnNuevoUsuario");
    const buscador = document.getElementById("buscarUsuario");
    const formNuevo = document.getElementById("formNuevoUsuario");
    const formReporteBitacora = document.getElementById("formReporteBitacora");
    const cantidadUsuarios = document.getElementById("cantidadUsuarios");

    if (buscador) {
        buscador.addEventListener("input", function () {
            window.paginaUsuarios = 1;
            actualizarTablaUsuarios();
        });
    }

    if (cantidadUsuarios) {
        cantidadUsuarios.addEventListener("change", function () {
            window.paginaUsuarios = 1;
            actualizarTablaUsuarios();
        });
    }

    ["filtroNombre", "filtroModulo", "filtroAccion", "filtroFechaInicio", "filtroFechaFin"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener("change", function () {
                window.paginaBitacora = 1;
                actualizarTablaBitacora();
            });
        }
    });

    const cantidadBitacora = document.getElementById("cantidadBitacora");
    if (cantidadBitacora) {
        cantidadBitacora.addEventListener("change", function () {
            window.paginaBitacora = 1;
            actualizarTablaBitacora();
        });
    }

    const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltrosBitacora");
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener("click", limpiarFiltrosBitacora);
    }

    actualizarTablaUsuarios();
    actualizarTablaBitacora();

    if (formReporteBitacora) {
        formReporteBitacora.addEventListener("submit", abrirVistaPreviaReporte);
    }

    if (btnNuevo) {
        btnNuevo.addEventListener("click", abrirModalNuevoUsuario);
    }

    if (buscador) {
        buscador.addEventListener("input", filtrarUsuarios);
    }

    if (formNuevo) {
        formNuevo.addEventListener("submit", validarPasswordTemporal);
    }

    document.querySelectorAll(".js-cerrar-nuevo").forEach(boton => {
        boton.addEventListener("click", cerrarModalNuevoUsuario);
    });

    document.querySelectorAll(".js-cerrar-editar").forEach(boton => {
        boton.addEventListener("click", cerrarModalEditarUsuario);
    });

    document.querySelectorAll(".js-toggle-password").forEach(boton => {
        boton.addEventListener("click", function () {
            cambiarVisibilidadPassword(boton);
        });
    });

    document.querySelectorAll(".js-editar-usuario").forEach(boton => {
        boton.addEventListener("click", function () {
            abrirModalEditarUsuario(boton);
        });
    });

    document.querySelectorAll(".js-restablecer-password").forEach(boton => {
        boton.addEventListener("click", function () {
            confirmarRestablecerPassword(boton);
        });
    });

    document.querySelectorAll(".js-eliminar-usuario").forEach(boton => {
        boton.addEventListener("click", function () {
            confirmarEliminarUsuario(boton);
        });
    });

    abrirModalDesdeServidor();
    if (typeof mostrarMensajesServidor === "function") {
        mostrarMensajesServidor();
    }

    /* --- PERSISTENCIA Y EVENTOS MÓDULO TICKETS --- */
    const inputFecha = document.getElementById("fechaReporteConsulta");
    const txtPuntos = document.getElementById("txtPuntosRelevantes");
    const chkActividades = document.getElementById("chkActividades");
    const boxActividades = document.getElementById("boxActividades");
    const txtActividades = document.getElementById("txtSoportesInternos");
    const btnGenerar = document.getElementById("btnGenerarReporte");
    const btnExcel = document.getElementById("btnExportarExcel");

    if (inputFecha && txtPuntos) {
        const fechaActual = inputFecha.value;
        const keyPuntos = `sigesti_puntos_${fechaActual}`;
        const keyActividades = `sigesti_actividades_${fechaActual}`;
        const keyChkActividades = `sigesti_chk_actividades_${fechaActual}`;

        txtPuntos.value = localStorage.getItem(keyPuntos) || "";
        if (txtActividades) {
            txtActividades.value = localStorage.getItem(keyActividades) || "";
        }

        const chkGuardado = localStorage.getItem(keyChkActividades) === "true";
        if (chkActividades) {
            chkActividades.checked = chkGuardado;
            evaluarEstadoActividades(chkGuardado);

            chkActividades.addEventListener("change", function () {
                evaluarEstadoActividades(this.checked);
                localStorage.setItem(keyChkActividades, this.checked);
                if (!this.checked && txtActividades) {
                    txtActividades.value = "";
                    localStorage.removeItem(keyActividades);
                }
            });
        }

        txtPuntos.addEventListener("input", function () {
            localStorage.setItem(keyPuntos, this.value);
        });

        if (txtActividades) {
            txtActividades.addEventListener("input", function () {
                localStorage.setItem(keyActividades, this.value);
            });
        }

        function evaluarEstadoActividades(habilitado) {
            if (!boxActividades || !txtActividades) return;
            if (habilitado) {
                boxActividades.classList.remove("d-none");
                txtActividades.removeAttribute("disabled");
            } else {
                boxActividades.classList.add("d-none");
                txtActividades.setAttribute("disabled", "true");
            }
        }
    }

    if (btnGenerar) {
        btnGenerar.addEventListener("click", abrirVistaPreviaImpresion);
    }

    if (btnExcel) {
        btnExcel.addEventListener("click", exportarExcelLocal);
    }
});

/* ==========================================================================
   VISTA PREVIA DEL REPORTE DE BITÁCORA
   ========================================================================== */

function abrirVistaPreviaReporte() {
    abrirModal("modalVistaPreviaReporte");
}

function cerrarVistaPreviaReporte() {
    cerrarModal("modalVistaPreviaReporte");
}

function imprimirReporteBitacora() {
    const iframe = document.getElementById("iframeReporteBitacora");
    if (!iframe || !iframe.contentWindow) {
        mostrarError("No fue posible cargar la vista previa del reporte.");
        return;
    }

    const tituloAnterior = document.title;
    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const anio = fechaActual.getFullYear();
    const hora = String(fechaActual.getHours()).padStart(2, "0");
    const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
    const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

    const nombreReporte = `ReporteBitacora_${dia}${mes}${anio}${hora}${minutos}${segundos}`;

    document.title = nombreReporte;
    iframe.contentDocument.title = nombreReporte;

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(function () {
        document.title = tituloAnterior;
    }, 1500);
}

/* ==========================================================================
   MÓDULO REPORTE DE TICKETS - IMPRESIÓN Y EXPORTACIÓN EXCEL
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

// Función que extrae el nodo fuera del modal antes de imprimir para evitar hojas en blanco
function imprimirContenidoLimpio() {
    const seccion = document.getElementById("seccionImpresion");
    if (!seccion) {
        window.print();
        return;
    }

    // Mueve temporalmente el área de impresión al body principal
    const padreOriginal = seccion.parentNode;
    document.body.appendChild(seccion);

    // Lanza la impresión
    window.print();

    // Restaura la estructura original al cerrar la ventana de impresión
    setTimeout(function () {
        padreOriginal.appendChild(seccion);
    }, 500);
}

function exportarExcelLocal() {
    if (typeof XLSX === "undefined") {
        console.error("La librería XLSX (SheetJS) no está cargada.");
        return;
    }

    const fecha = typeof fechaReporteActual !== 'undefined' ? fechaReporteActual : "Reporte";
    const wb = XLSX.utils.book_new();

    const dataHoja = [];

    dataHoja.push([`REPORTE DE TICKETS DIARIO ${fecha}`]);
    dataHoja.push(["SDI Cointer - Departamento de Soporte Técnico"]);
    dataHoja.push([]);

    dataHoja.push(["1. RESUMEN DE INDICADORES"]);
    const tablaInd = document.getElementById("tablaIndicadores");
    if (tablaInd) {
        const wsInd = XLSX.utils.table_to_sheet(tablaInd);
        const jsonInd = XLSX.utils.sheet_to_json(wsInd, { header: 1 });
        jsonInd.forEach(row => dataHoja.push(row));
    }
    dataHoja.push([]);

    dataHoja.push(["2. PUNTOS RELEVANTES DEL DÍA"]);
    const txtPuntos = document.getElementById("txtPuntosRelevantes")?.value || "Sin observaciones.";
    dataHoja.push([txtPuntos]);
    dataHoja.push([]);

    const chkActividades = document.getElementById("chkActividades")?.checked;
    const txtActividades = document.getElementById("txtSoportesInternos")?.value;
    if (chkActividades && txtActividades) {
        dataHoja.push(["3. SOPORTES INTERNOS / ACTIVIDADES ADICIONALES"]);
        dataHoja.push([txtActividades]);
        dataHoja.push([]);
    }

    dataHoja.push(["DETALLE COMPLETO DE TICKETS"]);
    const tablaDet = document.getElementById("tablaDetalleTickets");
    if (tablaDet) {
        const clonTabla = tablaDet.cloneNode(true);
        clonTabla.querySelectorAll("td").forEach(td => {
            td.style.maxWidth = "none";
            td.style.whiteSpace = "pre-wrap";
            td.classList.remove("text-truncate");
        });
        const wsDet = XLSX.utils.table_to_sheet(clonTabla);
        const jsonDet = XLSX.utils.sheet_to_json(wsDet, { header: 1 });
        jsonDet.forEach(row => dataHoja.push(row));
    }

    const wsCompleta = XLSX.utils.aoa_to_sheet(dataHoja);

    wsCompleta['!cols'] = [
        { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 25 },
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 55 }, { wch: 35 }, { wch: 45 }
    ];

    XLSX.utils.book_append_sheet(wb, wsCompleta, "Reporte Diario");
    XLSX.writeFile(wb, `Reporte_Tickets_${fecha}.xlsx`);
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

function evaluarFechaSolucionNuevo(estatus) {
    const inputFecha = document.getElementById("regFechaSolucion");
    if (!inputFecha) return;

    if (estatus === "Cerrado") {
        inputFecha.removeAttribute("disabled");
        if (!inputFecha.value) {
            const hoy = new Date().toISOString().split("T")[0];
            inputFecha.value = hoy;
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
            const hoy = new Date().toISOString().split("T")[0];
            inputFecha.value = hoy;
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
    document.getElementById("editCliente").value = cliente || "";
    document.getElementById("editReporto").value = reporto || "";
    document.getElementById("editEjecutivo").value = ejecutivo || "";
    document.getElementById("editSistema").value = sistema || "SITA";
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

    const esAdmin = (typeof rolUsuario !== 'undefined' && rolUsuario === "Administrador");
    const esMio = (typeof usuarioSesion !== 'undefined' && ejecutivo === usuarioSesion);
    const estaAbierto = (estatus !== "Cerrado");

    const campos = [
        "editFechaEntrada", "editCliente", "editReporto", "editEjecutivo", "editSistema",
        "editTipo", "editEstatus", "editEscalado", "editAreaEscalada",
        "txtDetalleDescripcion", "txtDetalleComentarios", "txtDetalleSolucion"
    ];

    const btnGuardar = document.getElementById("btnGuardarCambios");

    if (esAdmin || (estaAbierto && esMio)) {
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

    const modalElem = document.getElementById("modalDetalleTicket");
    if (modalElem) {
        const modal = new bootstrap.Modal(modalElem);
        modal.show();
    }
}

/* ==========================================================================
   MODALES DE PERSONAL
   ========================================================================== */

function abrirModalRegistrar() {
    document.getElementById("regNombre").value = "";
    document.getElementById("regArea").value = "";
    document.getElementById("regPuesto").value = "";
    document.getElementById("regCorreo").value = "";
    document.getElementById("regUnidadesRed").value = "";
    document.getElementById("regActivo").checked = true;
    document.getElementById("regResponsable").checked = false;

    new bootstrap.Modal(document.getElementById("modalRegistrar")).show();
}

async function editarEmpleado(id) {
    const response = await fetch(`?handler=DetalleEmpleado&id=${id}`);
    const data = await response.json();

    document.getElementById("editId").value = data.id;
    document.getElementById("editNombre").value = data.nombre;
    document.getElementById("editArea").value = data.area;
    document.getElementById("editPuesto").value = data.puesto;
    document.getElementById("editCorreo").value = data.correo;
    document.getElementById("editUnidadesRed").value = data.unidadesRed;
    document.getElementById("editActivo").checked = data.activo;
    document.getElementById("editResponsable").checked = data.esResponsable;

    new bootstrap.Modal(document.getElementById("modalEditar")).show();
}

async function guardarCambios() {
    const datos = {
        id: document.getElementById("editId").value,
        nombre: document.getElementById("editNombre").value,
        area: document.getElementById("editArea").value,
        puesto: document.getElementById("editPuesto").value,
        correo: document.getElementById("editCorreo").value,
        unidadesRed: document.getElementById("editUnidadesRed").value,
        activo: document.getElementById("editActivo").checked,
        esResponsable: document.getElementById("editResponsable").checked
    };

    const response = await fetch('?handler=GuardarCambios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        },
        body: JSON.stringify(datos)
    });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Datos actualizados',
            text: 'Los datos del personal han sido actualizados con éxito.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

async function eliminarEmpleado(id, nombre) {
    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar personal?',
        text: `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel' },
        buttonsStyling: false
    });

    if (!confirmacion.isConfirmed) return;

    const response = await fetch(`?handler=EliminarEmpleado&id=${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        }
    });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Usuario eliminado',
            text: 'El personal fue eliminado de manera correcta.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}

async function guardarRegistro() {
    const datos = {
        nombre: document.getElementById("regNombre").value,
        area: document.getElementById("regArea").value,
        puesto: document.getElementById("regPuesto").value,
        correo: document.getElementById("regCorreo").value,
        unidadesRed: document.getElementById("regUnidadesRed").value,
        activo: document.getElementById("regActivo").checked,
        esResponsable: document.getElementById("regResponsable").checked
    };

    const response = await fetch('?handler=RegistrarEmpleado', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        },
        body: JSON.stringify(datos)
    });

    const result = await response.json();

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'Personal registrado',
            text: 'Se ha guardado con éxito el personal agregado.',
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        }).then(() => { location.reload(); });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'Aceptar',
            customClass: { popup: 'swal-dark', confirmButton: 'swal-btn-confirm' },
            buttonsStyling: false
        });
    }
}