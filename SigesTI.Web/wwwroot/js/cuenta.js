"use strict";
/* ==========================================================================
   UTILIDADES
   ========================================================================== */
function obtenerElemento(id) {
    return document.getElementById(id);
}

function obtenerValorOculto(id) {
    const elemento = obtenerElemento(id);
    return elemento ? elemento.value : "";
}

function normalizarTexto(valor) {
    return (valor || "").toString().trim().toLocaleLowerCase("es-MX");
}

/* ==========================================================================
   SWEETALERT DARK BLUE
   ========================================================================== */

function alertaDarkBlue(icono, titulo, mensaje) {
    if (typeof Swal === "undefined") {
        console.error("SweetAlert2 no está cargado.");
        alert(titulo + "\n\n" + mensaje.replace(/<[^>]*>/g, ""));
        return;
    }

    Swal.fire({
        icon: icono,
        title: titulo,
        html: mensaje,
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonText: "Aceptar",
        customClass: {
            popup: "swal-dark-blue",
            confirmButton: "swal-btn-confirm"
        },
        buttonsStyling: false
    });
}

/* ==========================================================================
   MODAL NUEVO USUARIO
   ========================================================================== */

function abrirModalNuevoUsuario() {
    const modal = obtenerElemento("modalNuevoUsuario");

    if (modal) {
        modal.classList.add("show");
    }
}

function cerrarModalNuevoUsuario() {
    const modal = obtenerElemento("modalNuevoUsuario");

    if (modal) {
        modal.classList.remove("show");
    }
}

/* ==========================================================================
   MODAL EDITAR USUARIO
   ========================================================================== */

function abrirModalEditarUsuario(datos) {
    obtenerElemento("editIdUsuario").value = datos.id;
    obtenerElemento("editNombreCompleto").value = datos.nombre;
    obtenerElemento("editNombreUsuario").value = datos.usuario;
    obtenerElemento("editCorreo").value = datos.correo;
    obtenerElemento("editRol").value = datos.rol;
    obtenerElemento("editActivo").checked = datos.activo === "true";
    obtenerElemento("modalEditarUsuario").classList.add("show");
}

function cerrarModalEditarUsuario() {
    const modal = obtenerElemento("modalEditarUsuario");

    if (modal) {
        modal.classList.remove("show");
    }
}

/* ==========================================================================
   CONTRASEÑAS
   ========================================================================== */

function cambiarVisibilidadPassword(boton) {
    const inputId = boton.dataset.input;
    const input = obtenerElemento(inputId);
    const icono = boton.querySelector("i");

    if (!input || !icono) {
        return;
    }

    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    icono.classList.toggle("bi-eye", !mostrar);
    icono.classList.toggle("bi-eye-slash", mostrar);
}

function validarPasswordTemporal(evento) {
    const password = obtenerElemento("passwordTemporal");
    const confirmacion = obtenerElemento("confirmarPasswordTemporal");

    if (!password || !confirmacion) {
        evento.preventDefault();
        alertaDarkBlue("error", "No se pudo validar", "No se encontraron los campos de contraseña.");
        return;
    }

    if (password.value.trim() !== confirmacion.value.trim()) {
        evento.preventDefault();
        alertaDarkBlue("error", "Contraseñas diferentes", "La contraseña temporal y la confirmación no coinciden.");
        return;
    }

    if (password.value.trim().length < 8) {
        evento.preventDefault();
        alertaDarkBlue("warning", "Contraseña demasiado corta", "La contraseña temporal debe tener al menos 8 caracteres.");
    }
}

/* ==========================================================================
   RESTABLECER CONTRASEÑA
   ========================================================================== */

