using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SigesTI.Web.Seguridad
{
    /*
     * Revisa los permisos antes de ejecutar cualquier handler.
     * Las páginas sin [Modulo] (Login, Index, Error...) no se revisan.
     */
    public class PermisosFilter : IAsyncPageFilter
    {
        private readonly PermisosService _permisos;

        public PermisosFilter(PermisosService permisos)
        {
            _permisos = permisos;
        }

        public Task OnPageHandlerSelectionAsync(PageHandlerSelectedContext context)
        {
            return Task.CompletedTask;
        }

        public async Task OnPageHandlerExecutionAsync(
            PageHandlerExecutingContext context,
            PageHandlerExecutionDelegate next)
        {
            var modulo = context.HandlerInstance
                .GetType()
                .GetCustomAttribute<ModuloAttribute>();

            if (modulo == null)
            {
                await next();
                return;
            }

            var accion = context.HandlerMethod?.MethodInfo
                .GetCustomAttribute<PermisoAttribute>()?.Accion ?? Accion.Ver;

            bool puedeVer = await _permisos.PuedeAsync(modulo.Clave, Accion.Ver);
            bool puedeAccion = await _permisos.PuedeAsync(modulo.Clave, accion);

            if (puedeVer && puedeAccion)
            {
                await next();
                return;
            }

            context.Result = RespuestaSinPermiso(context.HttpContext);
        }

        public static IActionResult RespuestaSinPermiso(HttpContext httpContext)
        {
            // Navegación normal (enlace o formulario): se manda a la página de aviso
            if (httpContext.Request.Headers["Sec-Fetch-Mode"] == "navigate")
            {
                return new RedirectToPageResult("/AccesoDenegado");
            }

            // Peticiones con fetch: se responde igual que los demás handlers JSON
            return new JsonResult(new
            {
                success = false,
                message = "No tienes permiso para realizar esta acción."
            });
        }
    }
}
