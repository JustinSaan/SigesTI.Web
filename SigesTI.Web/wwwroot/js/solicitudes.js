/* ==========================================================================
   MÓDULO DE SOLICITUDES
   Las alertas usan las funciones generales de alertas.js
   (mostrarExito, mostrarError, mostrarAdvertencia, mostrarConfirmacion).
   ========================================================================== */

/* Mismo token antifalsificación para todas las peticiones POST */
function tokenSolicitudes() {
    return $('input:hidden[name="__RequestVerificationToken"]').val();
}

/* Llena un combo de personal con los datos que devuelve FiltrarPersonal */
function llenarComboPersonal($combo, personal, idSeleccionado) {
    var jefe = "";

    $.each(personal, function (i, item) {
        if (item.esResponsable) jefe = item.nombre;

        $("<option>")
            .val(item.id)
            .text(item.nombre)
            .attr("data-correo", item.correo || "")
            .attr("data-puesto", item.puesto || "")
            .prop("selected", item.id == idSeleccionado)
            .appendTo($combo);
    });

    return jefe || "Sin jefe asignado";
}

/* Pinta el historial como tarjetas, igual que en Tareas Programadas.
   Cada comentario empieza con "Agregado el: {fecha} Por: {usuario}" seguido del texto.
   Las solicitudes viejas usan "Entrado el:" y líneas decorativas, que aquí se quitan. */
function renderizarHistorial(contenedor, texto) {
    contenedor.innerHTML = '';

    var limpio = (texto || '')
        .replace(/📌 SOLICITUD INICIAL/g, '')
        .replace(/^[ \t]*[─═]+[ \t]*$/gm, '');

    if (limpio.trim() === '') {
        contenedor.innerHTML = '<span class="text-muted small fst-italic">No hay comentarios registrados.</span>';
        return;
    }

    var bloques = limpio.split(/(?=(?:Agregado|Entrado) el: )/).map(b => b.trim()).filter(b => b !== '');

    bloques.forEach(bloque => {
        var item = document.createElement('div');
        item.className = 'comentario-item';

        var cuerpo = bloque;
        var partes = bloque.match(/^(?:Agregado|Entrado) el: (.+?) Por: (.*)\n?([\s\S]*)$/);

        if (partes) {
            var cabecera = document.createElement('div');
            cabecera.className = 'comentario-cabecera';

            var autor = document.createElement('span');
            autor.className = 'comentario-autor';
            autor.innerHTML = '<i class="bi bi-person-circle me-1"></i>';
            autor.append(partes[2].trim() || 'Sin usuario');

            var fecha = document.createElement('span');
            fecha.className = 'comentario-fecha';
            fecha.textContent = partes[1];

            cabecera.append(autor, fecha);
            item.appendChild(cabecera);
            cuerpo = partes[3].replace(/^\s+|\s+$/g, '').replace(/\n[ \t]+/g, '\n');
        }

        var textoComentario = document.createElement('div');
        textoComentario.className = 'comentario-texto';
        textoComentario.textContent = cuerpo;
        item.appendChild(textoComentario);

        contenedor.appendChild(item);
    });
}

/* ==========================================================================
   CONSULTAR SOLICITUDES
   ========================================================================== */

