using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using SigesTI.Web.Data;
using SigesTI.Web.Seguridad;
using SigesTI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;

namespace SigesTI.Web.Pages.Solicitudes
{
    [Modulo(Modulos.ConsultarSolicitudes)]
    public class ConsultarModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PermisosService _permisos;

        public ConsultarModel(ApplicationDbContext context, PermisosService permisos)
        {
            _context = context;
            _permisos = permisos;
        }

        public List<Solicitud> Solicitudes { get; set; } = new();

        [BindProperty(SupportsGet = true)]
        public string? FiltrarArea { get; set; }

        [BindProperty(SupportsGet = true)]
        public int? FiltrarSolicitante { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? FiltrarEstatus { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? FiltrarFecha { get; set; }

        public List<SelectListItem> ListaAreas { get; set; } = new();
        public List<SelectListItem> ListaPersonalFiltro { get; set; } = new();
        public List<SelectListItem> SoporteOptions { get; set; } = new();
        public List<SelectListItem> AdminOptions { get; set; } = new();
        public List<SelectListItem> EstatusOptions { get; set; } = new();

        public void OnGet()
        {
            CargarListadosYCombos();

            var query = _context.Solicitudes
                .Include(s => s.Personal)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(FiltrarArea))
            {
                query = query.Where(s => s.Personal != null && s.Personal.Area == FiltrarArea);
            }

            if (FiltrarSolicitante.HasValue)
            {
                query = query.Where(s => s.IdPersonal == FiltrarSolicitante.Value);
            }

            if (FiltrarFecha.HasValue)
            {
                query = query.Where(s => s.FechaIngreso.Date == FiltrarFecha.Value.Date);
            }

            if (!string.IsNullOrWhiteSpace(FiltrarEstatus))
            {
                query = query.Where(s => s.Estatus == FiltrarEstatus);
            }

            Solicitudes = query.OrderByDescending(s => s.FechaIngreso).ToList();
        }

        private void CargarListadosYCombos()
        {
            ListaAreas = new List<SelectListItem>
            {
                new SelectListItem { Value = "Ventas", Text = "Ventas" },
                new SelectListItem { Value = "Administración", Text = "Administración" },
                new SelectListItem { Value = "Soporte Técnico", Text = "Soporte Técnico" },
                new SelectListItem { Value = "Consultoría", Text = "Consultoría" },
                new SelectListItem { Value = "Cobranza", Text = "Cobranza" }
            };

            // Corrección Crítica: Mapeo correcto utilizando p.Id del modelo Personal
            ListaPersonalFiltro = _context.Personal
                .Select(p => new SelectListItem { Value = p.Id.ToString(), Text = p.Nombre })
                .ToList();

            SoporteOptions = _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte")
                .Select(p => new SelectListItem { Value = p.Nombre, Text = p.Nombre })
                .ToList();

            AdminOptions = _context.Personal
                .Where(p => p.Area == "Administración")
                .Select(p => new SelectListItem { Value = p.Nombre, Text = p.Nombre })
                .ToList();

            EstatusOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "Pendiente", Text = "Pendiente" },
                new SelectListItem { Value = "Resuelto", Text = "Resuelto" }
            };
        }

        [Permiso(Accion.Exportar)]
        public IActionResult OnGetReporteSolicitudes(DateTime? fechaInicio, DateTime? fechaFin, string? area, int? solicitante, string? estatus)
        {
            var query = _context.Solicitudes
                .Include(s => s.Personal)
                .AsQueryable();

            if (fechaInicio.HasValue)
            {
                var inicio = fechaInicio.Value.Date;
                query = query.Where(s => s.FechaIngreso >= inicio);
            }

            if (fechaFin.HasValue)
            {
                var fin = fechaFin.Value.Date.AddDays(1);
                query = query.Where(s => s.FechaIngreso < fin);
            }

            if (!string.IsNullOrWhiteSpace(area))
            {
                query = query.Where(s => s.Personal != null && s.Personal.Area == area);
            }

            if (solicitante.HasValue)
            {
                query = query.Where(s => s.IdPersonal == solicitante.Value);
            }

            if (!string.IsNullOrWhiteSpace(estatus))
            {
                query = query.Where(s => s.Estatus == estatus);
            }

            const int maximoReporte = 500;
            int totalEncontradas = query.Count();

            var solicitudesReporte = query
                .AsNoTracking()
                .OrderByDescending(s => s.FechaIngreso)
                .Take(maximoReporte)
                .ToList();

            string textoTotal = totalEncontradas > maximoReporte
                ? $"{totalEncontradas} solicitudes (se muestran las {maximoReporte} más recientes)"
                : $"{totalEncontradas} solicitudes";

            var html = new StringBuilder();

            string nombreSolicitanteReporte = "Todos";

            if (solicitante.HasValue)
            {
                nombreSolicitanteReporte = _context.Personal
                    .Where(p => p.Id == solicitante.Value)
                    .Select(p => p.Nombre)
                    .FirstOrDefault() ?? solicitante.Value.ToString();
            }

            html.Append(@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <title>Reporte de Solicitudes</title>
    <link rel='stylesheet' href='/css/Reportes/reporte-solicitudes.css' />
</head>
<body>
    <div class='hoja'>

        <div class='acciones'>
            <button class='btn-imprimir' onclick='window.print()'>
                Descargar / Imprimir
            </button>
        </div>

        <div class='encabezado-reporte'>
            <div>
                <div class='logo-reporte'>SigesTI</div>
                <div class='descripcion-reporte'>Sistema de Gestión de Solicitudes TI</div>
            </div>

            <div class='fecha-reporte'>
                <strong>Generado:</strong> " + DateTime.Now.ToString("dd/MM/yyyy hh:mm tt") + @"
            </div>
        </div>

        <div class='titulo-reporte'>
            Reporte General de Solicitudes
        </div>
");

            html.Append(@"
        <div class='filtros-reporte'>
            <div>
                <strong>Fecha inicial:</strong> " + (fechaInicio.HasValue ? fechaInicio.Value.ToString("dd/MM/yyyy") : "Todas") + @"
            </div>
            <div>
                <strong>Fecha final:</strong> " + (fechaFin.HasValue ? fechaFin.Value.ToString("dd/MM/yyyy") : "Todas") + @"
            </div>
            <div>
                <strong>Área:</strong> " + WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(area) ? "Todas" : area) + @"
            </div>
            <div>
                <strong>Solicitante:</strong> " + WebUtility.HtmlEncode(nombreSolicitanteReporte) + @"
            </div>
            <div>
                <strong>Estatus:</strong> " + WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(estatus) ? "Todos" : estatus) + @"
            </div>
            <div>
                <strong>Total:</strong> " + textoTotal + @"
            </div>
        </div>
");

            html.Append(@"
        <table class='tabla-reporte'>
            <thead>
                <tr>
                    <th>No.</th>
                    <th>Solicitante</th>
                    <th>Área</th>
                    <th>Fecha Ingreso</th>
                    <th>Fecha Entrega</th>
                    <th>Ejecutivo</th>
                    <th>Estatus</th>
                </tr>
            </thead>
            <tbody>
");

            foreach (var item in solicitudesReporte)
            {
                DateTime fEntrega = Convert.ToDateTime(item.FechaEntrega);
                string fechaEntregaTexto = (fEntrega.Year <= 1901 || item.Estatus == "Pendiente") ? "S/A" : fEntrega.ToString("dd/MM/yyyy");
                string claseEstatus = item.Estatus == "Pendiente" ? "pendiente" : "resuelto";

                html.Append("<tr>");
                html.Append("<td class='text-center folio-reporte'>" + item.IdSolicitud.ToString("D4") + "</td>");
                html.Append("<td>" + WebUtility.HtmlEncode(item.Personal?.Nombre ?? "N/A") + "</td>");
                html.Append("<td>" + WebUtility.HtmlEncode(item.Personal?.Area ?? "N/A") + "</td>");
                html.Append("<td class='text-center'>" + item.FechaIngreso.ToString("dd/MM/yyyy") + "</td>");
                html.Append("<td class='text-center'>" + fechaEntregaTexto + "</td>");
                html.Append("<td>" + WebUtility.HtmlEncode(string.IsNullOrEmpty(item.EjecutivoAsignado) ? "Sin asignar" : item.EjecutivoAsignado) + "</td>");
                html.Append("<td class='text-center " + claseEstatus + "'>" + WebUtility.HtmlEncode(item.Estatus) + "</td>");
                html.Append("</tr>");
            }

            if (!solicitudesReporte.Any())
            {
                html.Append("<tr><td colspan='7' class='text-center'>No existen solicitudes con los filtros seleccionados.</td></tr>");
            }

            html.Append(@"
            </tbody>
        </table>

        <div class='pie-reporte'>
            Sistema SigesTI · Reporte generado automáticamente
        </div>
    </div>
</body>
</html>
");

            return Content(html.ToString(), "text/html");
        }

        public JsonResult OnGetDetalleSolicitud(int id)
        {
            var sol = _context.Solicitudes
                .Include(s => s.Personal)
                .FirstOrDefault(s => s.IdSolicitud == id);

            if (sol == null) return new JsonResult(null);

            string? areaNombre = sol.Personal?.Area;
            var jefe = _context.Personal
                .FirstOrDefault(p => p.Area == areaNombre && p.EsResponsable);

            DateTime fIngreso = Convert.ToDateTime(sol.FechaIngreso);
            DateTime fEntrega = Convert.ToDateTime(sol.FechaEntrega);

            string fEntregaStr = (fEntrega == DateTime.MinValue || fEntrega.Year == 1 || sol.Estatus == "Pendiente")
                ? ""
                : fEntrega.ToString("yyyy-MM-dd");

            return new JsonResult(new
            {
                idSolicitud = sol.IdSolicitud,
                fechaIngreso = fIngreso.ToString("yyyy-MM-dd"),
                fechaEntrega = fEntregaStr,
                estatus = sol.Estatus,
                area = sol.Personal?.Area ?? "",
                idPersonal = sol.IdPersonal,
                puesto = sol.PuestoSolicitante ?? "",
                correo = sol.CorreoSolicitante ?? "",
                responsableArea = jefe?.Nombre ?? "Sin jefe asignado",
                impresoraConfigurada = sol.TieneImpresoraConfigurada ?? "No",
                detalleImpresora = sol.DetalleImpresora ?? "",
                reqSistemas = sol.ReqSistemas,
                sistemasDetalle = sol.SistemasDetalle ?? "",
                otrosSistemas = sol.OtrosSistemas ?? "",
                nuevaUnidadRed = sol.NuevaUnidadRed ?? "",
                descripcionProblema = sol.DescripcionProblema ?? "",
                ejecutivoAsignado = sol.EjecutivoAsignado ?? "",
                autorizaAdmin = sol.AutorizaAdmin ?? "",
                puedeEditar = PuedeEditar(sol)
            });
        }

        // Admin edita cualquier solicitud; los demás roles solo las pendientes
        private bool PuedeEditar(Solicitud sol)
        {
            return sol.Estatus == "Pendiente" || _permisos.EsAdmin;
        }

        private JsonResult Error(string mensaje)
        {
            return new JsonResult(new { success = false, message = mensaje });
        }

        [Permiso(Accion.Editar)]
        public IActionResult OnPostEditarSolicitud([FromBody] SolicitudEditarDTO modelo)
        {
            if (modelo == null) return Error("Datos inválidos.");

            if (modelo.Estatus != "Pendiente" && modelo.Estatus != "Resuelto")
            {
                return Error("El estatus seleccionado no es válido.");
            }

            var sol = _context.Solicitudes.FirstOrDefault(s => s.IdSolicitud == modelo.IdSolicitud);
            if (sol == null) return Error("Solicitud no encontrada.");

            if (!PuedeEditar(sol))
            {
                return Error("Solo un administrador puede modificar una solicitud resuelta.");
            }

            if (modelo.IdPersonal > 0 && modelo.IdPersonal != sol.IdPersonal)
            {
                if (!_context.Personal.Any(p => p.Id == modelo.IdPersonal))
                {
                    return Error("Seleccione un solicitante válido.");
                }

                sol.IdPersonal = modelo.IdPersonal;
                sol.PuestoSolicitante = modelo.PuestoSolicitante;
                sol.CorreoSolicitante = modelo.CorreoSolicitante;
            }

            sol.FechaIngreso = modelo.FechaIngreso;
            sol.Estatus = modelo.Estatus;

            // La fecha de entrega solo aplica cuando la solicitud ya está resuelta
            if (sol.Estatus == "Pendiente")
            {
                sol.FechaEntrega = null;
            }
            else
            {
                sol.FechaEntrega = modelo.FechaEntrega ?? DateTime.Today;

                if (sol.FechaEntrega.Value.Date < sol.FechaIngreso.Date)
                {
                    return Error("La fecha de entrega no puede ser anterior a la fecha de ingreso.");
                }

                if (!string.IsNullOrWhiteSpace(modelo.NuevaUnidadRed))
                {
                    var personal = _context.Personal.FirstOrDefault(p => p.Id == sol.IdPersonal);
                    personal?.AgregarUnidadRed(modelo.NuevaUnidadRed);
                }
            }

            string historialPrevio = sol.DescripcionProblema ?? "";
            string nuevoApunte = modelo.DescripcionProblema ?? "";

            if (!string.IsNullOrWhiteSpace(nuevoApunte) && nuevoApunte != historialPrevio)
            {
                string usuario = HttpContext.Session.GetString("NombreCompleto")
                              ?? HttpContext.Session.GetString("NombreUsuario")
                              ?? "Sistema";

                sol.DescripcionProblema = Solicitud.AgregarComentario(historialPrevio, usuario, nuevoApunte);
            }

            sol.TieneImpresoraConfigurada = modelo.TieneImpresoraConfigurada;
            sol.DetalleImpresora = modelo.DetalleImpresora;
            sol.ReqSistemas = modelo.ReqSistemas;
            sol.SistemasDetalle = modelo.ReqSistemas ? modelo.SistemasDetalle : null;
            sol.OtrosSistemas = modelo.ReqSistemas ? modelo.OtrosSistemas : null;
            sol.NuevaUnidadRed = modelo.NuevaUnidadRed;
            sol.EjecutivoAsignado = modelo.EjecutivoAsignado;
            sol.AutorizaAdmin = modelo.AutorizaAdmin;

            _context.SaveChanges();

            return new JsonResult(new { success = true });
        }

        [Permiso(Accion.Eliminar)]
        public IActionResult OnPostEliminarSolicitud(int id)
        {
            var sol = _context.Solicitudes.FirstOrDefault(s => s.IdSolicitud == id);
            if (sol == null) return new JsonResult(new { success = false, message = "La solicitud ya no existe." });

            _context.Solicitudes.Remove(sol);
            _context.SaveChanges();

            return new JsonResult(new { success = true });
        }

        public JsonResult OnGetFiltrarPersonal(string area)
        {
            // Corrección Crítica: id = p.Id del modelo Personal mapeado correctamente para el select dinámico JSON
            var listaPersonal = _context.Personal
                .Where(p => p.Area == area)
                .Select(p => new {
                    id = p.Id,
                    nombre = p.Nombre,
                    correo = p.Correo,
                    puesto = p.Puesto,
                    esResponsable = p.EsResponsable
                }).ToList();

            return new JsonResult(listaPersonal);
        }
    }

    public class SolicitudEditarDTO
    {
        public int IdSolicitud { get; set; }
        public DateTime FechaIngreso { get; set; }
        public DateTime? FechaEntrega { get; set; }
        public string? Estatus { get; set; }
        public int IdPersonal { get; set; }
        public string? PuestoSolicitante { get; set; }
        public string? CorreoSolicitante { get; set; }
        public bool ReqSistemas { get; set; }
        public string? SistemasDetalle { get; set; }
        public string? OtrosSistemas { get; set; }
        public string? DescripcionProblema { get; set; }
        public string? EjecutivoAsignado { get; set; }
        public string? AutorizaAdmin { get; set; }
        public string? NuevaUnidadRed { get; set; }
        public string? TieneImpresoraConfigurada { get; set; }
        public string? DetalleImpresora { get; set; }
    }
}