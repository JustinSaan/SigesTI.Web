namespace SigesTI.Web.Seguridad
{
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string Administracion = "Administración";
        public const string Soporte = "Soporte";
        public const string Usuario = "Usuario";

        public static readonly string[] Todos =
        {
            Admin, Administracion, Soporte, Usuario
        };

        // Admin siempre tiene control total, por eso no aparece aquí
        public static readonly string[] Configurables =
        {
            Administracion, Soporte, Usuario
        };

        public static bool EsValido(string rol)
        {
            return Todos.Contains(rol);
        }
    }

    public enum Accion
    {
        Ver,
        Crear,
        Editar,
        Eliminar,
        Exportar
    }

    public record ModuloSistema(
        string Clave,
        string Nombre,
        string Grupo,
        Accion[] Acciones);

    public static class Modulos
    {
        public const string GenerarSolicitud = "GenerarSolicitud";
        public const string ConsultarSolicitudes = "ConsultarSolicitudes";
        public const string ReporteTickets = "ReporteTickets";
        public const string PlanRespaldos = "PlanRespaldos";
        public const string TareasGenerales = "TareasGenerales";
        public const string CampanaRenovacion = "CampanaRenovacion";
        public const string Indicadores = "Indicadores";
        public const string Personal = "Personal";
        public const string Cuenta = "Cuenta";

        // Cada módulo indica qué acciones tienen sentido en su pantalla
        public static readonly ModuloSistema[] Todos =
        {
            new(GenerarSolicitud, "Generar solicitud", "Requerimientos",
                new[] { Accion.Ver, Accion.Crear }),

            new(ConsultarSolicitudes, "Consultar solicitudes", "Requerimientos",
                new[] { Accion.Ver, Accion.Editar, Accion.Eliminar, Accion.Exportar }),

            new(ReporteTickets, "Reporte de tickets", "Actividades",
                new[] { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Exportar }),

            new(PlanRespaldos, "Plan de respaldos", "Actividades",
                new[] { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Eliminar }),

            new(TareasGenerales, "Tareas generales", "Actividades",
                new[] { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Eliminar, Accion.Exportar }),

            new(CampanaRenovacion, "Campaña de renovación", "Actividades",
                new[] { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Exportar }),

            new(Indicadores, "Indicadores y métricas", "Actividades",
                new[] { Accion.Ver, Accion.Exportar }),

            new(Personal, "Administrar personal", "Cuenta",
                new[] { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Eliminar }),

            new(Cuenta, "Usuarios y bitácora", "Cuenta",
                new[] { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Eliminar, Accion.Exportar })
        };
    }

    // Va en la clase de la página: indica a qué módulo pertenece
    [AttributeUsage(AttributeTargets.Class)]
    public class ModuloAttribute : Attribute
    {
        public string Clave { get; }

        public ModuloAttribute(string clave)
        {
            Clave = clave;
        }
    }

    // Va en un handler: indica qué acción necesita. Sin este atributo se pide "Ver".
    [AttributeUsage(AttributeTargets.Method)]
    public class PermisoAttribute : Attribute
    {
        public Accion Accion { get; }

        public PermisoAttribute(Accion accion)
        {
            Accion = accion;
        }
    }
}
