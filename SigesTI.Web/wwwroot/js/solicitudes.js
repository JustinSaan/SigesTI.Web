/* ==========================================================================
   MÓDULO CONSULTA DE SOLICITUDES
   ========================================================================== */

$(document).ready(function () {

    var historialCompletoGuardado = "";
    let paginaActual = 1;
    let filasPorPagina = parseInt($("#itemsPorPagina").val());

    function aplicarPaginacionYFiltro() {
        filasPorPagina = parseInt($("#itemsPorPagina").val());
        var filterValue = $("#inputFiltroReactivo").val().trim().toLowerCase();
        var $rows = $("#tablaBitacoraPrincipal tbody tr").not(".no-data-fallback, #angularNoDataRow");

        $rows.each(function () {
            var rowText = $(this).text().toLowerCase();
            if (filterValue === "" || rowText.indexOf(filterValue) > -1) {
                $(this).addClass("coincide-con-busqueda");
            } else {
                $(this).removeClass("coincide-con-busqueda").addClass("d-none");
            }
        });

        var $filasFiltradas = $("#tablaBitacoraPrincipal tbody tr.coincide-con-busqueda");
        var totalRegistros = $filasFiltradas.length;

        if (totalRegistros === 0) {
            if (filterValue !== "") {
                $("#filterQueryValue").text($("#inputFiltroReactivo").val());
                $("#angularNoDataRow").removeClass("d-none");
            }
            $("#contenedorControlesPagina").empty();
            $("#infoPaginacion").text("Mostrando 0-0 de 0 registros");
            return;
        } else {
            $("#angularNoDataRow").addClass("d-none");
        }

        var totalPaginas = Math.ceil(totalRegistros / filasPorPagina);
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;
        if (paginaActual < 1) paginaActual = 1;

        var indiceInicial = (paginaActual - 1) * filasPorPagina;
        var indiceFinal = indiceInicial + filasPorPagina;

        $rows.addClass("d-none");
        $filasFiltradas.slice(indiceInicial, indiceFinal).removeClass("d-none");

        var registroHasta = indiceFinal > totalRegistros ? totalRegistros : indiceFinal;
        $("#infoPaginacion").text(`Mostrando ${indiceInicial + 1}-${registroHasta} de ${totalRegistros} registros`);

        dibujarBotonesNavegacion(totalPaginas);
    }

    function dibujarBotonesNavegacion(totalPaginas) {
        var $contenedor = $("#contenedorControlesPagina");
        $contenedor.empty();

        var deshabilitadoAnt = (paginaActual === 1) ? "disabled" : "";
        $contenedor.append(`<li class="page-item ${deshabilitadoAnt}"><a class="page-link" data-page="${paginaActual - 1}" href="#"><i class="bi bi-arrow-left"></i></a></li>`);

        for (var i = 1; i <= totalPaginas; i++) {
            var activoNum = (i === paginaActual) ? "active" : "";
            $contenedor.append(`<li class="page-item ${activoNum}"><a class="page-link" data-page="${i}" href="#">${i}</a></li>`);
        }

        var deshabilitadoSig = (paginaActual === totalPaginas) ? "disabled" : "";
        $contenedor.append(`<li class="page-item ${deshabilitadoSig}"><a class="page-link" data-page="${paginaActual + 1}" href="#"><i class="bi bi-arrow-right"></i></a></li>`);
    }

    $(document).on("click", "#contenedorControlesPagina .page-link", function (e) {
        e.preventDefault();
        var targetPage = $(this).data("page");
        if (targetPage && !$(this).parent().hasClass("disabled") && !$(this).parent().hasClass("active")) {
            paginaActual = parseInt(targetPage);
            aplicarPaginacionYFiltro();
        }
    });

    $("#itemsPorPagina").change(function () {
        paginaActual = 1;
        aplicarPaginacionYFiltro();
    });

    $("#inputFiltroReactivo").on("keyup", function () {
        paginaActual = 1;
        aplicarPaginacionYFiltro();
    });

    $("#formFiltros").on("submit", function () {
        $("#loaderFiltro").removeClass("d-none");
    });

    $(".filtro-servidor-auto").on("change", function () {
        $("#loaderFiltro").removeClass("d-none");
        $("#formFiltros").submit();
    });

    $("#btnGenerarReporteSolicitudes").on("click", function () {
        const params = new URLSearchParams();

        const fechaInicio = $("#reporteFechaInicio").val();
        const fechaFin = $("#reporteFechaFin").val();
        const area = $("#reporteArea").val();
        const solicitante = $("#reporteSolicitante").val();
        const estatus = $("#reporteEstatus").val();

        if (fechaInicio) params.append("fechaInicio", fechaInicio);
        if (fechaFin) params.append("fechaFin", fechaFin);
        if (area) params.append("area", area);
        if (solicitante) params.append("solicitante", solicitante);
        if (estatus) params.append("estatus", estatus);

        const urlReporte = "/Solicitudes/Consultar?handler=ReporteSolicitudes&" + params.toString();

        document.activeElement.blur();

        $("#modalExportarSolicitudes").modal("hide");

        $("#reporteLoading").css("display", "flex");
        $("#iframeReporteSolicitudes").css("display", "none").removeAttr("src").removeAttr("srcdoc");

        $("#modalVistaReporte").modal("show");

        fetch(urlReporte)
            .then(response => response.text())
            .then(html => {
                $("#iframeReporteSolicitudes").attr("srcdoc", html);

                $("#reporteLoading").css("display", "none");
                $("#iframeReporteSolicitudes").css("display", "block");
            });
    });

    $("#modalVistaReporte").on("hidden.bs.modal", function () {
        $("#iframeReporteSolicitudes").removeAttr("src").removeAttr("srcdoc").css("display", "none");
        $("#reporteLoading").css("display", "flex");
    });

    function actualizarColorEstatusModal() {
        const $estatus = $("#modal_Estatus");

        $estatus.removeClass("estatus-pendiente estatus-resuelto");

        if ($estatus.val() === "Pendiente") {
            $estatus.addClass("estatus-pendiente");
        }
        else if ($estatus.val() === "Resuelto") {
            $estatus.addClass("estatus-resuelto");
        }
    }
    $("#modal_Estatus").change(actualizarColorEstatusModal);

    $(".btn-visualizar, .btn-editar-directo").on("click", function () {
        var idSol = $(this).data("id");
        var esModoEdicionDirecta = $(this).hasClass("btn-editar-directo");

        $("#loaderFiltro").removeClass("d-none");

        $.ajax({
            type: "GET",
            url: "?handler=DetalleSolicitud",
            data: { id: idSol },
            success: function (data) {
                $("#loaderFiltro").addClass("d-none");
                if (!data) {
                    Swal.fire("Error", "No se encontraron los datos de la solicitud.", "error");
                    return;
                }

                historialCompletoGuardado = data.descripcionProblema || "";

                $("#modal_IdSolicitud").val(data.idSolicitud);
                $("#modal_FechaIngreso").val(data.fechaIngreso);
                $("#modal_FechaEntrega").val(data.fechaEntrega ? data.fechaEntrega : "");
                $("#modal_Estatus").val(data.estatus);
                $("#modal_Area").val(data.area);
                $("#modal_Puesto").val(data.puesto);
                $("#modal_Correo").val(data.correo);
                $("#modal_Responsable").val(data.responsableArea);
                $("#modal_UnidadesRed").val(data.unidadesRed);
                $("#modal_EjecutivoAsignado").val(data.ejecutivoAsignado);
                $("#modal_AutorizaAdmin").val(data.autorizaAdmin);

                cargarPersonalModal(data.area, data.idPersonal);

                $(".chk-modal-impresora-grupo").prop("checked", false);
                if (data.impresoraConfigurada === "Si") {
                    $("#modal_config_si").prop("checked", true);
                } else {
                    $("#modal_config_no").prop("checked", true);
                }

                if (data.reqSistemas) {
                    $("#modal_chkReqSistemas").prop("checked", true);
                    $("#modal_seccionSistemas").removeClass("d-none");
                    $("#modal_bloque_global_sistemas").removeClass("d-none");

                    $(".custom-modal-sistemas-chk").prop("checked", false);
                    if (data.sistemasDetalle) {
                        var arreglosSistemas = data.sistemasDetalle.split(", ");
                        $.each(arreglosSistemas, function (i, val) {
                            $(".custom-modal-sistemas-chk[value='" + val + "']").prop("checked", true);
                        });
                    }
                } else {
                    $("#modal_chkReqSistemas").prop("checked", false);
                    $("#modal_seccionSistemas").addClass("d-none");
                    if (!esModoEdicionDirecta) $("#modal_bloque_global_sistemas").addClass("d-none");
                }

                if (data.otrosSistemas) {
                    $("#modal_chkOtros").prop("checked", true);
                    $("#modal_txtOtrosSistemas").removeClass("d-none").val(data.otrosSistemas);
                } else {
                    $("#modal_chkOtros").prop("checked", false);
                    $("#modal_txtOtrosSistemas").addClass("d-none").val('');
                }

                if (data.nuevaUnidadRed) {
                    $("#modal_chkHabilitarRed").prop("checked", true);
                    $("#modal_divContenedorRed").removeClass("d-none");
                    $("#modal_txtDetalleRed").val(data.nuevaUnidadRed);
                } else {
                    $("#modal_chkHabilitarRed").prop("checked", false);
                    $("#modal_divContenedorRed").addClass("d-none");
                    $("#modal_txtDetalleRed").val("");
                }

                if (data.detalleImpresora && $.trim(data.detalleImpresora) !== "") {
                    $("#modal_chkConfigurarImpresora").prop("checked", true);
                    $("#modal_divContenedorImpresora").removeClass("d-none");
                    $("#modal_txtDetalleImpresora").val(data.detalleImpresora);
                    $("#modal_bloque_impresora").removeClass("d-none");
                } else {
                    $("#modal_chkConfigurarImpresora").prop("checked", false);
                    $("#modal_divContenedorImpresora").addClass("d-none").find('input').val('');
                    if (!esModoEdicionDirecta) $("#modal_bloque_impresora").addClass("d-none");
                }

                actualizarColorEstatusModal();

                if (esModoEdicionDirecta) {
                    activarEdicionModal();
                } else {
                    $("#modal_DescripcionProblema").val(historialCompletoGuardado);
                    $("#lblDescripcionModal").text("Historial Acumulativo de Revisiones (Modo Lectura):");
                    bloquearCamposModal();
                }

                $("#modalSolicitud").modal("show");
            },
            error: function () {
                $("#loaderFiltro").addClass("d-none");
                Swal.fire("Error", "Error crítico al comunicar con el servidor de bases de datos.", "error");
            }
        });
    });

    function bloquearCamposModal() {
        $(".ctrl-modal").prop("disabled", true);
        $("#btnLiberarEdicion").removeClass("d-none");
        $("#btnGuardarCambiosModal").addClass("d-none");
    }

    function activarEdicionModal() {
        $(".ctrl-modal").prop("disabled", false);
        $("#btnLiberarEdicion").addClass("d-none");
        $("#btnGuardarCambiosModal").removeClass("d-none");

        $("#modal_DescripcionProblema").val('').attr("placeholder", "Escriba aquí el nuevo apunte o relatoría técnica (se agregará arriba del historial previo)...");
        $("#lblDescripcionModal").html('<i class="bi bi-pencil-fill text-success"></i> Agregar nueva actualización al Historial:');

        $("#modal_bloque_global_sistemas, #modal_bloque_red, #modal_bloque_impresora").removeClass("d-none");
    }

    $("#btnLiberarEdicion").on("click", function () {
        activarEdicionModal();
    });

    function cargarPersonalModal(areaName, idSeleccionar) {
        var $ddl = $("#modal_IdPersonal");
        $ddl.empty().append('<option value="">-- Seleccione Personal --</option>');

        if (areaName) {
            $.getJSON('?handler=FiltrarPersonal', { area: areaName }, function (data) {
                var jefe = "";
                $.each(data, function (i, item) {
                    if (item.esResponsable) jefe = item.nombre;
                    var selected = (item.id == idSeleccionar) ? "selected" : "";
                    $ddl.append('<option value="' + item.id + '" data-correo="' + item.correo + '" data-puesto="' + item.puesto + '" ' + selected + '>' + item.nombre + '</option>');
                });
                if (jefe) $("#modal_Responsable").val(jefe);
            });
        }
    }

    $("#modal_Area").change(function () {
        $("#modal_Puesto, #modal_Correo, #modal_Responsable").val('');
        cargarPersonalModal($(this).val(), 0);
    });

    $("#modal_IdPersonal").change(function () {
        var $opt = $(this).find('option:selected');
        if ($(this).val()) {
            $("#modal_Correo").val($opt.data('correo'));
            $("#modal_Puesto").val($opt.data('puesto'));
        } else {
            $("#modal_Correo, #modal_Puesto").val('');
        }
    });

    $(".chk-modal-impresora-grupo").change(function () {
        $(".chk-modal-impresora-grupo").not(this).prop('checked', false);
        if ($(".chk-modal-impresora-grupo:checked").length == 0) $("#modal_config_no").prop('checked', true);
    });

    $("#modal_chkReqSistemas").change(function () {
        if ($(this).is(':checked')) {
            $("#modal_seccionSistemas").removeClass('d-none');
        } else {
            $("#modal_seccionSistemas").addClass('d-none').find("input:checkbox").prop('checked', false);
            $("#modal_txtOtrosSistemas").addClass('d-none').val('');
        }
    });

    $("#modal_chkOtros").change(function () {
        if ($(this).is(':checked')) $("#modal_txtOtrosSistemas").removeClass('d-none').focus();
        else $("#modal_txtOtrosSistemas").addClass('d-none').val('');
    });

    $("#modal_chkHabilitarRed").change(function () {
        if ($(this).is(':checked')) {
            $("#modal_divContenedorRed").removeClass('d-none').find('input').focus();
        } else {
            $("#modal_divContenedorRed").addClass('d-none');
        }
    });

    $("#modal_chkConfigurarImpresora").change(function () {
        if ($(this).is(':checked')) $("#modal_divContenedorImpresora").removeClass('d-none').find('input').focus();
        else $("#modal_divContenedorImpresora").addClass('d-none').find('input').val('');
    });

    $("#btnGuardarCambiosModal").on("click", function () {
        var sistemasArr = [];
        $(".custom-modal-sistemas-chk:checked").each(function () {
            sistemasArr.push($(this).val());
        });

        var tieneImpresoraVal = $("#modal_config_si").is(":checked") ? "Si" : "No";
        var detalleImpresoraVal = null;

        if ($("#modal_chkConfigurarImpresora").is(":checked")) {
            detalleImpresoraVal = $("#modal_txtDetalleImpresora").val();
        }

        var nuevoApunteIngresado = $("#modal_DescripcionProblema").val();
        var stringProblemaFinal = $.trim(nuevoApunteIngresado) === "" ? historialCompletoGuardado : nuevoApunteIngresado;

        var fEntregaVal = $("#modal_FechaEntrega").val();
        if ($.trim(fEntregaVal) === "") fEntregaVal = null;

        var unidadesRedFinal = null;
        if ($("#modal_chkHabilitarRed").is(":checked")) {
            unidadesRedFinal = $("#modal_txtDetalleRed").val();
        } else {
            unidadesRedFinal = $("#modal_txtDetalleRed").val() || null;
        }

        var dto = {
            idSolicitud: parseInt($("#modal_IdSolicitud").val()),
            fechaIngreso: $("#modal_FechaIngreso").val(),
            fechaEntrega: fEntregaVal,
            estatus: $("#modal_Estatus").val(),
            idPersonal: parseInt($("#modal_IdPersonal").val()) || 0,
            puestoSolicitante: $("#modal_Puesto").val(),
            correoSolicitante: $("#modal_Correo").val(),
            unidadesRed: unidadesRedFinal,
            nuevaUnidadRed: $("#modal_chkHabilitarRed").is(":checked") ? $("#modal_txtDetalleRed").val() : null,
            tieneImpresoraConfigurada: tieneImpresoraVal,
            detalleImpresora: $("#modal_chkConfigurarImpresora").is(":checked") ? $("#modal_txtDetalleImpresora").val() : null,
            reqSistemas: $("#modal_chkReqSistemas").is(":checked"),
            sistemasDetalle: sistemasArr.length > 0 ? sistemasArr.join(", ") : null,
            otrosSistemas: $("#modal_chkOtros").is(":checked") ? $("#modal_txtOtrosSistemas").val() : null,
            descripcionProblema: stringProblemaFinal,
            ejecutivoAsignado: $("#modal_EjecutivoAsignado").val(),
            autorizaAdmin: $("#modal_AutorizaAdmin").val()
        };

        if (!dto.fechaIngreso || !dto.descripcionProblema) {
            Swal.fire("Atención", "Por favor completa la descripción de la falla obligatoriamente.", "warning");
            return;
        }

        $("#modalSolicitud").modal("hide");
        $("#loaderFiltro").removeClass("d-none");

        $.ajax({
            type: "POST",
            url: "/Solicitudes/Consultar?handler=EditarSolicitud",
            contentType: "application/json; charset=utf-8",
            headers: { "RequestVerificationToken": $('input:hidden[name="__RequestVerificationToken"]').val() },
            data: JSON.stringify(dto),
            success: function (response) {
                $("#loaderFiltro").addClass("d-none");
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        iconColor: '#34d399',
                        title: '¡Solicitud Modificada!',
                        text: 'Cambios realizados con éxito en el sistema.',
                        customClass: {
                            popup: 'swal-dark-custom',
                            title: 'swal-dark-custom',
                            htmlContainer: 'swal-dark-custom'
                        },
                        confirmButtonText: 'Aceptar'
                    }).then(() => { window.location.reload(); });
                } else {
                    Swal.fire("Error", "Hubo un problema de validación: " + (response.message || ""), "error");
                }
            },
            error: function (xhr) {
                $("#loaderFiltro").addClass("d-none");
                Swal.fire("Error", "No se pudo actualizar el registro. Revise consola de Red (F12).", "error");
            }
        });
    });

    $(".btn-eliminar").on("click", function () {
        var idEliminar = $(this).data("id");

        Swal.fire({
            title: '¿Está seguro de eliminar?',
            text: "Esta acción borrará definitivamente el folio " + idEliminar + " de SQL Server.",
            icon: 'warning',
            iconColor: '#fbbf24',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'swal-dark-custom',
                title: 'swal-dark-custom',
                htmlContainer: 'swal-dark-custom'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                $("#loaderFiltro").removeClass("d-none");

                $.ajax({
                    type: "POST",
                    url: "/Solicitudes/Consultar?handler=EliminarSolicitud",
                    headers: { "RequestVerificationToken": $('input:hidden[name="__RequestVerificationToken"]').val() },
                    data: { id: idEliminar },
                    success: function (response) {
                        $("#loaderFiltro").addClass("d-none");
                        if (response.success) {
                            Swal.fire('¡Eliminado!', 'El folio fue removido de la bitácora.', 'success')
                                .then(() => { window.location.reload(); });
                        } else {
                            Swal.fire('Error', response.message, 'error');
                        }
                    },
                    error: function () {
                        $("#loaderFiltro").addClass("d-none");
                        Swal.fire('Error', 'Error de enlace. Comuníquese con el administrador del sistema.', 'error');
                    }
                });
            }
        });
    });

    aplicarPaginacionYFiltro();

});

