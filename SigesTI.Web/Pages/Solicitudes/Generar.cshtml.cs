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
    [Modulo(Modulos.GenerarSolicitud)]
    public class GenerarModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly NotificacionesService _notificaciones;

        public GenerarModel(ApplicationDbContext context, NotificacionesService notificaciones)
        {
            _context = context;
            _notificaciones = notificaciones;
        }

        [BindProperty]
        public Solicitud NuevaSolicitud { get; set; } = new Solicitud();

        [BindProperty]
        public string AreaAuxiliar { get; set; } = null!;

        [BindProperty]
        public string[] SistemasSeleccionados { get; set; } = Array.Empty<string>();

        [BindProperty]
        public string ImpresoraConfiguradaAux { get; set; } = "No";

        public List<SelectListItem> AreasOptions { get; set; } = new();
        public List<SelectListItem> SoporteOptions { get; set; } = new();
        public List<SelectListItem> AdminOptions { get; set; } = new();
        public List<SelectListItem> EstatusOptions { get; set; } = new();

        public void OnGet()
        {

            AreasOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "Ventas", Text = "Ventas" },
                new SelectListItem { Value = "Administración", Text = "Administración" },
                new SelectListItem { Value = "Soporte Técnico", Text = "Soporte Técnico" },
                new SelectListItem { Value = "Consultoría", Text = "Consultoría" },
                new SelectListItem { Value = "Cobranza", Text = "Cobranza" }
            };

            SoporteOptions = _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte" || p.Area == "Sistemas")
                .Select(p => new SelectListItem
                {
                    Value = p.Nombre,
                    Text = p.Nombre
                }).ToList();

            AdminOptions = _context.Personal
                .Where(p => p.Area == "Administración")
                .Select(p => new SelectListItem
                {
                    Value = p.Nombre,
                    Text = p.Nombre
                }).ToList();

            EstatusOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "Pendiente", Text = "Pendiente" },
                new SelectListItem { Value = "Resuelto", Text = "Resuelto" }
            };
        }

        // Responde JSON para que el frontend muestre el resultado con SweetAlert2
        [Permiso(Accion.Crear)]
        public IActionResult OnPost()
        {
            // Campos auxiliares que no forman parte de la solicitud
            ModelState.Remove("AreaAuxiliar");
            ModelState.Remove("ImpresoraConfiguradaAux");

            if (!ModelState.IsValid)
            {
                return Error("Por favor, rellene todos los campos requeridos.");
            }

            if (NuevaSolicitud.Estatus != "Pendiente" && NuevaSolicitud.Estatus != "Resuelto")
            {
                return Error("El estatus seleccionado no es válido.");
            }

            if (string.IsNullOrWhiteSpace(NuevaSolicitud.DescripcionRequisito))
            {
                return Error("Escriba la descripción del requisito.");
            }

            var personal = _context.Personal.FirstOrDefault(p => p.Id == NuevaSolicitud.IdPersonal);
            if (personal == null)
            {
                return Error("Seleccione un solicitante válido.");
            }

            // La fecha de realización solo aplica cuando la solicitud ya está resuelta
            if (NuevaSolicitud.Estatus == "Pendiente")
            {
                NuevaSolicitud.FechaEntrega = null;
            }
            else
            {
                NuevaSolicitud.FechaEntrega ??= DateTime.Today;

                if (NuevaSolicitud.FechaEntrega.Value.Date < NuevaSolicitud.FechaIngreso.Date)
                {
                    return Error("La fecha de realización no puede ser anterior a la fecha de ingreso.");
                }

                if (!string.IsNullOrWhiteSpace(NuevaSolicitud.NuevaUnidadRed))
                {
                    personal.AgregarUnidadRed(NuevaSolicitud.NuevaUnidadRed);
                }
            }

            if (NuevaSolicitud.ReqSistemas && SistemasSeleccionados.Length > 0)
            {
                NuevaSolicitud.SistemasDetalle = string.Join(", ", SistemasSeleccionados);
            }

            NuevaSolicitud.TieneImpresoraConfigurada = ImpresoraConfiguradaAux;

            NuevaSolicitud.DescripcionRequisito = NuevaSolicitud.DescripcionRequisito.Trim();
            NuevaSolicitud.DescripcionProblema = null;

            // Si se eligió quién autoriza, la solicitud espera su autorización antes de quedar pendiente
            bool pideAutorizacion = NuevaSolicitud.Estatus == EstatusSolicitud.Pendiente
                                    && !string.IsNullOrWhiteSpace(NuevaSolicitud.AutorizaAdmin);

            if (pideAutorizacion)
            {
                NuevaSolicitud.Estatus = EstatusSolicitud.PorAutorizar;
            }

            _context.Solicitudes.Add(NuevaSolicitud);
            _context.SaveChanges();

            bool administradorNotificado = pideAutorizacion
                && _notificaciones.SolicitarAutorizacion(NuevaSolicitud, personal.Nombre);

            if (NuevaSolicitud.Estatus == EstatusSolicitud.Resuelto)
            {
                _notificaciones.NotificarResuelto(NuevaSolicitud, personal);
            }

            _notificaciones.ActualizarPendientesSoporte(NuevaSolicitud.EjecutivoAsignado, avisar: true);
            _context.SaveChanges();

            return new JsonResult(new
            {
                success = true,
                autorizador = pideAutorizacion ? NuevaSolicitud.AutorizaAdmin : null,
                administradorNotificado
            });
        }

        private string NombreUsuarioSesion()
        {
            return HttpContext.Session.GetString("NombreCompleto")
                ?? HttpContext.Session.GetString("NombreUsuario")
                ?? "Sistema";
        }

        private JsonResult Error(string mensaje)
        {
            return new JsonResult(new { success = false, message = mensaje });
        }

        public JsonResult OnGetFiltrarPersonal(string area)
        {
            var listaPersonal = _context.Personal
                .Where(p => p.Area == area)
                .Select(p => new
                {
                    id = p.Id,
                    nombre = p.Nombre,
                    correo = p.Correo,
                    puesto = p.Puesto,
                    esResponsable = p.EsResponsable
                }).ToList();

            return new JsonResult(listaPersonal);
        }
    }
}