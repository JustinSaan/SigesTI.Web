namespace SigesTI.Web.Models
{
    /// <summary>
    /// Datos de un sistema de la Campaña de Renovación (nombre, palabras clave, prefijos de serie y colores).
    /// </summary>
    public class SistemaCampana
    {
        public string Nombre { get; set; } = string.Empty;
        public string[] Claves { get; set; } = Array.Empty<string>();
        public string[] Prefijos { get; set; } = Array.Empty<string>();
        public string ClaseCss { get; set; } = string.Empty;
        public string ColorExcel { get; set; } = string.Empty;
        public string ColorTexto { get; set; } = "#FFFFFF";
    }

    /// <summary>
    /// Catálogo único de sistemas. Se usa en el servidor, en la vista y en el JS (se envía como JSON).
    /// </summary>
    public static class SistemasCampana
    {
        // El orden importa: se revisa de arriba hacia abajo
        public static readonly List<SistemaCampana> Lista = new()
        {
            new SistemaCampana { Nombre = "DIAENLINEA PREMIUM", Claves = new[] { "DIAENLINEA", "DIA EN LINEA" }, Prefijos = new[] { "DNL" }, ClaseCss = "sys-diaenlinea", ColorExcel = "#B6FF82", ColorTexto = "#000000" },
            new SistemaCampana { Nombre = "DIAWEB", Claves = new[] { "DIAWEB", "DIA WEB" }, Prefijos = new[] { "DIAW" }, ClaseCss = "sys-diaweb", ColorExcel = "#8FE5FF", ColorTexto = "#000000" },
            new SistemaCampana { Nombre = "SITA", Claves = new[] { "SITA" }, Prefijos = new[] { "M3WIN" }, ClaseCss = "sys-sita", ColorExcel = "#EA580C" },
            new SistemaCampana { Nombre = "VUCEM", Claves = new[] { "VUCEM" }, Prefijos = new[] { "COVE" }, ClaseCss = "sys-vucem", ColorExcel = "#1D4ED8" },
            new SistemaCampana { Nombre = "MÓDULO DE ENLACE", Claves = new[] { "ENLACE", "MODULO", "MÓDULO" }, Prefijos = new[] { "MED" }, ClaseCss = "sys-enlace", ColorExcel = "#704332" },
            new SistemaCampana { Nombre = "COA", Claves = new[] { "COA" }, Prefijos = new[] { "COA" }, ClaseCss = "sys-coa", ColorExcel = "#15803D" },
            new SistemaCampana { Nombre = "DIA 8", Claves = new[] { "DIA 8" }, Prefijos = new[] { "DIA" }, ClaseCss = "sys-dia8", ColorExcel = "#0284C7" }
        };

        public static SistemaCampana? Buscar(string? sistemaRaw)
        {
            if (string.IsNullOrWhiteSpace(sistemaRaw)) return null;

            string sysUpper = sistemaRaw.Trim().ToUpper();
            if (sysUpper == "DIA") sysUpper = "DIA 8";

            return Lista.FirstOrDefault(s => s.Claves.Any(c => sysUpper.Contains(c)));
        }

        public static string Normalizar(string? sistemaRaw)
        {
            var sistema = Buscar(sistemaRaw);
            return sistema != null ? sistema.Nombre : (sistemaRaw ?? string.Empty).Trim();
        }

        public static string DeducirPorSerie(string? serie)
        {
            if (string.IsNullOrWhiteSpace(serie)) return string.Empty;

            string s = serie.Trim().ToUpper();
            var sistema = Lista.FirstOrDefault(x => x.Prefijos.Any(p => s.StartsWith(p)));
            return sistema != null ? sistema.Nombre : string.Empty;
        }

        public static string ObtenerClaseCss(string? sistemaRaw)
        {
            var sistema = Buscar(sistemaRaw);
            return "sys-badge " + (sistema != null ? sistema.ClaseCss : "sys-otro");
        }
    }
}
