document.addEventListener("DOMContentLoaded", function () {
    const tablaBody = document.querySelector(".tabla-sigesti tbody");
    if (!tablaBody) return;

    let filaArrastrada = null;

    tablaBody.querySelectorAll("tr").forEach(fila => {
        hacerFilaArrastrable(fila);
    });

    function hacerFilaArrastrable(fila) {
        if (fila.querySelector("td[colspan]")) return;

        fila.setAttribute("draggable", true);

        fila.addEventListener("dragstart", function (e) {
            filaArrastrada = this;
            this.classList.add("fila-arrastrando");
            e.dataTransfer.effectAllowed = "move";
        });

        fila.addEventListener("dragover", function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            const filaObjetivo = e.target.closest("tr");
            if (filaObjetivo && filaObjetivo !== filaArrastrada && filaObjetivo.parentNode === tablaBody) {
                const rect = filaObjetivo.getBoundingClientRect();
                const midPoint = rect.top + rect.height / 2;

                if (e.clientY < midPoint) {
                    tablaBody.insertBefore(filaArrastrada, filaObjetivo);
                } else {
                    tablaBody.insertBefore(filaArrastrada, filaObjetivo.nextSibling);
                }
            }
        });

        fila.addEventListener("dragend", function () {
            this.classList.remove("fila-arrastrando");
            filaArrastrada = null;
            
            // Persistir el nuevo orden en el servidor
            guardarNuevoOrden();
        });
    }

    function guardarNuevoOrden() {
        // Obtener la lista ordenada de IDs de las filas actualizadas
        const idsOrdenados = Array.from(tablaBody.querySelectorAll("tr[data-id]"))
            .map(tr => parseInt(tr.getAttribute("data-id")));

        // Obtener token AntiForgery para ASP.NET Core
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
        const token = tokenInput ? tokenInput.value : '';

        fetch('/Personal/AdministracionPersonal?handler=GuardarOrden', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(idsOrdenados)
        })
        .then(response => {
            if (!response.ok) {
                console.error("Error al guardar el orden en el servidor.");
            }
        })
        .catch(err => console.error("Error de red al guardar orden:", err));
    }
});