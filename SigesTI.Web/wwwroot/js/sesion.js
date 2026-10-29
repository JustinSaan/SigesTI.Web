"use strict";

/* ==========================================================================
   SESIÓN CADUCADA
   Si el servidor responde 401 a una petición hecha con JavaScript, la sesión
   ya se cerró: se avisa al usuario y al aceptar se le manda al Login.
   ========================================================================== */

var avisoSesionMostrado = false;

function avisarSesionCaducada() {
    if (avisoSesionMostrado) return;
    avisoSesionMostrado = true;

    Promise.resolve(mostrarAlerta(
        "warning",
        "Sesión caducada",
        "Tu sesión ha caducado por inactividad.<br>Vuelve a iniciar sesión."
    )).then(function () {
        window.location.href = "/InicioSesion/Login";
    });
}

/* Peticiones con jQuery */
$(document).ajaxError(function (evento, xhr) {
    if (xhr.status === 401) {
        avisarSesionCaducada();
    }
});

/* Peticiones con fetch: se marca como AJAX para que el servidor responda 401 en lugar de redirigir */
(function () {
    var fetchOriginal = window.fetch;

    window.fetch = function (url, opciones) {
        opciones = opciones || {};

        var encabezados = new Headers(opciones.headers || {});
        encabezados.set("X-Requested-With", "XMLHttpRequest");
        opciones.headers = encabezados;

        return fetchOriginal(url, opciones).then(function (respuesta) {
            if (respuesta.status === 401) {
                avisarSesionCaducada();
            }

            return respuesta;
        });
    };
})();
