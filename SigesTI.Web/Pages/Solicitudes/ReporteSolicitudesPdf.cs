using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SigesTI.Web.Models;
using SigesTI.Web.Pages.Shared;

namespace SigesTI.Web.Pages.Solicitudes
{
    /*
     * PDF del reporte de solicitudes. Mismo diseño que la vista previa (ReporteSolicitudes.cshtml)
     * y que el PDF de Bitácora (Cuenta/ReporteBitacoraPdf.cs).
     */
    public static class ReporteSolicitudesPdf
    {
        // Colores del reporte (los mismos de reporte-solicitudes.css)
        private const string AzulOscuro = "#0F2A52";
        private const string Azul = "#2563EB";
        private const string Texto = "#0F172A";
        private const string TextoSuave = "#475569";
        private const string TextoTenue = "#94A3B8";
        private const string Linea = "#E2E8F0";
        private const string FondoSuave = "#F8FAFC";
        private const string Verde = "#15803D";
        private const string Ambar = "#B45309";
        private const string Morado = "#7E22CE";

        private static readonly CultureInfo Cultura = new("es-MX");

        // Devuelve el archivo PDF listo para descargar
        public static byte[] Generar(IList<Solicitud> solicitudes, string filtros, DateTime fechaGeneracion)
        {
            return Document.Create(documento =>
            {
                documento.Page(pagina =>
                {
                    // Mismos márgenes que al imprimir la vista previa (@page en el CSS)
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginTop(12, Unit.Millimetre);
                    pagina.MarginHorizontal(12, Unit.Millimetre);
                    pagina.MarginBottom(10, Unit.Millimetre);

                    pagina.DefaultTextStyle(estilo => estilo
                        .FontFamily("Segoe UI")
                        .FontSize(9)
                        .LineHeight(1.4f)
                        .FontColor(Texto));

                    pagina.Content().Column(columna =>
                    {
                        columna.Item().Element(c => EncabezadoPdf.Encabezado(c, "Reporte de Solicitudes", fechaGeneracion));
                        columna.Item().PaddingTop(16).Text(filtros).FontSize(8).FontColor(TextoSuave);
                        columna.Item().PaddingTop(14).Element(c => Resumen(c, solicitudes));
                        columna.Item().PaddingTop(16).Element(c => Tabla(c, solicitudes));
                    });

                    pagina.Footer().Element(EncabezadoPdf.Pie);
                });
            }).GeneratePdf();
        }

        /* ------------------------------------------------------------------
           RESUMEN: un recuadro por estatus
           ------------------------------------------------------------------ */
        private static void Resumen(IContainer contenedor, IList<Solicitud> solicitudes)
        {
            contenedor.Row(fila =>
            {
                fila.Spacing(7.5f);

                RecuadroResumen(fila, solicitudes.Count, "SOLICITUDES", AzulOscuro);
                RecuadroResumen(fila, solicitudes.Count(s => s.Estatus == EstatusSolicitud.PorAutorizar), "POR AUTORIZAR", Morado);
                RecuadroResumen(fila, solicitudes.Count(s => s.Estatus == EstatusSolicitud.Pendiente), "PENDIENTES", Ambar);
                RecuadroResumen(fila, solicitudes.Count(s => s.Estatus == EstatusSolicitud.Resuelto), "RESUELTAS", Verde);
            });
        }

        private static void RecuadroResumen(RowDescriptor fila, int valor, string titulo, string color)
        {
            fila.RelativeItem()
                .Border(0.75f).BorderColor(Linea)
                .CornerRadius(4.5f)
                .Background(FondoSuave)
                .Column(recuadro =>
                {
                    // Franja de color arriba
                    recuadro.Item().Height(2.25f).Background(color);

                    recuadro.Item().PaddingVertical(7.5f).PaddingHorizontal(9).Column(datos =>
                    {
                        datos.Item().Text(valor.ToString()).FontSize(16.5f).ExtraBold().LineHeight(1.1f).FontColor(color);
                        datos.Item().Text(titulo).FontSize(7.5f).Bold().LetterSpacing(0.06f).FontColor(TextoSuave);
                    });
                });
        }

        /* ------------------------------------------------------------------
           TABLA: solicitudes agrupadas por día de ingreso
           ------------------------------------------------------------------ */
        private static void Tabla(IContainer contenedor, IList<Solicitud> solicitudes)
        {
            if (!solicitudes.Any())
            {
                contenedor.Border(0.75f).BorderColor(Linea).CornerRadius(6).Background(FondoSuave)
                    .Padding(27).AlignCenter()
                    .Text("No hay solicitudes que coincidan con el periodo y los filtros seleccionados.")
                    .FontColor(TextoSuave);
                return;
            }

            contenedor.Table(tabla =>
            {
                tabla.ColumnsDefinition(Columnas);

                // Encabezado azul con las esquinas de arriba redondeadas; se repite en cada hoja
                tabla.Header(encabezado =>
                {
                    string[] titulos = { "FOLIO", "SOLICITANTE", "ÁREA", "EJECUTIVO ASIGNADO", "INGRESO Y REALIZACIÓN", "ESTATUS" };

                    for (int i = 0; i < titulos.Length; i++)
                    {
                        IContainer celda = encabezado.Cell();

                        if (i == 0) celda = celda.CornerRadiusTopLeft(4.5f);
                        if (i == titulos.Length - 1) celda = celda.CornerRadiusTopRight(4.5f);

                        celda.Background(AzulOscuro)
                            .PaddingVertical(6).PaddingHorizontal(7.5f)
                            .AlignCenter()
                            .Text(titulos[i]).FontSize(7.5f).Bold().LetterSpacing(0.06f).FontColor(Colors.White);
                    }
                });

                foreach (var dia in solicitudes.GroupBy(s => s.FechaIngreso.Date))
                {
                    var solicitudesDia = dia.ToList();

                    // El título del día y su primera fila van juntos, así el título nunca queda solo al final de una hoja
                    tabla.Cell().ColumnSpan(6).ShowEntire().Column(bloque =>
                    {
                        bloque.Item().Element(c => TituloDia(c, dia.Key, solicitudesDia.Count));

                        bloque.Item().Table(primeraFila =>
                        {
                            primeraFila.ColumnsDefinition(Columnas);
                            FilaSolicitud(primeraFila, solicitudesDia[0], FondoSuave);
                        });
                    });

                    // El resto de las filas del día (intercaladas: blanca y gris claro)
                    for (int i = 1; i < solicitudesDia.Count; i++)
                    {
                        string fondo = i % 2 == 0 ? FondoSuave : Colors.White;
                        FilaSolicitud(tabla, solicitudesDia[i], fondo);
                    }
                }
            });
        }