$(document).ready(function () {

    if (!$("#tablaBitacoraPrincipal").length) return;

    var historialCompletoGuardado = "";
    var puedeEditarActual = false;
    var paginaActual = 1;

    /* ---------- Búsqueda y paginación en el navegador ---------- */

    function aplicarPaginacionYFiltro() {
        var filasPorPagina = parseInt($("#itemsPorPagina").val());
        var textoBuscado = $("#inputFiltroReactivo").val().trim().toLowerCase();
        var $filas = $("#tablaBitacoraPrincipal tbody tr").not(".sol-fila-vacia");

        var $coincidencias = $filas.filter(function () {
            return textoBuscado === "" || $(this).text().toLowerCase().indexOf(textoBuscado) > -1;
        });

        $filas.addClass("d-none");

        var total = $coincidencias.length;
        $("#filaSinCoincidencias").toggleClass("d-none", total > 0 || textoBuscado === "");
        $("#filterQueryValue").text($("#inputFiltroReactivo").val());

        if (total === 0) {
            $("#contenedorControlesPagina").empty();
            $("#infoPaginacion").text("No se encontraron solicitudes");
            return;
        }

        var totalPaginas = Math.ceil(total / filasPorPagina);
        paginaActual = Math.min(Math.max(paginaActual, 1), totalPaginas);

        var inicio = (paginaActual - 1) * filasPorPagina;
        var fin = Math.min(inicio + filasPorPagina, total);

        $coincidencias.slice(inicio, fin).removeClass("d-none");
        $("#infoPaginacion").text(`Mostrando ${inicio + 1} a ${fin} de ${total} solicitudes`);

        dibujarPaginacion(totalPaginas);
    }

    /* Botones de página iguales a los de Control de Acceso; con una sola página no se muestran */
    function dibujarPaginacion(totalPaginas) {
        var $contenedor = $("#contenedorControlesPagina").empty();
        if (totalPaginas <= 1) return;

        function boton(contenido, pagina, deshabilitado, activo, etiqueta) {
            $("<button type='button'>")
                .html(contenido)
                .prop("disabled", deshabilitado)
                .toggleClass("active", activo)
                .attr("aria-label", etiqueta)
                .on("click", function () {
                    if (activo) return;
                    paginaActual = pagina;
                    aplicarPaginacionYFiltro();
                })
                .appendTo($contenedor);
        }

        boton('<i class="bi bi-chevron-left"></i>', paginaActual - 1, paginaActual === 1, false, "Página anterior");
        for (var i = 1; i <= totalPaginas; i++) {
            boton(i, i, false, i === paginaActual, "Página " + i);
        }
        boton('<i class="bi bi-chevron-right"></i>', paginaActual + 1, paginaActual === totalPaginas, false, "Página siguiente");
    }

    $("#itemsPorPagina").on("change", function () {
        paginaActual = 1;
        aplicarPaginacionYFiltro();
    });

    $("#inputFiltroReactivo").on("input", function () {
        paginaActual = 1;
        aplicarPaginacionYFiltro();
    });

    /* Ordenar por folio: cada clic cambia entre menor a mayor y mayor a menor */
    var ordenFolioAscendente = false;
    $("#btnOrdenarFolio").on("click", function () {
        ordenFolioAscendente = !ordenFolioAscendente;

        var $tbody = $("#tablaBitacoraPrincipal tbody");
        var filas = $tbody.children("tr[data-folio]").get();
        filas.sort(function (a, b) {
            var diferencia = Number(a.dataset.folio) - Number(b.dataset.folio);
            return ordenFolioAscendente ? diferencia : -diferencia;
        });
        $tbody.prepend(filas);

        $(this).addClass("activo").find("i")
            .attr("class", ordenFolioAscendente ? "bi bi-sort-numeric-down" : "bi bi-sort-numeric-up-alt");
        paginaActual = 1;
        aplicarPaginacionYFiltro();
    });

    /* Filtros que se resuelven en el servidor */
    $(".filtro-servidor-auto").on("change", function () {
        $("#loaderFiltro").removeClass("d-none");
        $("#formFiltros").submit();
    });

    /* ---------- Reporte ---------- */

    /* El formulario carga Solicitudes/ReporteSolicitudes en el iframe (target) y se muestra la vista previa */
    $("#formReporteSolicitudes").on("submit", function () {
        $("#modalExportarSolicitudes").modal("hide");
        $("#modalVistaReporte").modal("show");
    });

    // Descarga el PDF que arma el servidor (ReporteSolicitudesPdf.cs) con los mismos filtros del modal
    $("#btnDescargarPdf").on("click", function () {
        var filtros = new URLSearchParams(new FormData(document.getElementById("formReporteSolicitudes")));
        filtros.set("handler", "Pdf");

        window.location.href = "/Solicitudes/ReporteSolicitudes?" + filtros.toString();
    });

    // "Cambiar filtros" cierra la vista previa para no encimar los dos modales
    $("#modalExportarSolicitudes").on("show.bs.modal", function () {
        $("#modalVistaReporte").modal("hide");
    });

    // El título se usa como nombre si en la ventana de impresión eligen "Guardar como PDF"
    $("#btnImprimirReporte").on("click", function () {
        var iframe = document.getElementById("iframeReporteSolicitudes");
        var ahora = new Date();
        var dos = valor => String(valor).padStart(2, "0");

        iframe.contentDocument.title = "ReporteSolicitudes_" +
            dos(ahora.getDate()) + dos(ahora.getMonth() + 1) + ahora.getFullYear() +
            dos(ahora.getHours()) + dos(ahora.getMinutes()) + dos(ahora.getSeconds());

        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    });

    /* ---------- Modal de detalle / edición ---------- */

    var estatusActual = "";

    // "Por autorizar" no se elige aquí: se muestra un aviso en lugar de los botones de estatus
    function marcarEstatusModal(estatus) {
        var porAutorizar = estatus === "Por autorizar";

        $("input[name='modal_Estatus']").prop("checked", false);
        $("input[name='modal_Estatus'][value='" + estatus + "']").prop("checked", true);

        $("#modal_SegmentosEstatus").toggleClass("d-none", porAutorizar);
        $("#modal_AvisoAutorizacion").toggleClass("d-none", !porAutorizar);
    }

    $("#btnVerFormato").on("click", function () {
        var idSolicitud = $("#modal_IdSolicitud").val();
        $("#modalSolicitud").modal("hide");
        abrirVistaRequerimiento(idSolicitud);
    });

    function cargarPersonalModal(area, idSeleccionado) {
        var $combo = $("#modal_IdPersonal");
        $combo.empty().append('<option value="">Seleccione personal</option>');
        if (!area) return;

        $.getJSON("/Solicitudes/Consultar?handler=FiltrarPersonal", { area: area }, function (personal) {
            var jefe = llenarComboPersonal($combo, personal, idSeleccionado);
            $("#modal_Responsable").val(jefe);
        });
    }

    function mostrarDesplegable($check, $contenedor) {
        $contenedor.toggleClass("d-none", !$check.is(":checked"));
    }

    function bloquearCamposModal() {
        $(".ctrl-modal").prop("disabled", true);
        $("#modal_bloque_apunte").addClass("d-none");
        $("#btnLiberarEdicion").toggleClass("d-none", !puedeEditarActual);
        $("#btnGuardarCambiosModal").addClass("d-none");
        $("#modal_Subtitulo").text("Modo lectura");
    }

    function activarEdicionModal() {
        $(".ctrl-modal").prop("disabled", false);
        $("#modal_DescripcionProblema").val("");
        $("#modal_bloque_apunte").removeClass("d-none");
        $("#modal_bloque_global_sistemas, #modal_tarjeta_config, #modal_bloque_red, #modal_bloque_impresora").removeClass("d-none");
        $("#btnLiberarEdicion").addClass("d-none");
        $("#btnGuardarCambiosModal").removeClass("d-none");
        $("#modal_Subtitulo").text("Editando solicitud");
    }

    $(".btn-visualizar, .btn-editar-directo").on("click", function () {
        var idSolicitud = $(this).data("id");
        var abrirEnEdicion = $(this).hasClass("btn-editar-directo");

        $("#loaderFiltro").removeClass("d-none");

        $.getJSON("/Solicitudes/Consultar?handler=DetalleSolicitud", { id: idSolicitud })
            .done(function (data) {
                $("#loaderFiltro").addClass("d-none");

                if (!data) {
                    mostrarError("No se encontraron los datos de la solicitud.");
                    return;
                }

                historialCompletoGuardado = data.descripcionProblema || "";
                puedeEditarActual = data.puedeEditar === true;

                $("#modal_IdSolicitud").val(data.idSolicitud);
                $("#modal_Folio").text("#" + String(data.idSolicitud).padStart(4, "0"));
                $("#modal_FechaIngreso").val(data.fechaIngreso);
                $("#modal_FechaEntrega").val(data.fechaEntrega || "");

                estatusActual = data.estatus;
                marcarEstatusModal(data.estatus);
                $("#modal_AvisoAutorizador").text(data.autorizaAdmin);
                $("#modal_AutorizadoPor").text(data.autorizadoPor);
                $("#modal_FechaAutorizacion").text(data.fechaAutorizacion);
                $("#modal_InfoAutorizacion").toggleClass("d-none", !data.fechaAutorizacion);
                $("#modal_Area").val(data.area);
                $("#modal_Puesto").val(data.puesto);
                $("#modal_Correo").val(data.correo);
                $("#modal_Responsable").val(data.responsableArea);
                $("#modal_EjecutivoAsignado").val(data.ejecutivoAsignado);
                $("#modal_AutorizaAdmin").val(data.autorizaAdmin);
                $("#modal_DescripcionRequisito").text(data.descripcionRequisito);
                renderizarHistorial(document.getElementById("modal_Historial"), data.seguimiento);

                cargarPersonalModal(data.area, data.idPersonal);

                $(data.impresoraConfigurada === "Si" ? "#modal_config_si" : "#modal_config_no").prop("checked", true);

                // Sistemas
                var sistemas = data.sistemasDetalle ? data.sistemasDetalle.split(", ") : [];
                $(".custom-modal-sistemas-chk").each(function () {
                    $(this).prop("checked", sistemas.indexOf($(this).val()) > -1);
                });
                if (data.otrosSistemas) $("#modal_chkOtros").prop("checked", true);
                $("#modal_txtOtrosSistemas").val(data.otrosSistemas).toggleClass("d-none", !data.otrosSistemas);
                $("#modal_chkReqSistemas").prop("checked", data.reqSistemas);
                $("#modal_seccionSistemas").toggleClass("d-none", !data.reqSistemas);
                $("#modal_bloque_global_sistemas").toggleClass("d-none", !data.reqSistemas);

                // Unidad de red e impresora
                $("#modal_chkHabilitarRed").prop("checked", !!data.nuevaUnidadRed);
                $("#modal_txtDetalleRed").val(data.nuevaUnidadRed);
                mostrarDesplegable($("#modal_chkHabilitarRed"), $("#modal_divContenedorRed"));

                var tieneImpresora = $.trim(data.detalleImpresora) !== "";
                $("#modal_chkConfigurarImpresora").prop("checked", tieneImpresora);
                $("#modal_txtDetalleImpresora").val(data.detalleImpresora);
                mostrarDesplegable($("#modal_chkConfigurarImpresora"), $("#modal_divContenedorImpresora"));
                $("#modal_bloque_red").toggleClass("d-none", !data.nuevaUnidadRed);
                $("#modal_bloque_impresora").toggleClass("d-none", !tieneImpresora);
                $("#modal_tarjeta_config").toggleClass("d-none", !data.nuevaUnidadRed && !tieneImpresora);

                bloquearCamposModal();
                if (abrirEnEdicion && puedeEditarActual) activarEdicionModal();

                $("#modalSolicitud").modal("show");
            })
            .fail(function () {
                $("#loaderFiltro").addClass("d-none");
                mostrarError("No se pudo comunicar con el servidor.");
            });
    });

    $("#btnLiberarEdicion").on("click", function () {
        if (puedeEditarActual) activarEdicionModal();
    });

    $("#modal_Area").on("change", function () {
        $("#modal_Puesto, #modal_Correo, #modal_Responsable").val("");
        cargarPersonalModal($(this).val(), 0);
    });

    $("#modal_IdPersonal").on("change", function () {
        var $opcion = $(this).find("option:selected");
        $("#modal_Correo").val($opcion.data("correo") || "");
        $("#modal_Puesto").val($opcion.data("puesto") || "");
    });

    $("#modal_chkReqSistemas").on("change", function () {
        if ($(this).is(":checked")) {
            $("#modal_seccionSistemas").removeClass("d-none");
        } else {
            $("#modal_seccionSistemas").addClass("d-none").find("input:checkbox").prop("checked", false);
            $("#modal_txtOtrosSistemas").addClass("d-none").val("");
        }
    });

    $("#modal_chkOtros").on("change", function () {
        var marcado = $(this).is(":checked");
        $("#modal_txtOtrosSistemas").toggleClass("d-none", !marcado);
        if (marcado) $("#modal_txtOtrosSistemas").focus();
        else $("#modal_txtOtrosSistemas").val("");
    });

    $("#modal_chkHabilitarRed").on("change", function () {
        mostrarDesplegable($(this), $("#modal_divContenedorRed"));
    });

    $("#modal_chkConfigurarImpresora").on("change", function () {
        mostrarDesplegable($(this), $("#modal_divContenedorImpresora"));
        if (!$(this).is(":checked")) $("#modal_txtDetalleImpresora").val("");
    });

    $("#btnGuardarCambiosModal").on("click", function () {
        var sistemas = $(".custom-modal-sistemas-chk:checked").map(function () {
            return $(this).val();
        }).get();

        var nuevoApunte = $.trim($("#modal_DescripcionProblema").val());

        var dto = {
            idSolicitud: parseInt($("#modal_IdSolicitud").val()),
            fechaIngreso: $("#modal_FechaIngreso").val(),
            fechaEntrega: $("#modal_FechaEntrega").val() || null,
            estatus: estatusActual === "Por autorizar" ? estatusActual : $("input[name='modal_Estatus']:checked").val(),
            idPersonal: parseInt($("#modal_IdPersonal").val()) || 0,
            puestoSolicitante: $("#modal_Puesto").val(),
            correoSolicitante: $("#modal_Correo").val(),
            nuevaUnidadRed: $("#modal_chkHabilitarRed").is(":checked") ? $("#modal_txtDetalleRed").val() : null,
            tieneImpresoraConfigurada: $("#modal_config_si").is(":checked") ? "Si" : "No",
            detalleImpresora: $("#modal_chkConfigurarImpresora").is(":checked") ? $("#modal_txtDetalleImpresora").val() : null,
            reqSistemas: $("#modal_chkReqSistemas").is(":checked"),
            sistemasDetalle: sistemas.length > 0 ? sistemas.join(", ") : null,
            otrosSistemas: $("#modal_chkOtros").is(":checked") ? $("#modal_txtOtrosSistemas").val() : null,
            descripcionProblema: nuevoApunte === "" ? historialCompletoGuardado : nuevoApunte,
            ejecutivoAsignado: $("#modal_EjecutivoAsignado").val(),
            autorizaAdmin: $("#modal_AutorizaAdmin").val()
        };

        if (!dto.fechaIngreso) {
            mostrarAdvertencia("Capture la fecha de ingreso.");
            return;
        }

        $("#modalSolicitud").modal("hide");
        $("#loaderFiltro").removeClass("d-none");

        $.ajax({
            type: "POST",
            url: "/Solicitudes/Consultar?handler=EditarSolicitud",
            contentType: "application/json; charset=utf-8",
            headers: { "RequestVerificationToken": tokenSolicitudes() },
            data: JSON.stringify(dto)
        })
            .done(function (response) {
                $("#loaderFiltro").addClass("d-none");
                if (response.success) {
                    mostrarExito("Los cambios se guardaron correctamente.", "Solicitud actualizada")
                        .then(() => window.location.reload());
                } else {
                    mostrarError(escaparHtml(response.message));
                }
            })
            .fail(function () {
                $("#loaderFiltro").addClass("d-none");
                mostrarError("No se pudo actualizar la solicitud.");
            });
    });

    /* ---------- Eliminar ---------- */

    $(".btn-eliminar").on("click", function () {
        var idEliminar = $(this).data("id");

        mostrarConfirmacion({
            icono: "warning",
            titulo: "¿Eliminar solicitud?",
            mensaje: "Se borrará definitivamente el folio <b>" + String(idEliminar).padStart(4, "0") + "</b>.",
            textoConfirmar: "Sí, eliminar",
            alConfirmar: function () {
                $("#loaderFiltro").removeClass("d-none");

                $.ajax({
                    type: "POST",
                    url: "/Solicitudes/Consultar?handler=EliminarSolicitud",
                    headers: { "RequestVerificationToken": tokenSolicitudes() },
                    data: { id: idEliminar }
                })
                    .done(function (response) {
                        $("#loaderFiltro").addClass("d-none");
                        if (response.success) {
                            mostrarExito("La solicitud fue eliminada.", "Eliminada")
                                .then(() => window.location.reload());
                        } else {
                            mostrarError(escaparHtml(response.message));
                        }
                    })
                    .fail(function () {
                        $("#loaderFiltro").addClass("d-none");
                        mostrarError("No se pudo eliminar la solicitud.");
                    });
            }
        });
    });

    aplicarPaginacionYFiltro();
});

