"use strict";

/* ==========================================================================
   MENÚ DEL USUARIO: CAMBIAR CONTRASEÑA
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("formCambiarPassword");
    const modal = document.getElementById("modalCambiarPassword");

    if (!form || !modal) {
        return;
    }

    // Al cerrar el modal se limpian los campos
    modal.addEventListener("hidden.bs.modal", function () {
        form.reset();
    });

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const boton = document.getElementById("btnGuardarPassword");
        boton.disabled = true;

        try {
            const respuesta = await fetch(form.action, {
                method: "POST",
                body: new FormData(form)
            });

            const datos = await respuesta.json();

            if (!datos.success) {
                mostrarError(datos.message);
                return;
            }

            bootstrap.Modal.getInstance(modal).hide();
            mostrarExito(datos.message, "Contraseña actualizada");
        } catch {
            mostrarError("No fue posible cambiar la contraseña. Intenta de nuevo.");
        } finally {
            boton.disabled = false;
        }
    });
});
