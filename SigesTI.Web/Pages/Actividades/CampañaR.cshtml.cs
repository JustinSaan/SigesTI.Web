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

        public CampañaRModel(ApplicationDbContext context)
        {
            _context = context;
        }

        public List<CampanaRenovacionDetalle> Detalles { get; set; } = new();
        public List<string> EjecutivosSoporte { get; set; } = new();
        public int MesSeleccionado { get; set; }
        public int AnioSeleccionado { get; set; }
        public MetricasAvance Metricas { get; set; } = new();

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

            EjecutivosSoporte = await _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte Tecnico")
                .Select(p => p.Nombre)
                .ToListAsync();

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

        private void CalcularMetricas(List<CampanaRenovacionDetalle> listaDetalles)
        {
            Metricas.TotalClientes = listaDetalles.Count;
            Metricas.Finalizadas = listaDetalles.Count(d => (d.Estatus ?? "").Trim().Equals("Cerrado", StringComparison.OrdinalIgnoreCase));
            Metricas.EnCurso = listaDetalles.Count(d => (d.Estatus ?? "").Trim().Equals("En curso", StringComparison.OrdinalIgnoreCase));
            Metricas.Pendientes = listaDetalles.Count(d => (d.Estatus ?? "").Trim().Equals("Pendiente", StringComparison.OrdinalIgnoreCase));

            // Porcentaje entero sin decimales
            Metricas.PorcentajeAvance = Metricas.TotalClientes > 0
                ? (int)Math.Round(((double)Metricas.Finalizadas / Metricas.TotalClientes) * 100)
                : 0;
        }

        private XLColor ObtenerColorSistema(string sistemaRaw)
        {
            if (string.IsNullOrWhiteSpace(sistemaRaw)) return XLColor.NoColor;
            string sysUpper = sistemaRaw.Trim().ToUpper();

            if (sysUpper.Contains("DIAENLINEA") || sysUpper.Contains("DIA EN LINEA")) return XLColor.FromHtml("#4ADE80"); // Verde brillante
            if (sysUpper.Contains("DIAWEB") || sysUpper.Contains("DIA WEB")) return XLColor.FromHtml("#38BDF8"); // Azul claro
            if (sysUpper.Contains("SITA")) return XLColor.FromHtml("#EA580C"); // Naranja
            if (sysUpper.Contains("VUCEM")) return XLColor.FromHtml("#0284C7"); // Azul
            if (sysUpper.Contains("ENLACE") || sysUpper.Contains("MÓDULO")) return XLColor.FromHtml("#B45309"); // Café / Ámbar
            if (sysUpper.Contains("COA")) return XLColor.FromHtml("#16A34A"); // Verde oscuro
            if (sysUpper.Contains("DIA 8") || sysUpper == "DIA") return XLColor.FromHtml("#0284C7"); // Azul

            return XLColor.FromHtml("#64748B"); // Gris por defecto
        }

        /// <summary>
        /// Exporta el Excel desglosando licencias separadas por coma en celdas individuales,
        /// combinando el sistema correspondiente, con cuadrícula negra y encabezados en azul corporativo.
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

            using (var workbook = new XLWorkbook())
            {
                // =========================================================
                // HOJA 1: CAMPAÑA DE RENOVACIÓN
                // =========================================================
                var ws1 = workbook.Worksheets.Add("Campaña de Renovación");
                ws1.ShowGridLines = true;

                // 1. TÍTULO PRINCIPAL (Fila 1)
                var rangoTitulo = ws1.Range(1, 1, 1, 12);
                rangoTitulo.Merge();
                rangoTitulo.Value = $"CAMPAÑA DE RENOVACIÓN {nombreMes} {anio}";
                rangoTitulo.Style.Font.Bold = true;
                rangoTitulo.Style.Font.FontName = "Calibri";
                rangoTitulo.Style.Font.FontSize = 13;
                rangoTitulo.Style.Font.SetFontColor(XLColor.White);
                rangoTitulo.Style.Fill.BackgroundColor = XLColor.FromHtml("#0369A1"); // Azul Corporativo Elegante
                rangoTitulo.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                rangoTitulo.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                ws1.Row(1).Height = 28;

                // 2. ENCABEZADOS DE COLUMNA (Fila 2)
                string[] encabezados = new[] {
                    "Tipo de Cliente", "No Cliente", "Empresa", "Nombre del Cliente",
                    "Correo Electrónico", "Teléfono", "Sistema(s)", "N. de serie",
                    "Ejecutivo Asignado", "Comentarios Adicionales", "Ticket", "Estatus"
                };

                for (int i = 0; i < encabezados.Length; i++)
                {
                    var cell = ws1.Cell(2, i + 1);
                    cell.Value = encabezados[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontName = "Calibri";
                    cell.Style.Font.FontSize = 10;
                    cell.Style.Font.SetFontColor(XLColor.White);
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0284C7"); // Azul Agradable/Claro
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    cell.Style.Alignment.WrapText = true;

                    // Borde Negro para el Encabezado
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.OutsideBorderColor = XLColor.Black;
                }
                ws1.Row(2).Height = 26;

                int filaInicioEmpresa = 3;

                // 3. RECORRIDO Y FORMATEO DE REGISTROS POR CLIENTE
                foreach (var item in listaDetalles)
                {
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
                    int filaCursor = filaInicioEmpresa;

                    foreach (var sistemaInfo in bloqueSistemas)
                    {
                        int cantSeries = sistemaInfo.Series.Count;
                        int subFilaInicio = filaCursor;
                        int subFilaFin = filaCursor + cantSeries - 1;

                        for (int sIdx = 0; sIdx < cantSeries; sIdx++)
                        {
                            int rActual = subFilaInicio + sIdx;
                            var cellSerie = ws1.Cell(rActual, 8);
                            cellSerie.Value = sistemaInfo.Series[sIdx];
                            cellSerie.Style.Font.FontName = "Calibri";
                            cellSerie.Style.Font.FontSize = 9;
                            cellSerie.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                            cellSerie.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        }

                        var cellSys = ws1.Cell(subFilaInicio, 7);
                        cellSys.Value = sistemaInfo.NombreSistema;

                        if (cantSeries > 1)
                        {
                            ws1.Range(subFilaInicio, 7, subFilaFin, 7).Merge();
                        }

                        if (!string.IsNullOrWhiteSpace(sistemaInfo.NombreSistema))
                        {
                            var colorSys = ObtenerColorSistema(sistemaInfo.NombreSistema);
                            var rangoSys = ws1.Range(subFilaInicio, 7, subFilaFin, 7);
                            rangoSys.Style.Fill.BackgroundColor = colorSys;
                            rangoSys.Style.Font.SetFontColor(colorSys == XLColor.FromHtml("#4ADE80") || colorSys == XLColor.FromHtml("#38BDF8") ? XLColor.Black : XLColor.White);
                            rangoSys.Style.Font.Bold = true;
                        }

                        ws1.Range(subFilaInicio, 7, subFilaFin, 7).Style.Font.FontName = "Calibri";
                        ws1.Range(subFilaInicio, 7, subFilaFin, 7).Style.Font.FontSize = 9;
                        ws1.Range(subFilaInicio, 7, subFilaFin, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                        ws1.Range(subFilaInicio, 7, subFilaFin, 7).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        ws1.Range(subFilaInicio, 7, subFilaFin, 7).Style.Alignment.WrapText = true;

                        filaCursor += cantSeries;
                    }

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

                    int[] columnasACombinar = new[] { 1, 2, 3, 4, 5, 6, 9, 10, 11, 12 };
                    foreach (int col in columnasACombinar)
                    {
                        if (filasTotalesEmpresa > 1)
                        {
                            ws1.Range(filaInicioEmpresa, col, filaFinEmpresa, col).Merge();
                        }

                        var cell = ws1.Cell(filaInicioEmpresa, col);
                        cell.Style.Font.FontName = "Calibri";
                        cell.Style.Font.FontSize = 9;
                        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        cell.Style.Alignment.WrapText = true;

                        if (col == 10)
                            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                        else
                            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    }

                    // Formato estatus: Negrita y texto negro
                    var cellEstatus = ws1.Cell(filaInicioEmpresa, 12);
                    cellEstatus.Style.Font.Bold = true;
                    cellEstatus.Style.Font.SetFontColor(XLColor.Black);

                    if (item.TipoCliente?.ToUpper() == "VIP")
                    {
                        var rangoVip = ws1.Range(filaInicioEmpresa, 1, filaFinEmpresa, 1);
                        rangoVip.Style.Fill.BackgroundColor = XLColor.FromHtml("#E67E22");
                        rangoVip.Style.Font.SetFontColor(XLColor.White);
                        rangoVip.Style.Font.Bold = true;
                    }

                    // Cuadrícula negra explícita
                    for (int r = filaInicioEmpresa; r <= filaFinEmpresa; r++)
                    {
                        for (int c = 1; c <= 12; c++)
                        {
                            var cellBorder = ws1.Cell(r, c);
                            cellBorder.Style.Border.TopBorder = XLBorderStyleValues.Thin;
                            cellBorder.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
                            cellBorder.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
                            cellBorder.Style.Border.RightBorder = XLBorderStyleValues.Thin;
                            cellBorder.Style.Border.TopBorderColor = XLColor.Black;
                            cellBorder.Style.Border.BottomBorderColor = XLColor.Black;
                            cellBorder.Style.Border.LeftBorderColor = XLColor.Black;
                            cellBorder.Style.Border.RightBorderColor = XLColor.Black;
                        }
                    }

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

                // =========================================================
                // HOJA 2: TABLA DE AVANCES Y MÉTRICAS
                // =========================================================
                var ws2 = workbook.Worksheets.Add("Avances");
                ws2.ShowGridLines = true;

                string[] encabezadosMetricas = new[] {
                    "Total de clientes", "Encuestas finalizadas", "Seguimiento pendiente",
                    "Encuestas en Curso", "Porcentaje"
                };

                for (int i = 0; i < encabezadosMetricas.Length; i++)
                {
                    var cell = ws2.Cell(1, i + 1);
                    cell.Value = encabezadosMetricas[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.SetFontColor(XLColor.White);
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0284C7");
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.OutsideBorderColor = XLColor.Black;
                }

                ws2.Cell(2, 1).Value = Metricas.TotalClientes;
                ws2.Cell(2, 2).Value = Metricas.Finalizadas;
                ws2.Cell(2, 3).Value = Metricas.Pendientes;
                ws2.Cell(2, 4).Value = Metricas.EnCurso;
                ws2.Cell(2, 5).Value = $"{Metricas.PorcentajeAvance}%"; // Valor entero en la hoja de Avances

                for (int c = 1; c <= 5; c++)
                {
                    var cell = ws2.Cell(2, c);
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    cell.Style.Font.Bold = true;

                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.OutsideBorderColor = XLColor.Black;
                }

                ws2.Columns().AdjustToContents();

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    var content = stream.ToArray();
                    return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nombreArchivo);
                }
            }
        }

        private string ObtenerTextoCelda(IXLCell celda)
        {
            if (celda == null) return string.Empty;
            if (celda.IsMerged())
            {
                var mergedRange = celda.MergedRange();
                var valorCombinado = mergedRange.FirstCell().GetFormattedString();
                if (string.IsNullOrEmpty(valorCombinado))
                    valorCombinado = mergedRange.FirstCell().Value.ToString() ?? string.Empty;
                return valorCombinado.Replace("\r\n", "\n").Replace("\r", "\n").Trim();
            }

            string val = celda.GetFormattedString();
            if (string.IsNullOrEmpty(val)) val = celda.Value.ToString() ?? string.Empty;
            return val.Replace("\r\n", "\n").Replace("\r", "\n").Trim();
        }

        private string NormalizarSistemaOficial(string sistemaRaw)
        {
            if (string.IsNullOrWhiteSpace(sistemaRaw)) return string.Empty;
            string sysUpper = sistemaRaw.Trim().ToUpper();

            if (sysUpper.Contains("DIAENLINEA") || sysUpper.Contains("DIA EN LINEA")) return "DIAENLINEA PREMIUM";
            if (sysUpper.Contains("DIAWEB") || sysUpper.Contains("DIA WEB")) return "DIAWEB";
            if (sysUpper.Contains("SITA")) return "SITA";
            if (sysUpper.Contains("VUCEM")) return "VUCEM";
            if (sysUpper.Contains("ENLACE")) return "MÓDULO DE ENLACE";
            if (sysUpper.Contains("COA")) return "COA";
            if (sysUpper.Contains("DIA 8") || sysUpper == "DIA") return "DIA 8";

            return sistemaRaw.Trim();
        }

        private string DeducirSistemaPorSerie(string serie)
        {
            if (string.IsNullOrWhiteSpace(serie)) return string.Empty;
            string s = serie.Trim().ToUpper();

            if (s.StartsWith("DNL") || s.StartsWith("DNLP")) return "DIAENLINEA PREMIUM";
            if (s.StartsWith("COVE")) return "VUCEM";
            if (s.StartsWith("M3WIN")) return "SITA";
            if (s.StartsWith("DIAW")) return "DIAWEB";
            if (s.StartsWith("DIA")) return "DIA 8";
            if (s.StartsWith("COA")) return "COA";
            if (s.StartsWith("MED")) return "MÓDULO DE ENLACE";

            return string.Empty;
        }

        private string NormalizarEjecutivo(string nombreExcel, List<string> personalSoporte)
        {
            if (string.IsNullOrWhiteSpace(nombreExcel)) return string.Empty;

            string normalizadoExcel = nombreExcel.ToLower()
                .Replace("ing.", "").Replace("lic.", "").Replace("ing ", "").Replace("lic ", "").Trim();

            foreach (var nombreBD in personalSoporte)
            {
                string normalizadoBD = nombreBD.ToLower()
                    .Replace("ing.", "").Replace("lic.", "").Replace("ing ", "").Replace("lic ", "").Trim();

                if (normalizadoBD.Contains(normalizadoExcel) || normalizadoExcel.Contains(normalizadoBD))
                {
                    return nombreBD;
                }
            }

            return nombreExcel;
        }

        public async Task<IActionResult> OnPostCargarExcelAsync([FromForm] CargaCampanaInput input)
        {
            if (input.Archivo == null || input.Archivo.Length == 0)
                return new JsonResult(new { exito = false, mensaje = "Por favor selecciona un archivo." });

            var extension = Path.GetExtension(input.Archivo.FileName).ToLower();
            if (extension != ".xlsx" && extension != ".xls")
                return new JsonResult(new { exito = false, mensaje = "El archivo debe tener formato .xlsx o .xls." });

            var personalSoporte = await _context.Personal
                .Where(p => p.Area == "Soporte Técnico" || p.Area == "Soporte Tecnico")
                .Select(p => p.Nombre)
                .ToListAsync();

            var campanaExistente = await _context.CampanaRenovacion
                .FirstOrDefaultAsync(c => c.Mes == input.Mes && c.Anio == input.Anio);

            if (campanaExistente != null && !input.ConfirmarSobrescritura)
            {
                string nombreMes = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(input.Mes);
                return new JsonResult(new
                {
                    exito = false,
                    requiereConfirmacion = true,
                    mensaje = $"Ya existe una campaña de renovación de {nombreMes} {input.Anio}, ¿estás seguro de sobrescribir los datos?"
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
                        if (worksheet == null)
                            return new JsonResult(new { exito = false, mensaje = "El archivo Excel está vacío." });

                        var encabezadosEsperados = new[] {
                            "Tipo de Cliente", "No Cliente", "Empresa", "Nombre del Cliente",
                            "Correo Electrónico", "Teléfono", "Sistema(s)", "N. de serie",
                            "Ejecutivo Asignado", "Comentarios Adicionales", "Ticket", "Estatus"
                        };

                        for (int col = 1; col <= encabezadosEsperados.Length; col++)
                        {
                            var valorCelda = ObtenerTextoCelda(worksheet.Cell(2, col));
                            if (!valorCelda.Equals(encabezadosEsperados[col - 1], StringComparison.OrdinalIgnoreCase))
                            {
                                return new JsonResult(new
                                {
                                    exito = false,
                                    mensaje = $"El archivo no coincide con la estructura requerida. Se esperaba '{encabezadosEsperados[col - 1]}' en la columna {col}."
                                });
                            }
                        }

                        var ultimaFila = worksheet.LastRowUsed().RowNumber();
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
                                string sysSub = worksheet.Cell(filaActual, 7).GetFormattedString().Replace("\r\n", "\n").Replace("\r", "\n").Trim();
                                string serieSub = worksheet.Cell(filaActual, 8).GetFormattedString().Replace("\r\n", "\n").Replace("\r", "\n").Trim();

                                if (string.IsNullOrEmpty(sysSub)) sysSub = worksheet.Cell(filaActual, 7).Value.ToString().Trim();
                                if (string.IsNullOrEmpty(serieSub)) serieSub = worksheet.Cell(filaActual, 8).Value.ToString().Trim();

                                if (string.IsNullOrWhiteSpace(sysSub) && !string.IsNullOrWhiteSpace(serieSub))
                                {
                                    sysSub = DeducirSistemaPorSerie(serieSub);
                                }
                                else if (!string.IsNullOrWhiteSpace(sysSub))
                                {
                                    sysSub = NormalizarSistemaOficial(sysSub);
                                }

                                if (!string.IsNullOrWhiteSpace(sysSub))
                                {
                                    if (!mapaSistemasSeries.ContainsKey(sysSub))
                                    {
                                        mapaSistemasSeries[sysSub] = new List<string>();
                                    }

                                    if (!string.IsNullOrWhiteSpace(serieSub))
                                    {
                                        var subSeries = serieSub.Split(new[] { "\n", "\r\n", "," }, StringSplitOptions.RemoveEmptyEntries);
                                        foreach (var s in subSeries)
                                        {
                                            string serieLimpia = s.Trim();
                                            if (!mapaSistemasSeries[sysSub].Contains(serieLimpia))
                                            {
                                                mapaSistemasSeries[sysSub].Add(serieLimpia);
                                            }
                                        }
                                    }
                                }
                            }

                            string noClienteFormateado = noClienteRaw.Contains("-") ? noClienteRaw : $"{noClienteRaw}-0";
                            string empresaFormateada = empresaRaw.ToUpper();
                            string ejecutivoNormalizado = NormalizarEjecutivo(ejecutivoRaw, personalSoporte);

                            string[] contactosLineas = nombreClienteRaw.Split('\n');
                            for (int i = 0; i < contactosLineas.Length; i++)
                            {
                                contactosLineas[i] = CultureInfo.CurrentCulture.TextInfo.ToTitleCase(contactosLineas[i].ToLower());
                            }

                            var listaSistemasFinal = mapaSistemasSeries.Keys.ToList();
                            var listaSeriesFinal = mapaSistemasSeries.Select(kv => string.Join(", ", kv.Value)).ToList();

                            nuevosDetalles.Add(new CampanaRenovacionDetalle
                            {
                                TipoCliente = tipoCliente,
                                NoCliente = noClienteFormateado,
                                Empresa = empresaFormateada,
                                NombreCliente = string.Join("\n", contactosLineas),
                                CorreoElectronico = correo,
                                Telefono = telefono,
                                Sistemas = string.Join("\n", listaSistemasFinal),
                                NoSerie = string.Join("\n", listaSeriesFinal),
                                EjecutivoAsignado = ejecutivoNormalizado,
                                ComentariosAdicionales = comentarios,
                                Ticket = ticket,
                                Estatus = string.IsNullOrEmpty(estatusRaw) ? "Pendiente" : estatusRaw
                            });

                            r += numFilasBloque;
                        }
                    }
                }

                if (campanaExistente != null && input.ConfirmarSobrescritura)
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

                return new JsonResult(new { exito = true, mensaje = "Cargado con éxito." });
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

            registro.TipoCliente = model.TipoCliente;
            registro.NoCliente = model.NoCliente.Contains("-") ? model.NoCliente : $"{model.NoCliente}-0";
            registro.Empresa = model.Empresa.ToUpper();

            string[] contactosLineas = (model.NombreCliente ?? "").Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            for (int i = 0; i < contactosLineas.Length; i++)
            {
                contactosLineas[i] = CultureInfo.CurrentCulture.TextInfo.ToTitleCase(contactosLineas[i].ToLower());
            }
            registro.NombreCliente = string.Join("\n", contactosLineas);

            registro.CorreoElectronico = model.CorreoElectronico;
            registro.Telefono = model.Telefono;
            registro.Sistemas = model.Sistemas;
            registro.NoSerie = model.NoSerie;
            registro.EjecutivoAsignado = model.EjecutivoAsignado;
            registro.Ticket = model.Ticket;
            registro.Estatus = model.Estatus;

            await _context.SaveChangesAsync();
            return new JsonResult(new { exito = true, mensaje = "Registro actualizado correctamente." });
        }

        public async Task<IActionResult> OnPostGuardarComentarioAsync(int id, string nuevoSeguimiento, string nuevoEstatus, string nuevoTicket)
        {
            var detalle = await _context.CampanaRenovacionDetalle.FindAsync(id);
            if (detalle == null) return new JsonResult(new { exito = false, mensaje = "Registro no encontrado." });

            string fechaHoy = DateTime.Now.ToString("dd/MM/yyyy");

            if (!string.IsNullOrWhiteSpace(nuevoEstatus))
            {
                detalle.Estatus = nuevoEstatus;
            }

            detalle.Ticket = nuevoTicket?.Trim();

            string lineaAtendida = "";
            if (nuevoEstatus?.Trim().Equals("Cerrado", StringComparison.OrdinalIgnoreCase) == true)
            {
                lineaAtendida = "Encuesta atendida\n";
            }

            if (string.IsNullOrWhiteSpace(detalle.ComentariosAdicionales))
            {
                detalle.ComentariosAdicionales = $"{lineaAtendida}{fechaHoy} {nuevoSeguimiento}";
            }
            else
            {
                string historialActual = detalle.ComentariosAdicionales;

                if (historialActual.Contains(fechaHoy))
                {
                    detalle.ComentariosAdicionales += $"\n{nuevoSeguimiento}";
                }
                else
                {
                    detalle.ComentariosAdicionales += $"\n\n{lineaAtendida}{fechaHoy} {nuevoSeguimiento}";
                }
            }

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