function confirmarRestablecerPassword(idUsuario, nombreUsuario) {
    Swal.fire({
        icon: "warning",
        title: "¿Restablecer contraseña?",
        html:
            "Se generará una nueva contraseña temporal para <b>" +
            nombreUsuario +
            "</b>.",
        background: "#0f172a",
        color: "#f8fafc",
        showCancelButton: true,
        confirmButtonText: "Sí, restablecer",
        cancelButtonText: "Cancelar",
        customClass: {
            popup: "swal-dark-blue",
            confirmButton: "swal-btn-confirm",
            cancelButton: "swal-btn-cancel"
        },
        buttonsStyling: false
    }).then(function (resultado) {
        if (!resultado.isConfirmed) {
            return;
        }

        obtenerElemento("passwordIdUsuario").value = idUsuario;
        obtenerElemento("formRestablecerPassword").submit();
    });
}

/* ==========================================================================
   ELIMINAR USUARIO
   ========================================================================== */

function confirmarEliminarUsuario(idUsuario, nombreUsuario) {
    Swal.fire({
        icon: "warning",
        title: "¿Eliminar usuario?",
        html:
            "Se eliminará la cuenta <b>" +
            nombreUsuario +
            "</b>.<br><br>" +
            "La información histórica de la bitácora se conservará.",
        background: "#0f172a",
        color: "#f8fafc",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        customClass: {
            popup: "swal-dark-blue",
            confirmButton: "swal-btn-confirm",
            cancelButton: "swal-btn-cancel"
        },
        buttonsStyling: false
    }).then(function (resultado) {
        if (!resultado.isConfirmed) {
            return;
        }

        obtenerElemento("eliminarIdUsuario").value = idUsuario;
        obtenerElemento("formEliminarUsuario").submit();
    });
}

/* ==========================================================================
   BUSCADOR DE USUARIOS
   ========================================================================== */

function filtrarUsuarios() {
    const buscador = obtenerElemento("buscarUsuario");
    const tabla = obtenerElemento("tablaUsuarios");
    const resultado = obtenerElemento("resultadoUsuarios");

    if (!buscador || !tabla) {
        return;
    }

    const texto = normalizarTexto(buscador.value);
    const filas = tabla.querySelectorAll("tbody tr");
    let visibles = 0;

    filas.forEach(function (fila) {
        const columnas = fila.querySelectorAll("td");

        if (columnas.length < 2) {
            return;
        }

        const contenido = normalizarTexto(fila.innerText);
        const mostrar = contenido.includes(texto);

        fila.style.display = mostrar ? "" : "none";

        if (mostrar) {
            visibles++;
        }
    });

    if (resultado) {
        resultado.textContent = "Mostrando " + visibles + (visibles === 1 ? " usuario" : " usuarios");
    }
}

/* ==========================================================================
   FILTROS DE BITÁCORA
   ========================================================================== */

function agregarOpcionesUnicas(selectId, valores) {
    const select = obtenerElemento(selectId);

    if (!select) {
        return;
    }

    const valoresUnicos = Array.from(new Set(valores.map(function (valor) {
        return (valor || "").trim();
    }).filter(Boolean))).sort(function (a, b) {
        return a.localeCompare(b, "es-MX");
    });

    valoresUnicos.forEach(function (valor) {
        const opcion = document.createElement("option");

        opcion.value = valor;
        opcion.textContent = valor;

        select.appendChild(opcion);
    });
}

function cargarFiltrosBitacora() {
    const tabla = obtenerElemento("tablaBitacora");

    if (!tabla) {
        return;
    }

    const filas = Array.from(tabla.querySelectorAll("tbody tr[data-fecha]"));

    agregarOpcionesUnicas("filtroNombre", filas.map(function (fila) {
        return fila.dataset.nombre;
    }));

    agregarOpcionesUnicas("filtroModulo", filas.map(function (fila) {
        return fila.dataset.modulo;
    }));

    agregarOpcionesUnicas("filtroAccion", filas.map(function (fila) {
        return fila.dataset.accion;
    }));
}

