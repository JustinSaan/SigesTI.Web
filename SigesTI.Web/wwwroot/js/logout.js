document.addEventListener("DOMContentLoaded", function () {

    const formCerrarSesion =
        document.getElementById("formCerrarSesion");

    if (!formCerrarSesion) {
        return;
    }

    formCerrarSesion.addEventListener("submit", function (event) {

        event.preventDefault();

        Swal.fire({
            title: "Cerrando sesión",
            html: "Espera un momento...",
            background: "#0f172a",
            color: "#f8fafc",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            customClass: {
                popup: "swal-dark-blue"
            },
            didOpen: function () {
                Swal.showLoading();
            }
        });

        /*
         * Se deja visible la animación brevemente
         * antes de enviar el formulario.
         */
        setTimeout(function () {
            formCerrarSesion.submit();
        }, 900);
    });
});