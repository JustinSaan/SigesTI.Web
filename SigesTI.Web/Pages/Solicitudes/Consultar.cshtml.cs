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

namespace SigesTI.Web.Pages.Solicitudes
{
    [Modulo(Modulos.ConsultarSolicitudes)]
    public class ConsultarModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly PermisosService _permisos;
        private readonly NotificacionesService _notificaciones;

        public ConsultarModel(ApplicationDbContext context, PermisosService permisos, NotificacionesService notificaciones)
        {
            _context = context;
            _permisos = permisos;
            _notificaciones = notificaciones;
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

            ListaPersonalFiltro = _context.Personal
                .Select(p => new SelectListItem { Value = p.Id.ToString(), Text = p.Nombre })
                .ToList();

            SoporteOptions = _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte" || p.Area == "Sistemas")
                .Select(p => new SelectListItem { Value = p.Nombre, Text = p.Nombre })
                .ToList();

            AdminOptions = _context.Personal
                .Where(p => p.Area == "Administración")
                .Select(p => new SelectListItem { Value = p.Nombre, Text = p.Nombre })
                .ToList();
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

            bool tieneEntrega = sol.Estatus == EstatusSolicitud.Resuelto
                                && sol.FechaEntrega.HasValue
                                && sol.FechaEntrega.Value.Year > 1901;

            return new JsonResult(new
            {
                idSolicitud = sol.IdSolicitud,
                fechaIngreso = sol.FechaIngreso.ToString("yyyy-MM-dd"),
                fechaEntrega = tieneEntrega ? sol.FechaEntrega!.Value.ToString("yyyy-MM-dd") : "",
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
                descripcionRequisito = Solicitud.LeerDescripcionYSeguimiento(sol.DescripcionRequisito, sol.DescripcionProblema).Descripcion,
                descripcionProblema = sol.DescripcionProblema ?? "",
                seguimiento = string.IsNullOrWhiteSpace(sol.DescripcionRequisito)
                    ? Solicitud.QuitarComentarioInicial(sol.DescripcionProblema)
                    : sol.DescripcionProblema ?? "",
                ejecutivoAsignado = sol.EjecutivoAsignado ?? "",
                autorizaAdmin = sol.AutorizaAdmin ?? "",
                autorizadoPor = sol.AutorizadoPor ?? "",
                fechaAutorizacion = sol.FechaAutorizacion?.ToString("dd/MM/yyyy hh:mm tt") ?? "",
                puedeEditar = PuedeEditar(sol)
            });
        }

        // Admin edita cualquier solicitud; los demás roles solo las que no están resueltas
        private bool PuedeEditar(Solicitud sol)
        {
            return sol.Estatus != EstatusSolicitud.Resuelto || _permisos.EsAdmin;
        }

        private JsonResult Error(string mensaje)
        {
            return new JsonResult(new { success = false, message = mensaje });
        }

