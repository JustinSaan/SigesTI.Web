using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SigesTI.Web.Pages.Shared;

namespace SigesTI.Web.Pages.Actividades
{
    /*
     * PDF de Indicadores y Métricas.
     * Las gráficas se dibujan en SVG (GraficasSvg.cs), así quedan vectoriales en el PDF
     * y se ven nítidas con cualquier zoom, igual que una gráfica de Excel exportada.
     * Todo va centrado: títulos y gráficas.
     */
    public static class IndicadoresPdf
    {
        private const string Texto = "#0F172A";
        private const string TextoSuave = "#475569";
        private const string TextoTenue = "#94A3B8";
        private const string Linea = "#E2E8F0";

        // Recuadros en azul claro para que se distingan sin usar colores oscuros
        private const string BordeRecuadro = "#BFDBFE";
        private const string FondoTitulo = "#EFF6FF";
        private const string ColorTitulo = "#1E40AF";

        private const string Azul = "#0284C7";
        private const string Verde = "#15803D";
        private const string Morado = "#6D28D9";
        private const string Ambar = "#B45309";

        // Mismos colores que Reporte de Tickets para en tiempo, retrasados y en curso
        private const string ColorEnTiempo = "#10B981";
        private const string ColorRetrasado = "#6366F1";
        private const string ColorEnCurso = "#F59E0B";

        // Hoja 1: tarjetas y dos gráficas grandes; hoja 2: cuatro gráficas
        private const float AltoGraficaHoja1 = 270;
        private const float AltoGraficaHoja2 = 190;

        private static readonly CultureInfo Invariante = CultureInfo.InvariantCulture;

        // Devuelve el archivo PDF listo para descargar
        public static byte[] Generar(IndicadoresModel modelo, DateTime fechaGeneracion)
        {
            return Crear(modelo, fechaGeneracion).GeneratePdf();
        }

