"use strict";

/* ==========================================================================
   CAMBIAR ASPECTO (OSCURO / CLARO)
   El aspecto se guarda en el navegador. El script del <head> del Layout lo
   aplica al cargar; aquí solo se cambia con el botón del menú del usuario.
   ========================================================================== */

function temaClaroActivo() {
    return document.documentElement.getAttribute("data-tema") === "claro";
}

function cambiarTema() {
    const claro = !temaClaroActivo();

    if (claro) document.documentElement.setAttribute("data-tema", "claro");
    else document.documentElement.removeAttribute("data-tema");

    try {
        localStorage.setItem("tema", claro ? "claro" : "oscuro");
    } catch (e) { }

    // Las gráficas escuchan este aviso para cambiar el color de sus textos
    document.dispatchEvent(new CustomEvent("temaCambiado", { detail: { claro } }));
}

document.getElementById("btnCambiarTema")?.addEventListener("click", cambiarTema);
