/* ==========================================================================
   FUNCIONES COMUNES DE LOS REPORTES
   ========================================================================== */

// Nombre con el que se guardan los reportes: ReporteDiarioDeTickets_27-10-2026
function nombreReporte(nombre) {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, "0");
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    return `${nombre}_${dia}-${mes}-${hoy.getFullYear()}`;
}

// Imprime la página usando el nombre del reporte (es el que propone "Guardar como PDF")
function imprimirConNombre(nombre) {
    const tituloAnterior = document.title;
    document.title = nombreReporte(nombre);
    window.print();
    document.title = tituloAnterior;
}

/*
 * Descarga como PDF el reporte que se ve en la vista previa (necesita html2pdf.js en la página).
 * Mientras se genera, el botón queda deshabilitado.
 */
async function descargarPdfReporte(elemento, nombre, boton) {
    if (!elemento || typeof html2pdf === "undefined") return;

    const textoBoton = boton ? boton.innerHTML : "";
    if (boton) {
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
    }

    elemento.classList.add("generando-pdf");

    try {
        await html2pdf()
            .set({
                margin: 8,
                filename: nombreReporte(nombre) + ".pdf",
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
                jsPDF: { unit: "mm", format: "letter", orientation: "landscape" },
                pagebreak: { mode: ["css", "legacy"], before: ".salto-pagina-print", avoid: ["tr", ".glass-panel"] }
            })
            .from(elemento)
            .save();
    } finally {
        elemento.classList.remove("generando-pdf");
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = textoBoton;
        }
    }
}
