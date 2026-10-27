/* ==========================================================================
   SISTEMAS DE LOS TICKETS (modal "Sistemas" de Control de acceso, solo Admin)
   Las filas se ordenan arrastrándolas. Eliminar se guarda en ese momento;
   los demás cambios se guardan con "Guardar cambios".
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("modalSistemas");
    if (!modal) return;

    const lista = document.getElementById("listaSistemas");

    modal.addEventListener("show.bs.modal", function () {
        lista.innerHTML = "";
        (window.catalogoSistemas || []).forEach(s => lista.appendChild(crearFilaSistema(s)));
    });

    if (typeof Sortable !== "undefined") {
        Sortable.create(lista, {
            handle: ".sis-arrastre",
            animation: 160,
            forceFallback: true,
            ghostClass: "sis-fila-fantasma",
            chosenClass: "sis-fila-elegida"
        });
    }

    document.getElementById("btnAgregarSistema").addEventListener("click", function () {
        const fila = crearFilaSistema({ id: 0, nombre: "", fondo: "#64748B", texto: "#FFFFFF", interno: false });
        lista.appendChild(fila);
        fila.scrollIntoView({ behavior: "smooth", block: "nearest" });
        fila.querySelector(".sis-nombre").focus();
    });

    document.getElementById("btnGuardarSistemas").addEventListener("click", guardarSistemas);
});

function crearFilaSistema(sistema) {
    const fila = document.createElement("div");
    fila.className = "sis-fila";
    fila.dataset.id = sistema.id;
    fila.innerHTML = `
        <span class="sis-arrastre" title="Arrastra para cambiar el orden"><i class="bi bi-grip-vertical"></i></span>
        <span class="sis-vista"></span>
        <div class="sis-datos">
            <input type="text" class="form-control sis-nombre" maxlength="50" placeholder="Nombre del sistema" />
            <div class="sis-tipo" role="group" aria-label="Tipo de sistema">
                <button type="button" data-tipo="externo">Externo</button>
                <button type="button" data-tipo="interno">Interno</button>
            </div>
        </div>
        <div class="sis-colores">
            <label class="sis-color" title="Color de fondo">
                <input type="color" class="sis-fondo" />
                <span>Fondo</span>
            </label>
            <label class="sis-color" title="Color del texto">
                <input type="color" class="sis-texto" />
                <span>Texto</span>
            </label>
        </div>
        <button type="button" class="sis-eliminar" title="Eliminar sistema"><i class="bi bi-trash3"></i></button>`;

    const nombre = fila.querySelector(".sis-nombre");
    const fondo = fila.querySelector(".sis-fondo");
    const texto = fila.querySelector(".sis-texto");

    nombre.value = sistema.nombre;
    fondo.value = sistema.fondo.toLowerCase();
    texto.value = sistema.texto.toLowerCase();
    elegirTipoSistema(fila, sistema.interno ? "interno" : "externo");

    const pintarVista = () => {
        const vista = fila.querySelector(".sis-vista");
        vista.textContent = nombre.value.trim().toUpperCase() || "SISTEMA";
        vista.style.backgroundColor = fondo.value;
        vista.style.color = texto.value;
        fila.style.setProperty("--sis-acento", fondo.value);
    };
    [nombre, fondo, texto].forEach(campo => campo.addEventListener("input", pintarVista));
    pintarVista();

    fila.querySelectorAll(".sis-tipo button").forEach(boton =>
        boton.addEventListener("click", () => elegirTipoSistema(fila, boton.dataset.tipo)));

    fila.querySelector(".sis-eliminar").addEventListener("click", () => confirmarEliminarSistema(fila));

    return fila;
}

function elegirTipoSistema(fila, tipo) {
    fila.dataset.tipo = tipo;
    fila.querySelectorAll(".sis-tipo button").forEach(boton =>
        boton.classList.toggle("activo", boton.dataset.tipo === tipo));
}

function confirmarEliminarSistema(fila) {
    const nombre = fila.querySelector(".sis-nombre").value.trim().toUpperCase() || "este sistema";
    const id = Number(fila.dataset.id);

    mostrarConfirmacion({
        icono: "warning",
        titulo: "¿Eliminar sistema?",
        mensaje: "Se eliminará <b>" + escaparHtml(nombre) + "</b>.<br><br>Sus tickets conservan el nombre, pero se verán en gris.",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: async function () {
            // Una fila nueva todavía no existe en la base
            if (id > 0) {
                const resultado = await enviarSistemas("EliminarSistema", "idSistema=" + id, "application/x-www-form-urlencoded");
                if (!resultado) return;

                window.catalogoSistemas = (window.catalogoSistemas || []).filter(s => s.id !== id);
            }

            fila.remove();
            mostrarExito("El sistema <b>" + escaparHtml(nombre) + "</b> se eliminó correctamente.", "Sistema eliminado");
        }
    });
}

async function guardarSistemas() {
    const lista = [...document.querySelectorAll("#listaSistemas .sis-fila")].map(fila => ({
        idSistema: Number(fila.dataset.id),
        nombre: fila.querySelector(".sis-nombre").value.trim(),
        colorFondo: fila.querySelector(".sis-fondo").value,
        colorTexto: fila.querySelector(".sis-texto").value,
        interno: fila.dataset.tipo === "interno"
    }));

    if (lista.some(s => s.nombre === "")) {
        mostrarAdvertencia("Escribe el nombre de todos los sistemas o elimina los que estén vacíos.", "Falta el nombre");
        return;
    }

    const boton = document.getElementById("btnGuardarSistemas");
    boton.disabled = true;

    const resultado = await enviarSistemas("GuardarSistemas", JSON.stringify(lista), "application/json");
    boton.disabled = false;
    if (!resultado) return;

    await mostrarExito("Los sistemas se guardaron correctamente.", "Sistemas guardados");
    window.location.reload();
}

// Envía al servidor; regresa false (y muestra el aviso) si algo falla
async function enviarSistemas(handler, cuerpo, tipoContenido) {
    try {
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";
        const respuesta = await fetch("?handler=" + handler, {
            method: "POST",
            headers: { "Content-Type": tipoContenido, "RequestVerificationToken": token },
            body: cuerpo
        });

        if (!respuesta.ok) throw new Error(respuesta.status);
        const resultado = await respuesta.json();

        if (!resultado.exito) {
            mostrarAdvertencia(escaparHtml(resultado.mensaje), "No se guardó");
            return false;
        }
        return true;
    } catch (err) {
        mostrarError("No fue posible guardar los sistemas.");
        return false;
    }
}