        // Arma el documento: carta horizontal, contenido y pie de página
        public static IDocument Crear(IndicadoresModel modelo, DateTime fechaGeneracion)
        {
            var ind = modelo.Indicadores;

            return Document.Create(documento =>
            {
                documento.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter.Landscape());
                    pagina.MarginTop(12, Unit.Millimetre);
                    pagina.MarginHorizontal(12, Unit.Millimetre);
                    pagina.MarginBottom(10, Unit.Millimetre);

                    pagina.DefaultTextStyle(estilo => estilo.FontFamily("Segoe UI").FontSize(9).FontColor(Texto));

                    pagina.Content().Column(columna =>
                    {
                        columna.Item().Element(c => EncabezadoPdf.Encabezado(c, "Indicadores y Métricas del Área de Soporte Técnico", fechaGeneracion));

                        columna.Item().PaddingTop(12).AlignCenter().Text(texto =>
                        {
                            texto.Span("Período de evaluación: ").Bold();
                            texto.Span(modelo.Periodo).FontColor(TextoSuave);

                            if (!string.IsNullOrWhiteSpace(modelo.FiltroOrigen))
                            {
                                texto.Span("   ·   Origen: ").Bold();
                                texto.Span(modelo.FiltroOrigen).FontColor(TextoSuave);
                            }
                        });

                        // Hoja 1: tarjetas y las dos primeras gráficas
                        columna.Item().PaddingTop(10).Element(c => Tarjetas(c, ind));

                        columna.Item().PaddingTop(12).Row(fila =>
                        {
                            fila.Spacing(12);
                            fila.RelativeItem().Element(c => Panel(c, "Tickets por sistema", ind.TotalTickets, AltoGraficaHoja1,
                                g => Grafica(g, ind.TotalTickets, (an, al) => GraficasSvg.Dona(an, al, modelo.PartesSistemas), "Sin tickets en el período")));
                            fila.RelativeItem().Element(c => Panel(c, "Tipo de requerimiento", ind.TicketsPorTipo.Count, AltoGraficaHoja1,
                                g => Grafica(g, ind.TotalTickets, (an, al) => GraficasSvg.Barras(an, al, modelo.PartesTipos), "Sin tickets en el período")));
                        });

                        // Hoja 2: las otras cuatro gráficas y las observaciones
                        columna.Item().PageBreak();

                        columna.Item().Row(fila =>
                        {
                            fila.Spacing(12);
                            fila.RelativeItem().Element(c => Panel(c, "Medio de entrada", ind.TotalLlamadas + ind.TotalCorreos, AltoGraficaHoja2,
                                g => Grafica(g, ind.TotalLlamadas + ind.TotalCorreos, (an, al) => GraficasSvg.Columnas(an, al, ind.FechasEntrada, modelo.SeriesOrigen, ind.AgrupacionEntrada), "Sin llamadas ni correos en el período")));
                            fila.RelativeItem().Element(c => Panel(c, "Escalados por área destino", ind.TotalEscalados, AltoGraficaHoja2,
                                g => Grafica(g, ind.TotalEscalados, (an, al) => GraficasSvg.Radar(an, al, modelo.PartesEscalados, IndicadoresModel.ColorEscalados), "No hubo tickets escalados")));
                        });

                        int servicios = ind.ServiciosInternos + ind.TotalTickets;
                        columna.Item().PaddingTop(12).Row(fila =>
                        {
                            fila.Spacing(12);
                            fila.RelativeItem().Element(c => Panel(c, "Clientes más frecuentes", ind.ClientesFrecuentes.Count, AltoGraficaHoja2,
                                g => Grafica(g, ind.ClientesFrecuentes.Count, (an, al) => GraficasSvg.Paletas(an, al, modelo.PartesClientes, ind.TotalTickets), "Sin tickets en el período")));
                            fila.RelativeItem().Element(c => Panel(c, "Servicios internos y externos", servicios, AltoGraficaHoja2,
                                g => Grafica(g, servicios, (an, al) => GraficasSvg.Comparativo(an, al, modelo.ParteInternos, modelo.DetalleInternos, modelo.ParteExternos, modelo.DetalleExternos), "Sin servicios en el período")));
                        });

                        if (!string.IsNullOrWhiteSpace(modelo.Observaciones))
                        {
                            columna.Item().PaddingTop(12).Element(c => Observaciones(c, modelo.Observaciones));
                        }
                    });

                    pagina.Footer().Element(EncabezadoPdf.Pie);
                });
            });
        }

        /* ------------------------------------------------------------------
           TARJETAS DE INDICADORES
           ------------------------------------------------------------------ */
        private static void Tarjetas(IContainer contenedor, IndicadoresViewModel ind)
        {
            contenedor.Row(fila =>
            {
                fila.Spacing(9);

                Tarjeta(fila, "TICKETS ATENDIDOS", ind.TotalTickets.ToString(), Azul, datos =>
                    datos.Item().AlignCenter().Text($"Llamada {ind.TotalLlamadas}  ·  Correo {ind.TotalCorreos}  ·  Interno {ind.TotalInternos}")
                        .FontSize(7.5f).FontColor(TextoSuave));

                Tarjeta(fila, "EFICIENCIA DE RESOLUCIÓN", Numero(ind.PorcentajeEficiencia) + "%", Verde, datos =>
                {
                    // Barra partida: en tiempo, retrasados y en curso
                    datos.Item().Height(4).Row(barra =>
                    {
                        Parte(barra, ind.CerradosEnTiempo, ColorEnTiempo);
                        Parte(barra, ind.CerradosRetrasados, ColorRetrasado);
                        Parte(barra, ind.TotalEnCurso, ColorEnCurso);
                        if (ind.TotalTickets == 0) barra.RelativeItem().Background(Linea);
                    });

                    datos.Item().PaddingTop(4).AlignCenter().Text(texto =>
                    {
                        texto.DefaultTextStyle(e => e.FontSize(7.5f).FontColor(TextoSuave));
                        texto.Span("● ").FontColor(ColorEnTiempo);
                        texto.Span($"{ind.CerradosEnTiempo} en tiempo   ");
                        texto.Span("● ").FontColor(ColorRetrasado);
                        texto.Span($"{ind.CerradosRetrasados} retrasados   ");
                        texto.Span("● ").FontColor(ColorEnCurso);
                        texto.Span($"{ind.TotalEnCurso} en curso");
                    });
                });

                Tarjeta(fila, "TICKETS ESCALADOS", ind.TotalEscalados.ToString(), Morado, datos =>
                {
                    string areas = ind.EscaladosPorArea.Any()
                        ? string.Join("  ·  ", ind.EscaladosPorArea.Select(a => $"{a.Key} {a.Value}"))
                        : "Ningún ticket escalado";

                    datos.Item().AlignCenter().Text($"{Numero(ind.PorcentajeEscalados)}% del total de tickets").FontSize(7.5f).FontColor(TextoSuave);
                    datos.Item().PaddingTop(2).AlignCenter().Text(areas).FontSize(7.5f).SemiBold().FontColor(Morado);
                });

                Tarjeta(fila, "AVANCE DE TAREAS PROGRAMADAS", Numero(ind.PorcentajeAvancePrograma) + "%", Ambar, datos =>
                {
                    float avance = (float)Math.Clamp(ind.PorcentajeAvancePrograma, 0, 100);
                    datos.Item().Height(4).Row(barra =>
                    {
                        if (avance > 0) barra.RelativeItem(avance).Background(Ambar);
                        if (avance < 100) barra.RelativeItem(100 - avance).Background(Linea);
                    });
                    datos.Item().PaddingTop(4).AlignCenter().Text($"{ind.TareasResueltas} de {ind.TotalTareas} resueltas").FontSize(7.5f).FontColor(TextoSuave);
                });
            });
        }

        private static void Parte(RowDescriptor barra, int cantidad, string color)
        {
            if (cantidad > 0) barra.RelativeItem(cantidad).Background(color);
        }

        private static void Tarjeta(RowDescriptor fila, string titulo, string valor, string color, Action<ColumnDescriptor> detalle)
        {
            fila.RelativeItem()
                .Border(0.75f).BorderColor(BordeRecuadro)
                .CornerRadius(4.5f)
                .Column(tarjeta =>
                {
                    // Franja de color arriba
                    tarjeta.Item().Height(2.25f).Background(color);

                    tarjeta.Item().PaddingVertical(8).PaddingHorizontal(10).Column(datos =>
                    {
                        datos.Item().AlignCenter().Text(titulo).FontSize(7).Bold().LetterSpacing(0.06f).FontColor(TextoSuave);
                        datos.Item().PaddingTop(2).PaddingBottom(4).AlignCenter().Text(valor).FontSize(20).ExtraBold().FontColor(Texto);
                        detalle(datos);
                    });
                });
        }

        /* ------------------------------------------------------------------
           PANEL CON TÍTULO CENTRADO Y GRÁFICA
           ------------------------------------------------------------------ */
        private static void Panel(IContainer contenedor, string titulo, int contador, float alto, Action<IContainer> grafica)
        {
            contenedor
                .Border(1).BorderColor(BordeRecuadro)
                .CornerRadius(5)
                .Column(panel =>
                {
                    panel.Item().Background(FondoTitulo).BorderBottom(1).BorderColor(BordeRecuadro)
                        .PaddingVertical(6).PaddingHorizontal(10)
                        .AlignCenter()
                        .Text(texto =>
                        {
                            texto.Span(titulo).FontSize(9.5f).Bold().FontColor(ColorTitulo);
                            texto.Span($"   {contador}").FontSize(8.5f).Bold().FontColor(Azul);
                        });

                    panel.Item().Height(alto).Padding(10).Element(grafica);
                });
        }

        // Dibuja la gráfica SVG del tamaño del recuadro; sin datos, un aviso centrado
        private static void Grafica(IContainer contenedor, int total, Func<float, float, string> dibujar, string sinDatos)
        {
            if (total == 0)
            {
                contenedor.AlignCenter().AlignMiddle().Text(sinDatos).FontColor(TextoTenue);
                return;
            }

            contenedor.Svg(tamano => dibujar(tamano.Width, tamano.Height));
        }

        /* ------------------------------------------------------------------
           OBSERVACIONES
           ------------------------------------------------------------------ */
        private static void Observaciones(IContainer contenedor, string observaciones)
        {
            contenedor.ShowEntire().Border(1).BorderColor(BordeRecuadro).CornerRadius(5).Column(columna =>
            {
                columna.Item().Background(FondoTitulo).BorderBottom(1).BorderColor(BordeRecuadro)
                    .PaddingVertical(6).AlignCenter()
                    .Text("Observaciones").FontSize(9.5f).Bold().FontColor(ColorTitulo);

                columna.Item().Padding(9).AlignCenter().Text(observaciones.Trim()).AlignCenter().LineHeight(1.4f);
            });
        }

        private static string Numero(double valor) => valor.ToString("0.#", Invariante);
    }
}
