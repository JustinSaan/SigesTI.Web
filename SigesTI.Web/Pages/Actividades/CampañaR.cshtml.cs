using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using ClosedXML.Excel;
using SigesTI.Web.Models;
using SigesTI.Web.Data;

namespace SigesTI.Web.Pages
{
    public class CampañaRModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public CampañaRModel(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // El layout (plantilla) se guarda en la carpeta App_Data del proyecto, fuera de wwwroot
        private string RutaLayout => Path.Combine(_env.ContentRootPath, "App_Data", "Layouts", "LayoutCampanaRenovacion.xlsx");

        // Encabezados del Excel (se usan al exportar y al validar la carga)
        private static readonly string[] Encabezados = new[] {
            "Tipo de Cliente", "No Cliente", "Empresa", "Nombre del Cliente",
            "Correo Electrónico", "Teléfono", "Sistema(s)", "N. de serie",
            "Ejecutivo Asignado", "Comentarios Adicionales", "Ticket", "Estatus"
        };

        public List<CampanaRenovacionDetalle> Detalles { get; set; } = new();
        public List<string> EjecutivosSoporte { get; set; } = new();
        public List<int> AniosDisponibles { get; set; } = new();
        public int MesSeleccionado { get; set; }
        public int AnioSeleccionado { get; set; }
        public MetricasAvance Metricas { get; set; } = new();
        public bool ExisteLayout { get; set; }
        public DateTime? FechaLayout { get; set; }

        [BindProperty]
        public CargaCampanaInput Input { get; set; } = new();

        public class MetricasAvance
        {
            public int TotalClientes { get; set; }
            public int Finalizadas { get; set; }
            public int Pendientes { get; set; }
            public int EnCurso { get; set; }
            public int PorcentajeAvance { get; set; } // Porcentaje como entero
        }

        public class CargaCampanaInput
        {
            public int Mes { get; set; }
            public int Anio { get; set; }
            public IFormFile Archivo { get; set; } = null!;
            public bool ConfirmarSobrescritura { get; set; } = false;
        }

        public async Task OnGetAsync(int? mes, int? anio)
        {
            MesSeleccionado = mes ?? DateTime.Now.Month;
            AnioSeleccionado = anio ?? DateTime.Now.Year;

            EjecutivosSoporte = await ObtenerEjecutivosSoporteAsync();

            ExisteLayout = System.IO.File.Exists(RutaLayout);
            if (ExisteLayout) FechaLayout = System.IO.File.GetLastWriteTime(RutaLayout);

            // Años con campañas cargadas + el año actual + el seleccionado
            AniosDisponibles = await _context.CampanaRenovacion
                .Select(c => c.Anio)
                .Distinct()
                .ToListAsync();

            if (!AniosDisponibles.Contains(DateTime.Now.Year)) AniosDisponibles.Add(DateTime.Now.Year);
            if (!AniosDisponibles.Contains(AnioSeleccionado)) AniosDisponibles.Add(AnioSeleccionado);
            AniosDisponibles.Sort();

            var campana = await _context.CampanaRenovacion
                .FirstOrDefaultAsync(c => c.Mes == MesSeleccionado && c.Anio == AnioSeleccionado);

            if (campana != null)
            {
                Detalles = await _context.CampanaRenovacionDetalle
                    .Where(d => d.CampanaId == campana.Id)
                    .ToListAsync();

                CalcularMetricas(Detalles);
            }
        }

        private async Task<List<string>> ObtenerEjecutivosSoporteAsync()
        {
            return await _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte Tecnico")
                .Select(p => p.Nombre)
                .ToListAsync();
        }

        private void CalcularMetricas(List<CampanaRenovacionDetalle> listaDetalles)
        {
            Metricas.TotalClientes = listaDetalles.Count;
            Metricas.Finalizadas = listaDetalles.Count(d => NormalizarEstatus(d.Estatus) == "Cerrado");
            Metricas.EnCurso = listaDetalles.Count(d => NormalizarEstatus(d.Estatus) == "En curso");

            // Todo lo que no está cerrado ni en curso cuenta como pendiente, así los totales siempre cuadran
            Metricas.Pendientes = Metricas.TotalClientes - Metricas.Finalizadas - Metricas.EnCurso;

            // Porcentaje entero sin decimales
            Metricas.PorcentajeAvance = Metricas.TotalClientes > 0
                ? (int)Math.Round(((double)Metricas.Finalizadas / Metricas.TotalClientes) * 100)
                : 0;
        }

        /// <summary>
        /// Convierte cualquier texto de estatus a uno de los 3 valores oficiales.
        /// </summary>
        private string NormalizarEstatus(string? estatusRaw)
        {
            string st = (estatusRaw ?? "").Trim().ToLower();

            if (st.Contains("cerr") || st.Contains("atend") || st.Contains("finaliz")) return "Cerrado";
            if (st.Contains("curso") || st.Contains("proceso")) return "En curso";

            return "Pendiente";
        }

        private const string EtiquetaAtendida = "Encuesta atendida";

        // Quita todas las líneas "Encuesta atendida" del historial
        private string QuitarEncuestaAtendida(string? historial)
        {
            var lineas = (historial ?? "").Split('\n')
                .Where(l => !l.Trim().Equals(EtiquetaAtendida, StringComparison.OrdinalIgnoreCase));

            return string.Join("\n", lineas).Trim();
        }

        // Si el registro está cerrado, pone "Encuesta atendida" una sola vez al inicio del historial
        private string AgregarEncuestaAtendida(string historial, string estatus)
        {
            historial = QuitarEncuestaAtendida(historial);

            if (estatus != "Cerrado") return historial;

            return historial == "" ? EtiquetaAtendida : EtiquetaAtendida + "\n" + historial;
        }

        private string FormatearNoCliente(string noCliente)
        {
            noCliente = noCliente.Trim();
            return noCliente.Contains("-") ? noCliente : $"{noCliente}-0";
        }

        // Pone cada línea de contactos en formato "Nombre Apellido"
        private string FormatearContactos(string? nombres)
        {
            string[] lineas = (nombres ?? "").Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            for (int i = 0; i < lineas.Length; i++)
            {
                lineas[i] = CultureInfo.CurrentCulture.TextInfo.ToTitleCase(lineas[i].ToLower());
            }
            return string.Join("\n", lineas);
        }

        /// <summary>
        /// Exporta el Excel desglosando licencias separadas por coma en celdas individuales,
        /// combinando el sistema correspondiente. Se respeta la estructura (título en fila 1,
        /// encabezados en fila 2 y datos desde la fila 3) para que el archivo se pueda volver a cargar.
        /// </summary>
        public async Task<IActionResult> OnGetExportarExcelAsync(int mes, int anio)
        {
            var campana = await _context.CampanaRenovacion
                .FirstOrDefaultAsync(c => c.Mes == mes && c.Anio == anio);

            List<CampanaRenovacionDetalle> listaDetalles = new();
            if (campana != null)
            {
                listaDetalles = await _context.CampanaRenovacionDetalle
                    .Where(d => d.CampanaId == campana.Id)
                    .ToListAsync();
            }

            CalcularMetricas(listaDetalles);

            string nombreMes = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(mes).ToUpper();
            string nombreArchivo = $"CAMPAÑA DE RENOVACIÓN - {nombreMes} {anio}.xlsx";

            // Colores del archivo (los mismos tonos que la página)
            var colorTitulo = XLColor.FromHtml("#082F49");
            var colorEncabezado = XLColor.FromHtml("#0C4A6E");
            var colorAcento = XLColor.FromHtml("#38BDF8");
            var colorFilaAlterna = XLColor.FromHtml("#F1F5F9");
            var colorBorde = XLColor.FromHtml("#94A3B8");

            using (var workbook = new XLWorkbook())
            {
                // =========================================================
                // HOJA 1: CAMPAÑA DE RENOVACIÓN
                // =========================================================
                var ws1 = workbook.Worksheets.Add("Campaña de Renovación");
                ws1.ShowGridLines = false;
                ws1.SetTabColor(colorEncabezado);
                ws1.Style.Font.FontName = "Calibri";

                // 1. TÍTULO PRINCIPAL (Fila 1)
                var rangoTitulo = ws1.Range(1, 1, 1, 12);
                rangoTitulo.Merge();
                rangoTitulo.Value = $"CAMPAÑA DE RENOVACIÓN {nombreMes} {anio}";
                rangoTitulo.Style.Font.Bold = true;
                rangoTitulo.Style.Font.FontSize = 15;
                rangoTitulo.Style.Font.SetFontColor(XLColor.White);
                rangoTitulo.Style.Fill.BackgroundColor = colorTitulo;
                rangoTitulo.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                rangoTitulo.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                ws1.Row(1).Height = 34;

                // 2. ENCABEZADOS DE COLUMNA (Fila 2)
                var rangoEncabezados = ws1.Range(2, 1, 2, Encabezados.Length);
                for (int i = 0; i < Encabezados.Length; i++)
                {
                    ws1.Cell(2, i + 1).Value = Encabezados[i];
                }
                rangoEncabezados.Style.Font.Bold = true;
                rangoEncabezados.Style.Font.FontSize = 10;
                rangoEncabezados.Style.Font.SetFontColor(XLColor.White);
                rangoEncabezados.Style.Fill.BackgroundColor = colorEncabezado;
                rangoEncabezados.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                rangoEncabezados.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                rangoEncabezados.Style.Alignment.WrapText = true;
                rangoEncabezados.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                rangoEncabezados.Style.Border.InsideBorderColor = XLColor.FromHtml("#1E5A7E");
                rangoEncabezados.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
                rangoEncabezados.Style.Border.BottomBorderColor = colorAcento;
                ws1.Row(2).Height = 30;

                int filaInicioEmpresa = 3;
                int numeroCliente = 0;

                // 3. RECORRIDO Y FORMATEO DE REGISTROS POR CLIENTE
                foreach (var item in listaDetalles)
                {
                    numeroCliente++;

                    var listaSistemasRaw = (item.Sistemas ?? "").Split(new[] { "\n", "\r\n" }, StringSplitOptions.RemoveEmptyEntries);
                    var listaSeriesRaw = (item.NoSerie ?? "").Split(new[] { "\n", "\r\n" }, StringSplitOptions.RemoveEmptyEntries);

                    var bloqueSistemas = new List<(string NombreSistema, List<string> Series)>();

                    int maxElementos = Math.Max(listaSistemasRaw.Length, listaSeriesRaw.Length);
                    for (int idx = 0; idx < maxElementos; idx++)
                    {
                        string sysNombre = idx < listaSistemasRaw.Length ? listaSistemasRaw[idx].Trim() : "";
                        string seriesStr = idx < listaSeriesRaw.Length ? listaSeriesRaw[idx].Trim() : "";

                        var seriesDesglosadas = seriesStr.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                                                         .Select(s => s.Trim())
                                                         .Where(s => !string.IsNullOrEmpty(s))
                                                         .ToList();

                        if (seriesDesglosadas.Count == 0)
                        {
                            seriesDesglosadas.Add("");
                        }

                        bloqueSistemas.Add((sysNombre, seriesDesglosadas));
                    }

                    int filasTotalesEmpresa = bloqueSistemas.Sum(b => b.Series.Count);
                    if (filasTotalesEmpresa == 0) filasTotalesEmpresa = 1;

                    int filaFinEmpresa = filaInicioEmpresa + filasTotalesEmpresa - 1;
                    var rangoEmpresa = ws1.Range(filaInicioEmpresa, 1, filaFinEmpresa, 12);

                    // Estilo base del cliente (los colores de sistema, VIP y estatus se aplican encima)
                    rangoEmpresa.Style.Font.FontSize = 9;
                    rangoEmpresa.Style.Font.SetFontColor(XLColor.FromHtml("#1E293B"));
                    rangoEmpresa.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    rangoEmpresa.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    rangoEmpresa.Style.Alignment.WrapText = true;

                    // Un cliente sí y otro no con fondo gris claro para distinguirlos
                    if (numeroCliente % 2 == 0)
                    {
                        rangoEmpresa.Style.Fill.BackgroundColor = colorFilaAlterna;
                    }

                    int filaCursor = filaInicioEmpresa;
                    foreach (var sistemaInfo in bloqueSistemas)
                    {
                        int cantSeries = sistemaInfo.Series.Count;
                        int subFilaFin = filaCursor + cantSeries - 1;

                        for (int sIdx = 0; sIdx < cantSeries; sIdx++)
                        {
                            ws1.Cell(filaCursor + sIdx, 8).Value = sistemaInfo.Series[sIdx];
                        }

                        ws1.Cell(filaCursor, 7).Value = sistemaInfo.NombreSistema;

                        var rangoSys = ws1.Range(filaCursor, 7, subFilaFin, 7);
                        if (cantSeries > 1)
                        {
                            rangoSys.Merge();
                        }

                        if (!string.IsNullOrWhiteSpace(sistemaInfo.NombreSistema))
                        {
                            var sistema = SistemasCampana.Buscar(sistemaInfo.NombreSistema);
                            string colorFondo = sistema != null ? sistema.ColorExcel : "#64748B"; // Gris por defecto
                            string colorTexto = sistema != null ? sistema.ColorTexto : "#FFFFFF";

                            rangoSys.Style.Fill.BackgroundColor = XLColor.FromHtml(colorFondo);
                            rangoSys.Style.Font.SetFontColor(XLColor.FromHtml(colorTexto));
                            rangoSys.Style.Font.Bold = true;
                        }

                        filaCursor += cantSeries;
                    }

                    // Las series en letra de ancho fijo para leerlas mejor
                    ws1.Range(filaInicioEmpresa, 8, filaFinEmpresa, 8).Style.Font.FontName = "Consolas";

                    ws1.Cell(filaInicioEmpresa, 1).Value = item.TipoCliente;
                    ws1.Cell(filaInicioEmpresa, 2).Value = item.NoCliente;
                    ws1.Cell(filaInicioEmpresa, 3).Value = item.Empresa;
                    ws1.Cell(filaInicioEmpresa, 4).Value = item.NombreCliente;
                    ws1.Cell(filaInicioEmpresa, 5).Value = item.CorreoElectronico;
                    ws1.Cell(filaInicioEmpresa, 6).Value = item.Telefono;
                    ws1.Cell(filaInicioEmpresa, 9).Value = item.EjecutivoAsignado;
                    ws1.Cell(filaInicioEmpresa, 10).Value = item.ComentariosAdicionales;
                    ws1.Cell(filaInicioEmpresa, 11).Value = item.Ticket;
                    ws1.Cell(filaInicioEmpresa, 12).Value = item.Estatus;

                    if (filasTotalesEmpresa > 1)
                    {
                        foreach (int col in new[] { 1, 2, 3, 4, 5, 6, 9, 10, 11, 12 })
                        {
                            ws1.Range(filaInicioEmpresa, col, filaFinEmpresa, col).Merge();
                        }
                    }

                    // Datos importantes en negrita
                    ws1.Cell(filaInicioEmpresa, 2).Style.Font.Bold = true;
                    ws1.Cell(filaInicioEmpresa, 3).Style.Font.Bold = true;
                    ws1.Cell(filaInicioEmpresa, 11).Style.Font.Bold = true;

                    // Comentarios alineados a la izquierda
                    ws1.Cell(filaInicioEmpresa, 10).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;

                    // VIP en amarillo dorado
                    if (item.TipoCliente?.ToUpper() == "VIP")
                    {
                        var rangoVip = ws1.Range(filaInicioEmpresa, 1, filaFinEmpresa, 1);
                        rangoVip.Style.Fill.BackgroundColor = XLColor.FromHtml("#FACC15");
                        rangoVip.Style.Font.SetFontColor(XLColor.FromHtml("#422006"));
                        rangoVip.Style.Font.Bold = true;
                    }

                    // Estatus con su color (verde, amarillo o rojo)
                    var (fondoEstatus, textoEstatus) = ObtenerColoresEstatus(item.Estatus);
                    var rangoEstatus = ws1.Range(filaInicioEmpresa, 12, filaFinEmpresa, 12);
                    rangoEstatus.Style.Fill.BackgroundColor = XLColor.FromHtml(fondoEstatus);
                    rangoEstatus.Style.Font.SetFontColor(XLColor.FromHtml(textoEstatus));
                    rangoEstatus.Style.Font.Bold = true;

                    // Bordes: líneas grises suaves dentro y una línea más marcada entre clientes
                    rangoEmpresa.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                    rangoEmpresa.Style.Border.InsideBorderColor = colorBorde;
                    rangoEmpresa.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    rangoEmpresa.Style.Border.OutsideBorderColor = XLColor.FromHtml("#475569");

                    filaInicioEmpresa = filaFinEmpresa + 1;
                }

                ws1.Column(1).Width = 12;
                ws1.Column(2).Width = 12;
                ws1.Column(3).Width = 32;
                ws1.Column(4).Width = 28;
                ws1.Column(5).Width = 30;
                ws1.Column(6).Width = 20;
                ws1.Column(7).Width = 18;
                ws1.Column(8).Width = 18;
                ws1.Column(9).Width = 22;
                ws1.Column(10).Width = 60;
                ws1.Column(11).Width = 10;
                ws1.Column(12).Width = 12;

                // El título y los encabezados quedan fijos al bajar
                ws1.SheetView.FreezeRows(2);

                // Impresión: horizontal, a lo ancho de una hoja y repitiendo encabezados en cada página
                ws1.PageSetup.PageOrientation = XLPageOrientation.Landscape;
                ws1.PageSetup.PaperSize = XLPaperSize.LegalPaper;
                ws1.PageSetup.FitToPages(1, 0);
                ws1.PageSetup.SetRowsToRepeatAtTop(1, 2);
                ws1.PageSetup.CenterHorizontally = true;
                ws1.PageSetup.Margins.Left = 0.3;
                ws1.PageSetup.Margins.Right = 0.3;
                ws1.PageSetup.Margins.Top = 0.4;
                ws1.PageSetup.Margins.Bottom = 0.5;
                ws1.PageSetup.Footer.Center.AddText("Página &P de &N");

                // =========================================================
                // HOJA 2: TABLA DE AVANCES Y MÉTRICAS
                // =========================================================
                var ws2 = workbook.Worksheets.Add("Avances");
                ws2.ShowGridLines = false;
                ws2.SetTabColor(XLColor.FromHtml("#15803D"));
                ws2.Style.Font.FontName = "Calibri";

                // Título
                var rangoTituloAvance = ws2.Range(1, 1, 1, 5);
                rangoTituloAvance.Merge();
                rangoTituloAvance.Value = $"AVANCE DE LA CAMPAÑA {nombreMes} {anio}";
                rangoTituloAvance.Style.Font.Bold = true;
                rangoTituloAvance.Style.Font.FontSize = 14;
                rangoTituloAvance.Style.Font.SetFontColor(XLColor.White);
                rangoTituloAvance.Style.Fill.BackgroundColor = colorTitulo;
                rangoTituloAvance.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                rangoTituloAvance.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                ws2.Row(1).Height = 30;

                // Encabezados
                string[] encabezadosMetricas = new[] {
                    "Total de clientes", "Encuestas finalizadas", "Seguimiento pendiente",
                    "Encuestas en Curso", "Porcentaje"
                };

                var rangoEncabezadosAvance = ws2.Range(2, 1, 2, 5);
                for (int i = 0; i < encabezadosMetricas.Length; i++)
                {
                    ws2.Cell(2, i + 1).Value = encabezadosMetricas[i];
                }
                rangoEncabezadosAvance.Style.Font.Bold = true;
                rangoEncabezadosAvance.Style.Font.FontSize = 10;
                rangoEncabezadosAvance.Style.Font.SetFontColor(XLColor.White);
                rangoEncabezadosAvance.Style.Fill.BackgroundColor = colorEncabezado;
                rangoEncabezadosAvance.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                rangoEncabezadosAvance.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                rangoEncabezadosAvance.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
                rangoEncabezadosAvance.Style.Border.BottomBorderColor = colorAcento;
                ws2.Row(2).Height = 24;

                // Valores (el porcentaje se guarda como número para poder usarlo en fórmulas)
                ws2.Cell(3, 1).Value = Metricas.TotalClientes;
                ws2.Cell(3, 2).Value = Metricas.Finalizadas;
                ws2.Cell(3, 3).Value = Metricas.Pendientes;
                ws2.Cell(3, 4).Value = Metricas.EnCurso;
                ws2.Cell(3, 5).Value = Metricas.PorcentajeAvance / 100.0;
                ws2.Cell(3, 5).Style.NumberFormat.Format = "0%";

                var rangoValores = ws2.Range(3, 1, 3, 5);
                rangoValores.Style.Font.Bold = true;
                rangoValores.Style.Font.FontSize = 16;
                rangoValores.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                rangoValores.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                ws2.Row(3).Height = 34;

                // Cada métrica con su color
                ws2.Cell(3, 1).Style.Font.SetFontColor(XLColor.FromHtml("#1E293B"));
                ws2.Cell(3, 2).Style.Font.SetFontColor(XLColor.FromHtml("#166534"));
                ws2.Cell(3, 2).Style.Fill.BackgroundColor = XLColor.FromHtml("#DCFCE7");
                ws2.Cell(3, 3).Style.Font.SetFontColor(XLColor.FromHtml("#991B1B"));
                ws2.Cell(3, 3).Style.Fill.BackgroundColor = XLColor.FromHtml("#FEE2E2");
                ws2.Cell(3, 4).Style.Font.SetFontColor(XLColor.FromHtml("#854D0E"));
                ws2.Cell(3, 4).Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF9C3");
                ws2.Cell(3, 5).Style.Font.SetFontColor(XLColor.FromHtml("#0C4A6E"));
                ws2.Cell(3, 5).Style.Fill.BackgroundColor = XLColor.FromHtml("#E0F2FE");

                var tablaAvance = ws2.Range(2, 1, 3, 5);
                tablaAvance.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                tablaAvance.Style.Border.OutsideBorderColor = XLColor.FromHtml("#475569");
                tablaAvance.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                tablaAvance.Style.Border.InsideBorderColor = colorBorde;

                ws2.Columns(1, 5).Width = 24;

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    var content = stream.ToArray();
                    return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nombreArchivo);
                }
            }
        }

        // Colores de fondo y texto del estatus para el Excel
        private (string Fondo, string Texto) ObtenerColoresEstatus(string? estatus)
        {
            switch (NormalizarEstatus(estatus))
            {
                case "Cerrado": return ("#DCFCE7", "#166534");
                case "En curso": return ("#FEF9C3", "#854D0E");
                default: return ("#FEE2E2", "#991B1B");
            }
        }

        private string ObtenerTextoCelda(IXLCell celda)
        {
            if (celda == null) return string.Empty;
            if (celda.IsMerged())
            {
                celda = celda.MergedRange().FirstCell();
            }

            string val = celda.GetFormattedString();
            if (string.IsNullOrEmpty(val)) val = celda.Value.ToString() ?? string.Empty;
            return val.Replace("\r\n", "\n").Replace("\r", "\n").Trim();
        }

        // Revisa que la fila 2 tenga los encabezados de la campaña. Regresa el error o null si está bien.
        private string? ValidarEncabezados(IXLWorksheet worksheet)
        {
            for (int col = 1; col <= Encabezados.Length; col++)
            {
                var valorCelda = ObtenerTextoCelda(worksheet.Cell(2, col));
                if (!valorCelda.Equals(Encabezados[col - 1], StringComparison.OrdinalIgnoreCase))
                {
                    return $"El archivo no coincide con la estructura requerida. Se esperaba '{Encabezados[col - 1]}' en la columna {col}.";
                }
            }
            return null;
        }

        /// <summary>
        /// Descarga el layout (plantilla) de la campaña que se cargó previamente.
        /// </summary>
        public IActionResult OnGetDescargarLayout()
        {
            if (!System.IO.File.Exists(RutaLayout))
                return NotFound("Aún no se ha cargado un layout.");

            var contenido = System.IO.File.ReadAllBytes(RutaLayout);
            return File(contenido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "LAYOUT CAMPAÑA DE RENOVACIÓN.xlsx");
        }

        /// <summary>
        /// Guarda (o reemplaza) el layout de la campaña. Se valida que tenga los encabezados correctos.
        /// </summary>
        public async Task<IActionResult> OnPostCargarLayoutAsync(IFormFile? archivo)
        {
            if (archivo == null || archivo.Length == 0)
                return new JsonResult(new { exito = false, mensaje = "Por favor selecciona un archivo." });

            if (Path.GetExtension(archivo.FileName).ToLower() != ".xlsx")
                return new JsonResult(new { exito = false, mensaje = "El layout debe tener formato .xlsx." });

            try
            {
                using (var memoria = new MemoryStream())
                {
                    await archivo.CopyToAsync(memoria);

                    // Validar que sea un layout de campaña antes de guardarlo
                    memoria.Position = 0;
                    using (var workbook = new XLWorkbook(memoria))
                    {
                        var worksheet = workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null)
                            return new JsonResult(new { exito = false, mensaje = "El archivo Excel está vacío." });

                        string? errorEncabezados = ValidarEncabezados(worksheet);
                        if (errorEncabezados != null)
                            return new JsonResult(new { exito = false, mensaje = errorEncabezados });
                    }

                    Directory.CreateDirectory(Path.GetDirectoryName(RutaLayout)!);
                    await System.IO.File.WriteAllBytesAsync(RutaLayout, memoria.ToArray());
                }

                return new JsonResult(new { exito = true, mensaje = "El layout se guardó correctamente." });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { exito = false, mensaje = "Error al guardar el layout: " + ex.Message });
            }
        }

        private string NormalizarEjecutivo(string nombreExcel, List<string> personalSoporte)
        {
            if (string.IsNullOrWhiteSpace(nombreExcel)) return string.Empty;

            string normalizadoExcel = QuitarTitulo(nombreExcel);

            foreach (var nombreBD in personalSoporte)
            {
                string normalizadoBD = QuitarTitulo(nombreBD);

                if (normalizadoBD.Contains(normalizadoExcel) || normalizadoExcel.Contains(normalizadoBD))
                {
                    return nombreBD;
                }
            }

            return nombreExcel;
        }

        // Quita "Ing." y "Lic." del nombre para poder compararlo
        private string QuitarTitulo(string nombre)
        {
            return nombre.ToLower()
                .Replace("ing.", "").Replace("lic.", "").Replace("ing ", "").Replace("lic ", "").Trim();
        }

        public async Task<IActionResult> OnPostCargarExcelAsync([FromForm] CargaCampanaInput input)
        {
            if (input.Archivo == null || input.Archivo.Length == 0)
                return new JsonResult(new { exito = false, mensaje = "Por favor selecciona un archivo." });

            // ClosedXML solo puede leer .xlsx
            var extension = Path.GetExtension(input.Archivo.FileName).ToLower();
            if (extension != ".xlsx")
                return new JsonResult(new { exito = false, mensaje = "El archivo debe tener formato .xlsx. Si es .xls, ábrelo en Excel y guárdalo como .xlsx." });

            if (input.Mes < 1 || input.Mes > 12)
                return new JsonResult(new { exito = false, mensaje = "Selecciona un mes válido." });

            if (input.Anio < 2020 || input.Anio > 2100)
                return new JsonResult(new { exito = false, mensaje = "Ingresa un año válido (2020 - 2100)." });

            var personalSoporte = await ObtenerEjecutivosSoporteAsync();

            var campanaExistente = await _context.CampanaRenovacion
                .FirstOrDefaultAsync(c => c.Mes == input.Mes && c.Anio == input.Anio);

            if (campanaExistente != null && !input.ConfirmarSobrescritura)
            {
                string nombreMes = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(input.Mes);
                return new JsonResult(new
                {
                    exito = false,
                    requiereConfirmacion = true,
                    mensaje = $"Ya existe una campaña de renovación de {nombreMes} {input.Anio}. Si la sobrescribes se perderán los comentarios, tickets y estatus capturados. ¿Deseas continuar?"
                });
            }

            var nuevosDetalles = new List<CampanaRenovacionDetalle>();

            try
            {
                using (var stream = input.Archivo.OpenReadStream())
                {
                    using (var workbook = new XLWorkbook(stream))
                    {
                        var worksheet = workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null || worksheet.LastRowUsed() == null)
                            return new JsonResult(new { exito = false, mensaje = "El archivo Excel está vacío." });

                        string? errorEncabezados = ValidarEncabezados(worksheet);
                        if (errorEncabezados != null)
                            return new JsonResult(new { exito = false, mensaje = errorEncabezados });

                        var ultimaFila = worksheet.LastRowUsed()!.RowNumber();
                        int r = 3;
                        while (r <= ultimaFila)
                        {
                            var celdaEmpresa = worksheet.Cell(r, 3);
                            string empresaRaw = ObtenerTextoCelda(celdaEmpresa);

                            if (string.IsNullOrWhiteSpace(empresaRaw))
                            {
                                r++;
                                continue;
                            }

                            int numFilasBloque = 1;
                            if (celdaEmpresa.IsMerged())
                            {
                                var rango = celdaEmpresa.MergedRange();
                                numFilasBloque = (rango.LastRow().RowNumber() - rango.FirstRow().RowNumber()) + 1;
                            }

                            string tipoCliente = ObtenerTextoCelda(worksheet.Cell(r, 1));
                            string noClienteRaw = ObtenerTextoCelda(worksheet.Cell(r, 2));
                            string nombreClienteRaw = ObtenerTextoCelda(worksheet.Cell(r, 4));
                            string correo = ObtenerTextoCelda(worksheet.Cell(r, 5));
                            string telefono = ObtenerTextoCelda(worksheet.Cell(r, 6));
                            string ejecutivoRaw = ObtenerTextoCelda(worksheet.Cell(r, 9));
                            string comentarios = ObtenerTextoCelda(worksheet.Cell(r, 10));
                            string ticket = ObtenerTextoCelda(worksheet.Cell(r, 11));
                            string estatusRaw = ObtenerTextoCelda(worksheet.Cell(r, 12));

                            var mapaSistemasSeries = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

                            for (int offset = 0; offset < numFilasBloque; offset++)
                            {
                                int filaActual = r + offset;
                                string sysSub = ObtenerTextoCelda(worksheet.Cell(filaActual, 7));
                                string serieSub = ObtenerTextoCelda(worksheet.Cell(filaActual, 8));

                                if (string.IsNullOrWhiteSpace(sysSub) && !string.IsNullOrWhiteSpace(serieSub))
                                {
                                    sysSub = SistemasCampana.DeducirPorSerie(serieSub);
                                }
                                else if (!string.IsNullOrWhiteSpace(sysSub))
                                {
                                    sysSub = SistemasCampana.Normalizar(sysSub);
                                }

                                if (!string.IsNullOrWhiteSpace(sysSub))
                                {
                                    if (!mapaSistemasSeries.ContainsKey(sysSub))
                                    {
                                        mapaSistemasSeries[sysSub] = new List<string>();
                                    }

                                    if (!string.IsNullOrWhiteSpace(serieSub))
                                    {
                                        var subSeries = serieSub.Split(new[] { "\n", "," }, StringSplitOptions.RemoveEmptyEntries);
                                        foreach (var s in subSeries)
                                        {
                                            string serieLimpia = s.Trim();
                                            if (serieLimpia != "" && !mapaSistemasSeries[sysSub].Contains(serieLimpia))
                                            {
                                                mapaSistemasSeries[sysSub].Add(serieLimpia);
                                            }
                                        }
                                    }
                                }
                            }

                            var listaSistemasFinal = mapaSistemasSeries.Keys.ToList();
                            var listaSeriesFinal = mapaSistemasSeries.Select(kv => string.Join(", ", kv.Value)).ToList();

                            nuevosDetalles.Add(new CampanaRenovacionDetalle
                            {
                                TipoCliente = tipoCliente,
                                NoCliente = FormatearNoCliente(noClienteRaw),
                                Empresa = empresaRaw.ToUpper(),
                                NombreCliente = FormatearContactos(nombreClienteRaw),
                                CorreoElectronico = correo,
                                Telefono = telefono,
                                Sistemas = string.Join("\n", listaSistemasFinal),
                                NoSerie = string.Join("\n", listaSeriesFinal),
                                EjecutivoAsignado = NormalizarEjecutivo(ejecutivoRaw, personalSoporte),
                                ComentariosAdicionales = AgregarEncuestaAtendida(comentarios, NormalizarEstatus(estatusRaw)),
                                Ticket = ticket,
                                Estatus = NormalizarEstatus(estatusRaw)
                            });

                            r += numFilasBloque;
                        }
                    }
                }

                // Transacción: si algo falla, no se borra la campaña anterior
                using (var transaccion = await _context.Database.BeginTransactionAsync())
                {
                    if (campanaExistente != null)
                    {
                        _context.CampanaRenovacionDetalle.RemoveRange(
                            _context.CampanaRenovacionDetalle.Where(d => d.CampanaId == campanaExistente.Id)
                        );
                        _context.CampanaRenovacion.Remove(campanaExistente);
                        await _context.SaveChangesAsync();
                    }

                    var nuevaCampana = new CampanaRenovacion
                    {
                        Mes = input.Mes,
                        Anio = input.Anio,
                        FechaCarga = DateTime.Now
                    };

                    _context.CampanaRenovacion.Add(nuevaCampana);
                    await _context.SaveChangesAsync();

                    foreach (var d in nuevosDetalles) d.CampanaId = nuevaCampana.Id;
                    _context.CampanaRenovacionDetalle.AddRange(nuevosDetalles);
                    await _context.SaveChangesAsync();

                    await transaccion.CommitAsync();
                }

                return new JsonResult(new { exito = true, mensaje = $"Cargado con éxito. Se registraron {nuevosDetalles.Count} clientes." });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { exito = false, mensaje = "Error al procesar el archivo: " + ex.Message });
            }
        }

        public async Task<IActionResult> OnPostEditarRegistroAsync([FromForm] CampanaRenovacionDetalle model)
        {
            var registro = await _context.CampanaRenovacionDetalle.FindAsync(model.Id);
            if (registro == null) return new JsonResult(new { exito = false, mensaje = "Registro no encontrado." });

            if (string.IsNullOrWhiteSpace(model.NoCliente))
                return new JsonResult(new { exito = false, mensaje = "El No. Cliente es obligatorio." });

            if (string.IsNullOrWhiteSpace(model.Empresa))
                return new JsonResult(new { exito = false, mensaje = "La Empresa es obligatoria." });

            registro.TipoCliente = model.TipoCliente ?? "Normal";
            registro.NoCliente = FormatearNoCliente(model.NoCliente);
            registro.Empresa = model.Empresa.Trim().ToUpper();
            registro.NombreCliente = FormatearContactos(model.NombreCliente);
            registro.CorreoElectronico = model.CorreoElectronico;
            registro.Telefono = model.Telefono;
            registro.Sistemas = model.Sistemas;
            registro.NoSerie = model.NoSerie;
            registro.EjecutivoAsignado = model.EjecutivoAsignado;
            registro.Ticket = model.Ticket?.Trim();
            registro.Estatus = NormalizarEstatus(model.Estatus);
            registro.ComentariosAdicionales = AgregarEncuestaAtendida(registro.ComentariosAdicionales ?? "", registro.Estatus);

            await _context.SaveChangesAsync();
            return new JsonResult(new { exito = true, mensaje = "Registro actualizado correctamente." });
        }

        public async Task<IActionResult> OnPostGuardarComentarioAsync(int id, string? nuevoSeguimiento, string? nuevoEstatus, string? nuevoTicket)
        {
            var detalle = await _context.CampanaRenovacionDetalle.FindAsync(id);
            if (detalle == null) return new JsonResult(new { exito = false, mensaje = "Registro no encontrado." });

            string fechaHoy = DateTime.Now.ToString("dd/MM/yyyy");
            string texto = (nuevoSeguimiento ?? "").Trim();
            string historial = detalle.ComentariosAdicionales ?? "";

            string estatusNuevo = string.IsNullOrWhiteSpace(nuevoEstatus) ? detalle.Estatus : NormalizarEstatus(nuevoEstatus);

            // Se quita la etiqueta para trabajar solo con los comentarios
            historial = QuitarEncuestaAtendida(historial);

            if (texto != "")
            {
                // Solo se revisa el último bloque para saber si ya hay notas de hoy
                string ultimoBloque = historial.Split("\n\n").Last();

                if (historial == "")
                    historial = $"{fechaHoy} {texto}";
                else if (ultimoBloque.Contains(fechaHoy))
                    historial += "\n" + texto;
                else
                    historial += $"\n\n{fechaHoy} {texto}";
            }

            detalle.ComentariosAdicionales = AgregarEncuestaAtendida(historial, estatusNuevo);
            detalle.Estatus = estatusNuevo;
            detalle.Ticket = nuevoTicket?.Trim();

            await _context.SaveChangesAsync();
            return new JsonResult(new
            {
                exito = true,
                comentariosActualizados = detalle.ComentariosAdicionales,
                estatusActualizado = detalle.Estatus,
                ticketActualizado = detalle.Ticket
            });
        }
    }
}