        // Ancho de las columnas de la tabla
        private static void Columnas(TableColumnsDefinitionDescriptor columnas)
        {
            columnas.ConstantColumn(42);   // Folio
            columnas.RelativeColumn(2.6f); // Solicitante (el correo cabe en una línea)
            columnas.ConstantColumn(60);   // Área
            columnas.RelativeColumn(1.3f); // Ejecutivo
            columnas.ConstantColumn(114);  // Ingreso y realización (cada fecha en su renglón)
            columnas.ConstantColumn(140);  // Estatus ("Pendiente por autorizar" cabe en una línea)
        }

        // Título de cada día con línea azul abajo: "Lunes, 26 de octubre de 2026   3 solicitudes"
        private static void TituloDia(IContainer contenedor, DateTime fecha, int cantidad)
        {
            contenedor
                .PaddingTop(10.5f)
                .BorderBottom(1.5f).BorderColor(Azul)
                .PaddingBottom(4.5f).PaddingHorizontal(7.5f)
                .Text(texto =>
                {
                    texto.Span(ReporteSolicitudesModel.TituloDia(fecha)).ExtraBold().FontColor(AzulOscuro);
                    texto.Span($"   {cantidad} {(cantidad == 1 ? "solicitud" : "solicitudes")}")
                        .FontSize(7.5f).SemiBold().FontColor(TextoTenue);
                });
        }

        // Una fila de la tabla
        private static void FilaSolicitud(TableDescriptor tabla, Solicitud item, string fondo)
        {
            bool tieneEntrega = item.Estatus == EstatusSolicitud.Resuelto
                                && item.FechaEntrega.HasValue
                                && item.FechaEntrega.Value.Year > 1901;

            Celda(tabla.Cell(), fondo).AlignCenter()
                .Text(item.IdSolicitud.ToString("D4")).Bold().FontColor(Azul);

            Celda(tabla.Cell(), fondo).Column(persona =>
            {
                persona.Item().Text(item.Personal?.Nombre ?? "N/A").Bold();
                persona.Item().Text(item.CorreoSolicitante ?? "—").FontSize(7.5f).FontColor(TextoTenue);
            });

            Celda(tabla.Cell(), fondo).AlignCenter()
                .Text(item.Personal?.Area ?? "N/A");

            Celda(tabla.Cell(), fondo)
                .Text(string.IsNullOrEmpty(item.EjecutivoAsignado) ? "Sin asignar" : item.EjecutivoAsignado)
                .FontColor(string.IsNullOrEmpty(item.EjecutivoAsignado) ? TextoTenue : Texto);

            Celda(tabla.Cell(), fondo).Column(fechas =>
            {
                FechaConEtiqueta(fechas, "INGRESO", item.FechaIngreso.ToString("dd/MM/yyyy"), TextoSuave);
                FechaConEtiqueta(fechas, "REALIZACIÓN",
                    tieneEntrega ? item.FechaEntrega!.Value.ToString("dd/MM/yyyy") : "En proceso",
                    tieneEntrega ? TextoSuave : TextoTenue);
            });

            Celda(tabla.Cell(), fondo).AlignCenter()
                .Element(c => EstatusConPunto(c, item.Estatus));
        }

        // Un renglón de la columna de fechas: "INGRESO  26/10/2026"
        private static void FechaConEtiqueta(ColumnDescriptor fechas, string etiqueta, string valor, string color)
        {
            fechas.Item().Row(fila =>
            {
                fila.ConstantItem(50).AlignMiddle()
                    .Text(etiqueta).FontSize(6.5f).Bold().LetterSpacing(0.04f).FontColor(TextoTenue);

                fila.RelativeItem().Text(valor).FontColor(color);
            });
        }

        // Estilo común de las celdas (ShowEntire evita que una fila se parta entre dos hojas)
        private static IContainer Celda(IContainer celda, string fondo)
        {
            return celda
                .ShowEntire()
                .Background(fondo)
                .BorderBottom(0.75f).BorderColor(Linea)
                .PaddingVertical(5.25f).PaddingHorizontal(7.5f);
        }

        // Estatus en color con un punto redondo a la izquierda: "● Pendiente"
        private static void EstatusConPunto(IContainer contenedor, string estatus)
        {
            string color = estatus switch
            {
                EstatusSolicitud.PorAutorizar => Morado,
                EstatusSolicitud.Resuelto => Verde,
                _ => Ambar
            };

            contenedor.Row(fila =>
            {
                fila.AutoItem().PaddingTop(4).PaddingRight(4.5f)
                    .Width(5.25f).Height(5.25f).CornerRadius(2.6f).Background(color);

                fila.AutoItem().Text(EstatusSolicitud.Texto(estatus)).FontSize(8).Bold().FontColor(color);
            });
        }
    }
}
