using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SigesTI.Web.Models;
using SigesTI.Web.Pages.Shared;

namespace SigesTI.Web.Pages.Cuenta
{

    public static class ReporteBitacoraPdf
    {
        // Colores del reporte 
        private const string AzulOscuro = "#0F2A52";
        private const string Azul = "#2563EB";
        private const string Texto = "#0F172A";
        private const string TextoSuave = "#475569";
        private const string TextoTenue = "#94A3B8";
        private const string Linea = "#E2E8F0";
        private const string FondoSuave = "#F8FAFC";
        private const string Verde = "#15803D";
        private const string Ambar = "#B45309";
        private const string Rojo = "#B91C1C";
        private const string Celeste = "#0369A1";

        private static readonly CultureInfo Cultura = new("es-MX");

        // Devuelve el archivo PDF listo para descargar
        public static byte[] Generar(IList<BitacoraUsuario> registros, DateTime fechaGeneracion)
        {
            return Crear(registros, fechaGeneracion).GeneratePdf();
        }

        // Arma el documento: tamaño carta, contenido y pie de página
        public static IDocument Crear(IList<BitacoraUsuario> registros, DateTime fechaGeneracion)
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
                        columna.Item().Element(c => EncabezadoPdf.Encabezado(c, "Bitácora de Actividades", fechaGeneracion));
                        columna.Item().PaddingTop(22).Element(c => Resumen(c, registros));
                        columna.Item().PaddingTop(16).Element(c => Tabla(c, registros));
                    });

                    pagina.Footer().Element(EncabezadoPdf.Pie);
                });
            });
        }

        /* ------------------------------------------------------------------
           RESUMEN: un recuadro por tipo de acción
           ------------------------------------------------------------------ */
        private static void Resumen(IContainer contenedor, IList<BitacoraUsuario> registros)
        {
            int creaciones = registros.Count(r => ReporteBitacoraModel.ObtenerClaseAccion(r.Accion) == "creacion");
            int ediciones = registros.Count(r => ReporteBitacoraModel.ObtenerClaseAccion(r.Accion) == "edicion");
            int eliminaciones = registros.Count(r => ReporteBitacoraModel.ObtenerClaseAccion(r.Accion) == "eliminacion");
            int otros = registros.Count - creaciones - ediciones - eliminaciones;

            contenedor.Row(fila =>
            {
                fila.Spacing(7.5f);

                RecuadroResumen(fila, registros.Count, "REGISTROS", AzulOscuro);
                RecuadroResumen(fila, creaciones, "CREACIONES", Verde);
                RecuadroResumen(fila, ediciones, "EDICIONES", Ambar);
                RecuadroResumen(fila, eliminaciones, "ELIMINACIONES", Rojo);

                if (otros > 0)
                {
                    RecuadroResumen(fila, otros, "OTROS", Celeste);
                }
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
           TABLA: registros agrupados por día
           ------------------------------------------------------------------ */
        private static void Tabla(IContainer contenedor, IList<BitacoraUsuario> registros)
        {
            if (!registros.Any())
            {
                contenedor.Border(0.75f).BorderColor(Linea).CornerRadius(6).Background(FondoSuave)
                    .Padding(27).AlignCenter()
                    .Text("No hay movimientos que coincidan con el periodo y los filtros seleccionados.")
                    .FontColor(TextoSuave);
                return;
            }

            contenedor.Table(tabla =>
            {
                tabla.ColumnsDefinition(Columnas);

                // Encabezado azul con las esquinas de arriba redondeadas; se repite en cada hoja
                tabla.Header(encabezado =>
                {
                    string[] titulos = { "HORA", "REALIZADO POR", "MÓDULO", "ACCIÓN", "DESCRIPCIÓN" };

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

                foreach (var dia in registros.GroupBy(r => r.FechaHora.Date))
                {
                    var registrosDia = dia.ToList();

                    // El título del día y su primera fila van juntos en un solo bloque,
                    // así el título nunca queda solo al final de una hoja
                    tabla.Cell().ColumnSpan(5).ShowEntire().Column(bloque =>
                    {
                        bloque.Item().Element(c => TituloDia(c, dia.Key, registrosDia.Count));

                        bloque.Item().Table(primeraFila =>
                        {
                            primeraFila.ColumnsDefinition(Columnas);
                            FilaRegistro(primeraFila, registrosDia[0], FondoSuave);
                        });
                    });

                    // El resto de las filas del día (intercaladas: blanca y gris claro)
                    for (int i = 1; i < registrosDia.Count; i++)
                    {
                        string fondo = i % 2 == 0 ? FondoSuave : Colors.White;
                        FilaRegistro(tabla, registrosDia[i], fondo);
                    }
                }
            });
        }

        // Ancho de las columnas de la tabla
        private static void Columnas(TableColumnsDefinitionDescriptor columnas)
        {
            columnas.ConstantColumn(66);   // Hora
            columnas.RelativeColumn(2);    // Realizado por
            columnas.ConstantColumn(52);   // Módulo
            columnas.ConstantColumn(124);  // Acción
            columnas.RelativeColumn(3);    // Descripción
        }

        // Título de cada día con línea azul abajo: "Lunes, 26 de octubre de 2026   3 movimientos"
        private static void TituloDia(IContainer contenedor, DateTime fecha, int cantidad)
        {
            contenedor
                .PaddingTop(10.5f)
                .BorderBottom(1.5f).BorderColor(Azul)
                .PaddingBottom(4.5f).PaddingHorizontal(7.5f)
                .Text(texto =>
                {
                    texto.Span(ReporteBitacoraModel.TituloDia(fecha)).ExtraBold().FontColor(AzulOscuro);
                    texto.Span($"   {cantidad} {(cantidad == 1 ? "movimiento" : "movimientos")}")
                        .FontSize(7.5f).SemiBold().FontColor(TextoTenue);
                });
        }

        // Una fila de la tabla: hora, usuario, módulo, acción y descripción
        private static void FilaRegistro(TableDescriptor tabla, BitacoraUsuario item, string fondo)
        {
            Celda(tabla.Cell(), fondo).AlignCenter()
                .Text(item.FechaHora.ToString("hh:mm tt", Cultura)).FontColor(TextoSuave);

            Celda(tabla.Cell(), fondo).Column(usuario =>
            {
                usuario.Item().Text(item.NombreCompleto ?? "Usuario eliminado").Bold();
                usuario.Item().Text(item.Correo ?? "—").FontSize(7.5f).FontColor(TextoTenue);
            });

            Celda(tabla.Cell(), fondo).AlignCenter()
                .Text(item.Modulo);

            Celda(tabla.Cell(), fondo).AlignCenter()
                .Element(c => AccionConPunto(c, item.Accion));

            Celda(tabla.Cell(), fondo)
                .Text(item.Descripcion);
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

        // Acción en color con un punto redondo a la izquierda: "● Edición"
        private static void AccionConPunto(IContainer contenedor, string accion)
        {
            string color = ReporteBitacoraModel.ObtenerClaseAccion(accion) switch
            {
                "creacion" => Verde,
                "edicion" => Ambar,
                "eliminacion" => Rojo,
                _ => Celeste
            };

            contenedor.Row(fila =>
            {
                fila.AutoItem().PaddingTop(4).PaddingRight(4.5f)
                    .Width(5.25f).Height(5.25f).CornerRadius(2.6f).Background(color);

                fila.AutoItem().Text(accion).Bold().FontColor(color);
            });
        }
    }
}