function filtrarBitacora() {
    const tabla = obtenerElemento("tablaBitacora");
    const resultado = obtenerElemento("resultadoBitacora");

    if (!tabla) {
        return;
    }

    const nombre = normalizarTexto(obtenerElemento("filtroNombre")?.value);
    const modulo = normalizarTexto(obtenerElemento("filtroModulo")?.value);
    const accion = normalizarTexto(obtenerElemento("filtroAccion")?.value);
    const fechaInicio = obtenerElemento("filtroFechaInicio")?.value || "";
    const fechaFin = obtenerElemento("filtroFechaFin")?.value || "";
    const filas = tabla.querySelectorAll("tbody tr[data-fecha]");
    let visibles = 0;

    filas.forEach(function (fila) {
        const nombreFila = normalizarTexto(fila.dataset.nombre);
        const moduloFila = normalizarTexto(fila.dataset.modulo);
        const accionFila = normalizarTexto(fila.dataset.accion);
        const fechaFila = fila.dataset.fecha || "";

        const cumpleNombre =
            !nombre || nombreFila === nombre;

        const cumpleModulo =
            !modulo || moduloFila === modulo;

        const cumpleAccion =
            !accion || accionFila === accion;

        const cumpleInicio =
            !fechaInicio || fechaFila >= fechaInicio;

        const cumpleFin =
            !fechaFin || fechaFila <= fechaFin;

        const mostrar =
            cumpleNombre &&
            cumpleModulo &&
            cumpleAccion &&
            cumpleInicio &&
            cumpleFin;

        fila.style.display = mostrar ? "" : "none";

        if (mostrar) {
            visibles++;
        }
    });

    if (resultado) {
        resultado.textContent = "Mostrando " + visibles + (visibles === 1 ? " registro" : " registros");
    }
}

function limpiarFiltrosBitacora() {
    const ids = [
        "filtroNombre",
        "filtroModulo",
        "filtroAccion",
        "filtroFechaInicio",
        "filtroFechaFin"
    ];

    ids.forEach(function (id) {
        const elemento = obtenerElemento(id);

        if (elemento) {
            elemento.value = "";
        }
    });

    filtrarBitacora();
}

/* ==========================================================================
   IMPRESIÓN DE BITÁCORA
   ========================================================================== */

function imprimirBitacora() {
    const contenido =
        obtenerElemento("reporteBitacoraPreview");

    if (!contenido || !contenido.innerHTML.trim()) {
        alertaDarkBlue(
            "warning",
            "Sin vista previa",
            "Primero genera la vista previa del reporte."
        );

        return;
    }

    const ventana = window.open(
        "",
        "_blank",
        "width=1300,height=900"
    );

    if (!ventana) {
        alertaDarkBlue(
            "warning",
            "Ventana bloqueada",
            "Permite las ventanas emergentes para imprimir el reporte."
        );

        return;
    }

    let html = "";

    html += "<!DOCTYPE html>";
    html += "<html lang='es'>";
    html += "<head>";
    html += "<meta charset='UTF-8'>";
    html += "<title>Reporte de bitácora</title>";
    html += "<style>";
    html += obtenerEstilosReporte();
    html += "</style>";
    html += "</head>";
    html += "<body>";
    html += contenido.innerHTML;
    html += "</body>";
    html += "</html>";

    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();

    setTimeout(function () {
        ventana.focus();
        ventana.print();
    }, 500);
}

