"use strict";

/* ==========================================================================
   HELPERS DE CONVERSIÓN DE HORA (12H <-> 24H)
   ========================================================================== */

function convertir12a24(hora12Str) {
    if (!hora12Str) return "";
    
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(hora12Str.trim())) {
        return hora12Str.trim();
    }

    const match = hora12Str.match(/(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|AM|PM)?/i);
    if (!match) return "";

    let horas = parseInt(match[1], 10);
    const minutos = match[2];
    const meridiano = match[3] ? match[3].toLowerCase() : "";

    if ((meridiano.includes("p") || meridiano.includes("pm")) && horas < 12) {
        horas += 12;
    } else if ((meridiano.includes("a") || meridiano.includes("am")) && horas === 12) {
        horas = 0;
    }

    const hh = String(horas).padStart(2, "0");
    return `${hh}:${minutos}`;
}

function convertir24a12(hora24Str) {
    if (!hora24Str) return "";

    const partes = hora24Str.split(":");
    if (partes.length < 2) return hora24Str;

    let horas = parseInt(partes[0], 10);
    const minutos = partes[1];
    const meridiano = horas >= 12 ? "p. m." : "a. m.";

    horas = horas % 12;
    horas = horas ? horas : 12;

    const hh = String(horas).padStart(2, "0");
    return `${hh}:${minutos} ${meridiano}`;
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
   MENSAJES DEL SERVIDOR (TempData)
   Las páginas que los usan tienen los campos ocultos mensajeExito / mensajeError.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    if (typeof mostrarMensajesServidor === "function") {
        mostrarMensajesServidor();
    }
});