        [Permiso(Accion.Editar)]
        public IActionResult OnPostEditarSolicitud([FromBody] SolicitudEditarDTO modelo)
        {
            if (modelo == null) return Error("Datos inválidos.");

            var sol = _context.Solicitudes
                .Include(s => s.Personal)
                .FirstOrDefault(s => s.IdSolicitud == modelo.IdSolicitud);

            if (sol == null) return Error("Solicitud no encontrada.");

            if (!PuedeEditar(sol))
            {
                return Error("Solo un administrador puede modificar una solicitud resuelta.");
            }

            bool estabaPorAutorizar = sol.Estatus == EstatusSolicitud.PorAutorizar;

            // Mientras espera autorización el estatus no se cambia desde aquí
            if (!estabaPorAutorizar &&
                modelo.Estatus != EstatusSolicitud.Pendiente && modelo.Estatus != EstatusSolicitud.Resuelto)
            {
                return Error("El estatus seleccionado no es válido.");
            }

            string? ejecutivoAnterior = sol.EjecutivoAsignado;
            string? autorizadorAnterior = sol.AutorizaAdmin;
            string estatusAnterior = sol.Estatus;

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
            sol.AutorizaAdmin = modelo.AutorizaAdmin;

            if (estabaPorAutorizar)
            {
                // Si le quitan a quien autoriza, la solicitud pasa directo a pendiente
                sol.Estatus = string.IsNullOrWhiteSpace(sol.AutorizaAdmin)
                    ? EstatusSolicitud.Pendiente
                    : EstatusSolicitud.PorAutorizar;
            }
            else
            {
                sol.Estatus = modelo.Estatus!;
            }

            // La fecha de realización solo aplica cuando la solicitud ya está resuelta
            if (sol.Estatus != EstatusSolicitud.Resuelto)
            {
                sol.FechaEntrega = null;
            }
            else
            {
                sol.FechaEntrega = modelo.FechaEntrega ?? DateTime.Today;

                if (sol.FechaEntrega.Value.Date < sol.FechaIngreso.Date)
                {
                    return Error("La fecha de realización no puede ser anterior a la fecha de ingreso.");
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
                sol.DescripcionProblema = Solicitud.AgregarComentario(historialPrevio, NombreUsuarioSesion(), nuevoApunte);
            }

            sol.TieneImpresoraConfigurada = modelo.TieneImpresoraConfigurada;
            sol.DetalleImpresora = modelo.DetalleImpresora;
            sol.ReqSistemas = modelo.ReqSistemas;
            sol.SistemasDetalle = modelo.ReqSistemas ? modelo.SistemasDetalle : null;
            sol.OtrosSistemas = modelo.ReqSistemas ? modelo.OtrosSistemas : null;
            sol.NuevaUnidadRed = modelo.NuevaUnidadRed;
            sol.EjecutivoAsignado = modelo.EjecutivoAsignado;

            _context.SaveChanges();

            // Notificaciones: aviso de autorización al administrador nuevo, aviso de resuelto al
            // solicitante y conteo de pendientes de soporte
            var solicitante = _context.Personal.FirstOrDefault(p => p.Id == sol.IdPersonal);

            if (estabaPorAutorizar && sol.AutorizaAdmin != autorizadorAnterior)
            {
                _notificaciones.CancelarSolicitudAutorizacion(sol.IdSolicitud);

                if (sol.Estatus == EstatusSolicitud.PorAutorizar)
                {
                    _notificaciones.SolicitarAutorizacion(sol, solicitante?.Nombre ?? "N/A");
                }
            }

            if (estatusAnterior != EstatusSolicitud.Resuelto && sol.Estatus == EstatusSolicitud.Resuelto)
            {
                _notificaciones.NotificarResuelto(sol, solicitante);
            }

            bool cambioEjecutivo = sol.EjecutivoAsignado != ejecutivoAnterior;

            if (cambioEjecutivo)
            {
                _notificaciones.ActualizarPendientesSoporte(ejecutivoAnterior, avisar: false);
            }

            _notificaciones.ActualizarPendientesSoporte(sol.EjecutivoAsignado, avisar: cambioEjecutivo);
            _context.SaveChanges();

            return new JsonResult(new { success = true });
        }

        [Permiso(Accion.Eliminar)]
        public IActionResult OnPostEliminarSolicitud(int id)
        {
            var sol = _context.Solicitudes.FirstOrDefault(s => s.IdSolicitud == id);
            if (sol == null) return Error("La solicitud ya no existe.");

            string? ejecutivo = sol.EjecutivoAsignado;

            // Sus notificaciones se borran solas en la base (ON DELETE CASCADE)
            _context.Solicitudes.Remove(sol);
            _context.SaveChanges();

            _notificaciones.ActualizarPendientesSoporte(ejecutivo, avisar: false);
            _context.SaveChanges();

            return new JsonResult(new { success = true });
        }

        public JsonResult OnGetFiltrarPersonal(string area)
        {
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

        private string NombreUsuarioSesion()
        {
            return HttpContext.Session.GetString("NombreCompleto")
                ?? HttpContext.Session.GetString("NombreUsuario")
                ?? "Sistema";
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