function obtenerEstilosReporte() {
    return (
        "*{box-sizing:border-box;}" +
        "body{" +
        "font-family:Arial,Helvetica,sans-serif;" +
        "margin:0;" +
        "padding:28px;" +
        "color:#172033;" +
        "background:#fff;" +
        "}" +

        ".reporte-documento{" +
        "width:100%;" +
        "background:#fff;" +
        "}" +

        ".reporte-encabezado{" +
        "display:flex;" +
        "justify-content:space-between;" +
        "align-items:center;" +
        "}" +

        ".reporte-identidad img{" +
        "width:145px;" +
        "display:block;" +
        "margin-bottom:4px;" +
        "}" +

        ".reporte-identidad span{" +
        "font-size:11px;" +
        "color:#64748b;" +
        "}" +

        ".reporte-generado{" +
        "font-size:11px;" +
        "color:#111827;" +
        "}" +

        ".reporte-linea{" +
        "height:4px;" +
        "margin:14px 0 18px;" +
        "background:#2855d9;" +
        "}" +

        ".reporte-titulo{" +
        "background:#2855d9;" +
        "color:#fff;" +
        "font-weight:700;" +
        "font-size:18px;" +
        "text-align:center;" +
        "padding:12px;" +
        "border-radius:7px;" +
        "margin-bottom:16px;" +
        "}" +

        ".reporte-filtros-resumen{" +
        "display:grid;" +
        "grid-template-columns:repeat(3,1fr);" +
        "gap:11px 20px;" +
        "padding:15px;" +
        "border:1px solid #cbd5e1;" +
        "border-left:5px solid #2855d9;" +
        "border-radius:9px;" +
        "background:#f8fafc;" +
        "font-size:11px;" +
        "margin-bottom:18px;" +
        "}" +

        ".reporte-filtros-resumen strong{" +
        "color:#2855d9;" +
        "}" +

        ".reporte-tabla{" +
        "width:100%;" +
        "border-collapse:separate;" +
        "border-spacing:0;" +
        "font-size:10px;" +
        "}" +

        ".reporte-tabla th{" +
        "background:#2855d9;" +
        "color:#fff;" +
        "padding:9px 6px;" +
        "text-align:center;" +
        "border-right:1px solid rgba(255,255,255,.25);" +
        "}" +

        ".reporte-tabla td{" +
        "padding:8px 6px;" +
        "text-align:center;" +
        "border-right:1px solid #cbd5e1;" +
        "border-bottom:1px solid #cbd5e1;" +
        "vertical-align:top;" +
        "}" +

        ".reporte-tabla td:first-child{" +
        "border-left:1px solid #cbd5e1;" +
        "}" +

        ".reporte-tabla tbody tr:nth-child(even){" +
        "background:#f8fafc;" +
        "}" +

        ".tag{" +
        "font-weight:700;" +
        "}" +

        ".reporte-pie{" +
        "display:flex;" +
        "justify-content:space-between;" +
        "margin-top:20px;" +
        "padding-top:10px;" +
        "border-top:1px solid #cbd5e1;" +
        "color:#64748b;" +
        "font-size:9px;" +
        "}"
    );
}

/* ==========================================================================
   MENSAJES DEL SERVIDOR
   ========================================================================== */

function mostrarMensajesServidor() {
    const exito = obtenerValorOculto("mensajeExito");
    const error = obtenerValorOculto("mensajeError");
    const passwordGenerado = obtenerValorOculto("passwordGenerado");
    const abrirNuevo = obtenerValorOculto("abrirModalNuevo");

    if (abrirNuevo.toLowerCase() === "true") {
        abrirModalNuevoUsuario();
    }

    window.setTimeout(function () {
        if (exito) {
            let mensaje = exito;

            if (passwordGenerado) {
                mensaje +=
                    "<br><br>" +
                    "<div class='swal-password-box'>" +
                    "<span>Contraseña temporal:</span>" +
                    "<strong>" +
                    passwordGenerado +
                    "</strong>" +
                    "</div>";
            }

            alertaDarkBlue(
                "success",
                "Operación exitosa",
                mensaje
            );
        }

        if (error) {
            alertaDarkBlue(
                "error",
                "Ocurrió un problema",
                error
            );
        }
    }, 100);
}

/* ==========================================================================
   REPORTE DE BITÁCORA
   ========================================================================== */

function abrirModalConfigurarReporte() {
    cargarOpcionesReporte();

    const modal = obtenerElemento("modalConfigurarReporte");

    if (modal) {
        modal.classList.add("show");
    }
}