/* ==========================================================================
   GENERAR SOLICITUD
   ========================================================================== */

$(document).ready(function () {

    if (!$("#formSolicitud").length) return;

    /* La fecha de realización solo se captura cuando la solicitud se marca como resuelta */
    function actualizarFechaEntrega() {
        var $fechaEntrega = $("#txtFechaEntrega");

        if ($("#estatusResuelto").is(":checked")) {
            $fechaEntrega.prop("disabled", false);
            if (!$fechaEntrega.val()) $fechaEntrega.val(new Date().toLocaleDateString("en-CA"));
        } else {
            $fechaEntrega.prop("disabled", true).val("");
        }
    }

    actualizarFechaEntrega();
    $("input[name='NuevaSolicitud.Estatus']").on("change", actualizarFechaEntrega);
    $("#formSolicitud").on("submit", function (e) {
        e.preventDefault();

        Swal.fire({
            title: "Guardando solicitud",
            text: "Registrando los datos...",
            background: "#0f172a",
            color: "#f8fafc",
            customClass: { popup: "swal-dark-blue" },
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            type: "POST",
            url: window.location.pathname,
            data: $(this).serialize()
        })
            .done(function (response) {
                if (response.success) {
                    var irAConsultar = () => { window.location.href = "/Solicitudes/Consultar"; };

                    if (!response.autorizador) {
                        mostrarExito("La solicitud se registró correctamente.", "¡Solicitud generada!").then(irAConsultar);
                    } else if (response.administradorNotificado) {
                        mostrarExito(
                            "Se ha enviado la autorización a <b>" + escaparHtml(response.autorizador) +
                            "</b> para que autorice el requerimiento.",
                            "¡Solicitud generada!"
                        ).then(irAConsultar);
                    } else {
                        // El administrador elegido no tiene usuario ligado en Administración de Personal
                        mostrarAlerta(
                            "warning",
                            "Solicitud generada",
                            "La solicitud quedó pendiente por autorizar, pero <b>" + escaparHtml(response.autorizador) +
                            "</b> no tiene un usuario del sistema ligado en Administración de Personal y no se le pudo enviar la notificación."
                        ).then(irAConsultar);
                    }
                } else {
                    mostrarError(escaparHtml(response.message || "No se pudo guardar la solicitud."));
                }
            })
            .fail(function () {
                mostrarError("No se pudo comunicar con el servidor.");
            });
    });

    $("#ddlArea").on("change", function () {
        var area = $(this).val();
        var $combo = $("#ddlPersonal");

        $("#txtCorreo, #txtPuesto, #txtResponsable").val("");

        if (!area) {
            $combo.empty().append('<option value="">Primero seleccione un área</option>');
            return;
        }

        $combo.empty().append('<option value="">Seleccione personal</option>');
        $.getJSON(window.location.pathname + "?handler=FiltrarPersonal", { area: area }, function (personal) {
            var jefe = llenarComboPersonal($combo, personal, 0);
            $("#txtResponsable").val(jefe);
        });
    });

    $("#ddlPersonal").on("change", function () {
        var $opcion = $(this).find("option:selected");
        $("#txtCorreo").val($opcion.data("correo") || "");
        $("#txtPuesto").val($opcion.data("puesto") || "");
    });

    $("#chkReqSistemas").on("change", function () {
        if ($(this).is(":checked")) {
            $("#seccionSistemas").removeClass("d-none");
        } else {
            $("#seccionSistemas").addClass("d-none").find("input:checkbox").prop("checked", false);
            $("#txtOtrosSistemas").addClass("d-none").val("");
        }
    });

    $("#chkOtros").on("change", function () {
        var marcado = $(this).is(":checked");
        $("#txtOtrosSistemas").toggleClass("d-none", !marcado);
        if (marcado) $("#txtOtrosSistemas").focus();
        else $("#txtOtrosSistemas").val("");
    });

    $("#chkHabilitarRed").on("change", function () {
        var marcado = $(this).is(":checked");
        $("#divContenedorRed").toggleClass("d-none", !marcado);
        if (marcado) $("#txtDetalleRed").focus();
        else $("#txtDetalleRed").val("");
    });

    $("#chkConfigurarImpresora").on("change", function () {
        var marcado = $(this).is(":checked");
        $("#divContenedorImpresora").toggleClass("d-none", !marcado);
        if (marcado) $("#txtDetalleImpresora").focus();
        else $("#txtDetalleImpresora").val("");
    });
});
