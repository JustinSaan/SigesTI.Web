/* ==========================================================================
   NOTIFICACIONES (campana del layout)
   Los datos salen de Pages/Notificaciones.cshtml.cs.
   ========================================================================== */

/* Icono de cada tipo de notificación (TiposNotificacion en Models/Notificacion.cs) */
var ICONOS_NOTIFICACION = {
    AutorizacionRequerida: { clase: "autorizacion", icono: "bi-shield-exclamation" },
    AutorizacionAtendida: { clase: "atendida", icono: "bi-shield-check" },
    PendientesSoporte: { clase: "pendientes", icono: "bi-tools" },
    RequerimientoAutorizado: { clase: "autorizado", icono: "bi-patch-check-fill" },
    RecordatorioAutorizacion: { clase: "recordatorio", icono: "bi-alarm-fill" },
    RequerimientoResuelto: { clase: "atendida", icono: "bi-check2-circle" }
};

var solicitudEnVistaPrevia = null;

function tokenNotificaciones() {
    return $('input[name="__RequestVerificationToken"]').first().val();
}

/* "hace 5 min", "hace 2 h", "ayer"... */
function tiempoTranscurrido(fechaTexto) {
    var minutos = Math.floor((Date.now() - new Date(fechaTexto).getTime()) / 60000);

    if (minutos < 1) return "Justo ahora";
    if (minutos < 60) return "Hace " + minutos + " min";

    var horas = Math.floor(minutos / 60);
    if (horas < 24) return "Hace " + horas + " h";

    var dias = Math.floor(horas / 24);
    if (dias === 1) return "Ayer";
    if (dias < 7) return "Hace " + dias + " días";

    return new Date(fechaTexto).toLocaleDateString("es-MX");
}

function cargarNotificaciones() {
    $.getJSON("/Notificaciones?handler=Listar", function (data) {
        var $contador = $("#contadorNotificaciones");
        var $lista = $("#listaNotificaciones").empty();

        $contador.text(data.noLeidas > 99 ? "99+" : data.noLeidas).toggleClass("d-none", data.noLeidas === 0);
        $("#btnNotificaciones").toggleClass("con-avisos", data.noLeidas > 0);

        if (data.lista.length === 0) {
            $lista.html('<div class="notif-vacio"><i class="bi bi-bell-slash"></i>No tienes notificaciones.</div>');
            return;
        }

        $.each(data.lista, function (i, aviso) {
            var estilo = ICONOS_NOTIFICACION[aviso.tipo] || { clase: "", icono: "bi-bell" };

            var $item = $("<button type='button' class='notif-item'>")
                .toggleClass("no-leida", !aviso.leida)
                .data("aviso", aviso);

            $("<span class='notif-item-icono'>").addClass(estilo.clase)
                .append($("<i class='bi'>").addClass(estilo.icono))
                .appendTo($item);

            $("<span class='notif-item-texto'>")
                .append($("<span class='notif-item-mensaje'>").text(aviso.mensaje))
                .append($("<span class='notif-item-fecha'>").text(tiempoTranscurrido(aviso.fecha)))
                .appendTo($item);

            $lista.append($item);
        });
    });
}

/* Abre el formato del requerimiento; si el usuario es quien autoriza, muestra el botón */
function abrirVistaRequerimiento(idSolicitud) {
    $.getJSON("/Notificaciones?handler=Requerimiento", { id: idSolicitud }, function (data) {
        if (!data.success) {
            mostrarError(escaparHtml(data.message));
            return;
        }

        solicitudEnVistaPrevia = idSolicitud;

        $("#tituloVistaRequerimiento").text("Requerimiento #" + data.folio);
        $("#subtituloVistaRequerimiento").text(data.solicitante + " · " + data.estatus);
        $("#btnAutorizarRequerimiento").toggleClass("d-none", !data.puedeAutorizar);
        $("#iframeVistaRequerimiento").attr("src", "/Solicitudes/Formato?id=" + idSolicitud);

        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalVistaRequerimiento")).show();
    });
}

function autorizarRequerimiento() {
    var folio = $("#tituloVistaRequerimiento").text().replace("Requerimiento ", "");

    mostrarConfirmacion({
        icono: "question",
        titulo: "¿Autorizar requerimiento?",
        mensaje: "Se autorizará el requerimiento <b>" + escaparHtml(folio) + "</b> y se avisará al ejecutivo de soporte y al solicitante.",
        textoConfirmar: "Sí, autorizar",
        alConfirmar: function () {
            $.ajax({
                type: "POST",
                url: "/Notificaciones?handler=Autorizar",
                headers: { "RequestVerificationToken": tokenNotificaciones() },
                data: { id: solicitudEnVistaPrevia }
            })
                .done(function (response) {
                    if (!response.success) {
                        mostrarError(escaparHtml(response.message));
                        return;
                    }

                    $("#btnAutorizarRequerimiento").addClass("d-none");
                    $("#subtituloVistaRequerimiento").text("Requerimiento autorizado");
                    document.getElementById("iframeVistaRequerimiento").contentWindow.location.reload();
                    cargarNotificaciones();

                    mostrarExito(
                        "El requerimiento <b>#" + response.folio + "</b> quedó autorizado. Se notificó al ejecutivo de soporte y al solicitante.",
                        "Requerimiento autorizado"
                    ).then(function () {
                        // En Consultar se recarga para que la tabla muestre el nuevo estatus
                        if (window.location.pathname.toLowerCase().startsWith("/solicitudes/consultar")) {
                            window.location.reload();
                        }
                    });
                })
                .fail(function () {
                    mostrarError("No se pudo autorizar el requerimiento.");
                });
        }
    });
}

$(document).ready(function () {

    if (!$("#btnNotificaciones").length) return;

    cargarNotificaciones();
    setInterval(cargarNotificaciones, 60000);

    document.getElementById("btnNotificaciones").addEventListener("show.bs.dropdown", cargarNotificaciones);

    $("#listaNotificaciones").on("click", ".notif-item", function () {
        var aviso = $(this).data("aviso");

        if (!aviso.leida && aviso.tipo !== "AutorizacionRequerida") {
            $.ajax({
                type: "POST",
                url: "/Notificaciones?handler=Leer",
                headers: { "RequestVerificationToken": tokenNotificaciones() },
                data: { id: aviso.id }
            }).always(cargarNotificaciones);
        }

        bootstrap.Dropdown.getOrCreateInstance(document.getElementById("btnNotificaciones")).hide();

        if (aviso.idSolicitud) {
            abrirVistaRequerimiento(aviso.idSolicitud);
        } else if (aviso.tipo === "PendientesSoporte") {
            window.location.href = "/Solicitudes/Consultar";
        }
    });

    $("#btnLeerTodas").on("click", function () {
        $.ajax({
            type: "POST",
            url: "/Notificaciones?handler=LeerTodas",
            headers: { "RequestVerificationToken": tokenNotificaciones() }
        }).always(cargarNotificaciones);
    });

    $("#btnAutorizarRequerimiento").on("click", autorizarRequerimiento);

    $("#btnImprimirRequerimiento").on("click", function () {
        var iframe = document.getElementById("iframeVistaRequerimiento");
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    });

    $("#modalVistaRequerimiento").on("hidden.bs.modal", function () {
        $("#iframeVistaRequerimiento").removeAttr("src");
        solicitudEnVistaPrevia = null;
    });
});