function cerrarModalConfigurarReporte() {
    const modal = obtenerElemento("modalConfigurarReporte");

    if (modal) {
        modal.classList.remove("show");
    }
}

function abrirVistaPreviaReporte() {
    const modal = obtenerElemento("modalVistaPreviaReporte");

    if (modal) {
        modal.classList.add("show");
    }
}

function cerrarVistaPreviaReporte() {
    const modal = obtenerElemento("modalVistaPreviaReporte");

    if (modal) {
        modal.classList.remove("show");
    }
}

function agregarOpcionesSelect(select, valores) {
    if (!select) {
        return;
    }

    while (select.options.length > 1) {
        select.remove(1);
    }

    const valoresUnicos = Array.from(
        new Set(
            valores
                .map(function (valor) {
                    return (valor || "").trim();
                })
                .filter(Boolean)
        )
    ).sort(function (a, b) {
        return a.localeCompare(b, "es-MX");
    });

    valoresUnicos.forEach(function (valor) {
        const opcion = document.createElement("option");

        opcion.value = valor;
        opcion.textContent = valor;

        select.appendChild(opcion);
    });
}

function cargarOpcionesReporte() {
    const tabla = obtenerElemento("tablaBitacora");

    if (!tabla) {
        return;
    }

    const filas = Array.from(
        tabla.querySelectorAll("tbody tr[data-fecha]")
    );

    agregarOpcionesSelect(
        obtenerElemento("reporteNombre"),
        filas.map(function (fila) {
            return fila.dataset.nombre;
        })
    );

    agregarOpcionesSelect(
        obtenerElemento("reporteCorreo"),
        filas.map(function (fila) {
            return fila.dataset.correo;
        })
    );

    agregarOpcionesSelect(
        obtenerElemento("reporteModulo"),
        filas.map(function (fila) {
            return fila.dataset.modulo;
        })
    );

    agregarOpcionesSelect(
        obtenerElemento("reporteAccion"),
        filas.map(function (fila) {
            return fila.dataset.accion;
        })
    );
}

function obtenerFilasReporte() {
    const tabla = obtenerElemento("tablaBitacora");

    if (!tabla) {
        return [];
    }

    const nombre =
        obtenerElemento("reporteNombre")?.value || "";

    const correo =
        obtenerElemento("reporteCorreo")?.value || "";

    const modulo =
        obtenerElemento("reporteModulo")?.value || "";

    const accion =
        obtenerElemento("reporteAccion")?.value || "";

    const fechaInicio =
        obtenerElemento("reporteFechaInicio")?.value || "";

    const fechaFin =
        obtenerElemento("reporteFechaFin")?.value || "";

    const filas = Array.from(
        tabla.querySelectorAll("tbody tr[data-fecha]")
    );

    return filas.filter(function (fila) {
        const cumpleNombre =
            !nombre || fila.dataset.nombre === nombre;

        const cumpleCorreo =
            !correo || fila.dataset.correo === correo;

        const cumpleModulo =
            !modulo || fila.dataset.modulo === modulo;

        const cumpleAccion =
            !accion || fila.dataset.accion === accion;

        const cumpleFechaInicio =
            !fechaInicio || fila.dataset.fecha >= fechaInicio;

        const cumpleFechaFin =
            !fechaFin || fila.dataset.fecha <= fechaFin;

        return (
            cumpleNombre &&
            cumpleCorreo &&
            cumpleModulo &&
            cumpleAccion &&
            cumpleFechaInicio &&
            cumpleFechaFin
        );
    });
}

function textoFiltro(valor, textoTodos) {
    return valor && valor.trim()
        ? valor
        : textoTodos;
}