/* ==========================================================================
   MÓDULO SOLICITUDES: FORMULARIO DE CAPTURA Y EDICIÓN
   ========================================================================== */

$(document).ready(function () {

    // ========================================================
    // INTERACTIVIDAD: ACTUALIZACIÓN DINÁMICA DE COLOR DE ESTATUS
    // ========================================================
    function actualizarColorEstatus() {
        var valor = $("#estatusCombo").val();
        if (valor === "Pendiente") {
            // Rojo vivo de alta visibilidad con fondo suave
            $("#estatusCombo").css({ "color": "#e01b2f", "background-color": "#fff2f3", "border-color": "#ffb6bc" });
        } else if (valor === "Resuelto") {
            // Verde vivo brillante con fondo suave
            $("#estatusCombo").css({ "color": "#129e3b", "background-color": "#f1faf3", "border-color": "#a1e4b4" });
        } else {
            $("#estatusCombo").css({ "color": "#212529", "background-color": "#fff", "border-color": "#ced4da" });
        }
    }

    // Ejecutar al iniciar la pantalla y al cambiar selección
    actualizarColorEstatus();
    $("#estatusCombo").change(actualizarColorEstatus);


    // ==========================================
    // TU INTERCEPTOR AJAX ORIGINAL PARA SWEETALERT2
    // ==========================================
    $("#formSolicitud").on("submit", function (e) {
        e.preventDefault();

        var form = $(this);
        var url = form.attr('action') || window.location.href;
        var formData = form.serialize();

        Swal.fire({
            title: 'Procesando Solicitud',
            text: 'Guardando datos en la bitácora...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            type: "POST",
            url: url,
            data: formData,
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Solicitud Guardada con Éxito!',
                        text: 'El folio y tiempos se registraron correctamente.',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#129e3b',
                        allowOutsideClick: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "https://localhost:7160/Solicitudes/Consultar";
                        }
                    });
                }
            },
            error: function (xhr) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al procesar el formulario',
                    text: xhr.responseText || 'Verifica que las llaves foráneas de Personal correspondan con IDs válidos.',
                    confirmButtonColor: '#e01b2f'
                });
            }
        });
    });

    // Tu lógica original de filtrado de Personal por Área
    $("#ddlArea").change(function () {
        var areaSeleccionada = $(this).val();
        var $ddlPersonal = $("#ddlPersonal");

        $ddlPersonal.empty().append('<option value="">-- Seleccione Personal --</option>');
        $("#txtCorreo").val('');
        $("#txtPuesto").val('');
        $("#txtResponsable").val('');

        if (areaSeleccionada) {
            $.getJSON('?handler=FiltrarPersonal', { area: areaSeleccionada }, function (data) {
                var jefeDelArea = "";
                $.each(data, function (i, item) {
                    if (item.esResponsable === true) {
                        jefeDelArea = item.nombre;
                    }

                    $ddlPersonal.append(
                        '<option value="' + item.id +
                        '" data-correo="' + item.correo +
                        '" data-puesto="' + item.puesto +
                        '" data-unidades="' + (item.unidadesRed || '') +
                        '">' + item.nombre + '</option>');
                });

                if (jefeDelArea !== "") {
                    $("#txtResponsable").val(jefeDelArea);
                } else {
                    $("#txtResponsable").val("Sin jefe asignado");
                }
            });
        }
    });

    $("#ddlPersonal").change(function () {
        var $opcionSeleccionada = $(this).find('option:selected');
        if ($(this).val()) {
            $("#txtCorreo").val($opcionSeleccionada.data('correo'));
            $("#txtPuesto").val($opcionSeleccionada.data('puesto'));
            $("#txtUnidadesRed").val($opcionSeleccionada.data('unidades'));
        } else {
            $("#txtCorreo").val('');
            $("#txtPuesto").val('');
            $("#txtUnidadesRed").val('');
        }
    });

    $(".chk-impresora-grupo").change(function () {
        $(".chk-impresora-grupo").not(this).prop('checked', false);
        if ($(".chk-impresora-grupo:checked").length == 0) {
            $("#config_no").prop('checked', true);
        }
    });

    $("#chkReqSistemas").change(function () {
        if ($(this).is(':checked')) {
            $("#seccionSistemas").removeClass('d-none');
        } else {
            $("#seccionSistemas").addClass('d-none');
            $("#seccionSistemas input:checkbox").prop('checked', false);
            $("#txtOtrosSistemas").addClass('d-none').val('');
        }
    });

    $("#chkOtros").change(function () {
        if ($(this).is(':checked')) {
            $("#txtOtrosSistemas").removeClass('d-none').focus();
        } else {
            $("#txtOtrosSistemas").addClass('d-none').val('');
        }
    });

    $("#chkHabilitarRed").change(function () {
        if ($(this).is(':checked')) {
            $("#divContenedorRed").removeClass('d-none');
            $("#txtDetalleRed").focus();
        } else {
            $("#divContenedorRed").addClass('d-none').find('input').val('');
        }
    });

    $("#chkConfigurarImpresora").change(function () {
        if ($(this).is(':checked')) {
            $("#divContenedorImpresora").removeClass('d-none');
            $("#txtDetalleImpresora").focus();
        } else {
            $("#divContenedorImpresora").addClass('d-none').find('input').val('');
        }
    });
});