function formatearFechaReporte(fecha) {
    if (!fecha) {
        return "Todas";
    }

    const partes = fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function generarVistaPreviaReporte() {
    const filas = obtenerFilasReporte();

    if (filas.length === 0) {
        alertaDarkBlue(
            "info",
            "Sin resultados",
            "No existen registros que coincidan con los filtros seleccionados."
        );

        return;
    }

    const fechaInicio =
        obtenerElemento("reporteFechaInicio")?.value || "";

    const fechaFin =
        obtenerElemento("reporteFechaFin")?.value || "";

    const nombre =
        obtenerElemento("reporteNombre")?.value || "";

    const correo =
        obtenerElemento("reporteCorreo")?.value || "";

    const modulo =
        obtenerElemento("reporteModulo")?.value || "";

    const accion =
        obtenerElemento("reporteAccion")?.value || "";

    const fechaGeneracion =
        new Date().toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

    const filasHtml = filas
        .map(function (fila, indice) {
            const columnas = fila.querySelectorAll("td");

            return (
                "<tr>" +
                "<td>" + (indice + 1) + "</td>" +
                "<td>" + columnas[0].innerHTML + "</td>" +
                "<td>" + columnas[1].innerHTML + "</td>" +
                "<td>" + columnas[2].innerHTML + "</td>" +
                "<td>" + columnas[3].innerHTML + "</td>" +
                "<td>" + columnas[4].innerHTML + "</td>" +
                "<td>" + columnas[5].innerHTML + "</td>" +
                "</tr>"
            );
        })
        .join("");

    const reporte =
        "<div class='reporte-documento'>" +

        "<div class='reporte-encabezado'>" +
        "<div class='reporte-identidad'>" +
        "<img src='/titulo2.png' alt='SigesST' />" +
        "<span>Sistema de Gestión de Solicitudes TI</span>" +
        "</div>" +

        "<div class='reporte-generado'>" +
        "<strong>Generado:</strong> " +
        fechaGeneracion +
        "</div>" +
        "</div>" +

        "<div class='reporte-linea'></div>" +

        "<div class='reporte-titulo'>" +
        "Reporte de Bitácora de Actividades" +
        "</div>" +

        "<div class='reporte-filtros-resumen'>" +

        "<div><strong>Fecha inicial:</strong> " +
        formatearFechaReporte(fechaInicio) +
        "</div>" +

        "<div><strong>Fecha final:</strong> " +
        formatearFechaReporte(fechaFin) +
        "</div>" +

        "<div><strong>Nombre:</strong> " +
        textoFiltro(nombre, "Todos") +
        "</div>" +

        "<div><strong>Correo:</strong> " +
        textoFiltro(correo, "Todos") +
        "</div>" +

        "<div><strong>Módulo:</strong> " +
        textoFiltro(modulo, "Todos") +
        "</div>" +

        "<div><strong>Acción:</strong> " +
        textoFiltro(accion, "Todas") +
        "</div>" +

        "<div><strong>Total:</strong> " +
        filas.length +
        " registros</div>" +

        "</div>" +

        "<table class='reporte-tabla'>" +

        "<thead>" +
        "<tr>" +
        "<th>No.</th>" +
        "<th>Fecha y hora</th>" +
        "<th>Nombre</th>" +
        "<th>Correo</th>" +
        "<th>Módulo</th>" +
        "<th>Acción</th>" +
        "<th>Descripción</th>" +
        "</tr>" +
        "</thead>" +

        "<tbody>" +
        filasHtml +
        "</tbody>" +

        "</table>" +

        "<div class='reporte-pie'>" +
        "<span>Sistema SigesST</span>" +
        "<span>Reporte generado automáticamente</span>" +
        "</div>" +

        "</div>";

    const contenedor =
        obtenerElemento("reporteBitacoraPreview");

    if (contenedor) {
        contenedor.innerHTML = reporte;
    }

    cerrarModalConfigurarReporte();
    abrirVistaPreviaReporte();
}

/* ==========================================================================
   EVENTOS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const btnNuevoUsuario =
        obtenerElemento("btnNuevoUsuario");

    const btnImprimirBitacora =
        obtenerElemento("btnImprimirBitacora");

    const buscadorUsuario =
        obtenerElemento("buscarUsuario");

    const formNuevoUsuario =
        obtenerElemento("formNuevoUsuario");

    const btnFiltrarBitacora =
        obtenerElemento("btnFiltrarBitacora");

    const btnLimpiarBitacora =
        obtenerElemento("btnLimpiarBitacora");

    const btnCerrarConfigReporte =
        obtenerElemento("btnCerrarConfigReporte");

    const btnCancelarConfigReporte =
        obtenerElemento("btnCancelarConfigReporte");

    const btnGenerarVistaPrevia =
        obtenerElemento("btnGenerarVistaPrevia");

    const btnCerrarVistaPrevia =
        obtenerElemento("btnCerrarVistaPrevia");

    const btnImprimirVistaPrevia =
        obtenerElemento("btnImprimirVistaPrevia");

    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener(
            "click",
            abrirModalNuevoUsuario
        );
    }

    if (btnImprimirBitacora) {
        btnImprimirBitacora.addEventListener(
            "click",
            abrirModalConfigurarReporte
        );
    }
    if (buscadorUsuario) {
        buscadorUsuario.addEventListener(
            "input",
            filtrarUsuarios
        );
    }

    if (formNuevoUsuario) {
        formNuevoUsuario.addEventListener(
            "submit",
            validarPasswordTemporal
        );
    }

    if (btnFiltrarBitacora) {
        btnFiltrarBitacora.addEventListener(
            "click",
            filtrarBitacora
        );
    }

    if (btnLimpiarBitacora) {
        btnLimpiarBitacora.addEventListener(
            "click",
            limpiarFiltrosBitacora
        );
    }

    if (btnCerrarConfigReporte) {
        btnCerrarConfigReporte.addEventListener(
            "click",
            cerrarModalConfigurarReporte
        );
    }

    if (btnCancelarConfigReporte) {
        btnCancelarConfigReporte.addEventListener(
            "click",
            cerrarModalConfigurarReporte
        );
    }

    if (btnGenerarVistaPrevia) {
        btnGenerarVistaPrevia.addEventListener(
            "click",
            generarVistaPreviaReporte
        );
    }

    if (btnCerrarVistaPrevia) {
        btnCerrarVistaPrevia.addEventListener(
            "click",
            cerrarVistaPreviaReporte
        );
    }

    if (btnImprimirVistaPrevia) {
        btnImprimirVistaPrevia.addEventListener(
            "click",
            imprimirBitacora
        );
    }

    document
        .querySelectorAll(".js-cerrar-nuevo")
        .forEach(function (boton) {
            boton.addEventListener(
                "click",
                cerrarModalNuevoUsuario
            );
        });

    document
        .querySelectorAll(".js-cerrar-editar")
        .forEach(function (boton) {
            boton.addEventListener(
                "click",
                cerrarModalEditarUsuario
            );
        });

    document
        .querySelectorAll(".js-toggle-password")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                cambiarVisibilidadPassword(boton);
            });
        });

    document
        .querySelectorAll(".js-editar-usuario")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                abrirModalEditarUsuario({
                    id: boton.dataset.id,
                    nombre: boton.dataset.nombre,
                    usuario: boton.dataset.usuario,
                    correo: boton.dataset.correo,
                    rol: boton.dataset.rol,
                    activo: boton.dataset.activo
                });
            });
        });

    document
        .querySelectorAll(".js-restablecer-password")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                confirmarRestablecerPassword(
                    boton.dataset.id,
                    boton.dataset.usuario
                );
            });
        });

    document
        .querySelectorAll(".js-eliminar-usuario")
        .forEach(function (boton) {
            boton.addEventListener("click", function () {
                confirmarEliminarUsuario(
                    boton.dataset.id,
                    boton.dataset.usuario
                );
            });
        });

    cargarFiltrosBitacora();
    mostrarMensajesServidor();
});
