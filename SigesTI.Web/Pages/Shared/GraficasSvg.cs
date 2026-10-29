using System.Globalization;
using System.Security;
using System.Text;

namespace SigesTI.Web.Pages.Shared
{
    // Una parte de una gráfica: nombre, cantidad y color (el texto encima se elige solo si no se da)
    public record ParteGrafica(string Nombre, int Valor, string Color, string? ColorTexto = null);

    // Una serie de las gráficas de columnas y de barras apiladas: un valor por cada categoría
    public record SerieGrafica(string Nombre, string Color, string ColorTexto, IList<int> Valores);

    /*
     * Gráficas dibujadas en SVG para la pantalla y los reportes.
     * Al ser vectoriales se ven nítidas con cualquier zoom: en pantalla, al imprimir
     * o guardar en PDF desde el navegador y en los PDF de QuestPDF.
     *
     * Los textos y líneas que van sobre el fondo de la página llevan una clase
     * (g-texto, g-suave, g-linea, g-separador). Sus colores escritos aquí son los
     * de la hoja blanca (impresión y PDF); en pantalla la hoja de estilos de cada
     * página los cambia según el aspecto oscuro o claro (ver indicadores.css).
     * Al pasar el mouse cada parte muestra su detalle (etiqueta <title>).
     */
    public static class GraficasSvg
    {
        private const string Fuente = "Segoe UI";
        private const string Texto = "#0F172A";
        private const string TextoSuave = "#475569";
        private const string Linea = "#E2E8F0";

        private static readonly CultureInfo Invariante = CultureInfo.InvariantCulture;

        /* ------------------------------------------------------------------
           DONA
           Dona con el porcentaje en cada parte y la leyenda a la derecha.
           Normalmente las dos juntas quedan centradas en el espacio; con
           donaAlCentro la dona queda justo en medio, bajo el título
           (como en pantalla en Reporte de Tickets), y la leyenda a su lado.
           ------------------------------------------------------------------ */
        public static string Dona(float ancho, float alto, IList<ParteGrafica> partes, bool totalAlCentro = false, bool conCantidad = false, bool donaAlCentro = false)
        {
            int total = partes.Sum(p => p.Valor);
            var svg = Inicio(ancho, alto);
            if (total == 0) return svg.Append("</svg>").ToString();

            float tamanoLeyenda = 8.5f;
            float altoLinea = 15;
            float anchoLeyenda = partes.Max(p => AnchoTexto($"{p.Nombre}  ({p.Valor})", tamanoLeyenda)) + 13;
            float separacion = 22;

            float radio, cx;
            if (donaAlCentro)
            {
                radio = Math.Min(alto / 2 - 2, ancho / 2 - separacion - anchoLeyenda - 4);
                cx = ancho / 2;
            }
            else
            {
                radio = Math.Min(alto / 2 - 2, (ancho - anchoLeyenda - separacion - 4) / 2);
                cx = (ancho - (radio * 2 + separacion + anchoLeyenda)) / 2 + radio;
            }

            float radioInterno = radio * 0.58f;
            float cy = alto / 2;

            // Partes (empiezan arriba y van en sentido de las manecillas)
            double angulo = -90;
            var etiquetas = new StringBuilder();
            foreach (var parte in partes)
            {
                if (parte.Valor == 0) continue;

                double barrido = parte.Valor * 360.0 / total;
                double porcentaje = parte.Valor * 100.0 / total;
                svg.Append(Sector(cx, cy, radio, radioInterno, angulo, angulo + barrido, parte.Color,
                    $"{parte.Nombre}: {parte.Valor} ({Numero(porcentaje)}%)"));

                // Las partes muy pequeñas no llevan etiqueta para que no se encimen
                if (porcentaje >= 4.5)
                {
                    double medio = (angulo + barrido / 2) * Math.PI / 180;
                    float r = (radio + radioInterno) / 2;
                    float x = cx + r * (float)Math.Cos(medio);
                    float y = cy + r * (float)Math.Sin(medio);
                    string color = parte.ColorTexto ?? TextoSobre(parte.Color);

                    if (conCantidad)
                    {
                        etiquetas.Append(TextoSvg(x, y - 1, parte.Valor.ToString(), 8.5f, color, "middle", true));
                        etiquetas.Append(TextoSvg(x, y + 8, Numero(porcentaje) + "%", 7, color, "middle", false));
                    }
                    else
                    {
                        etiquetas.Append(TextoSvg(x, y + 3, Numero(porcentaje) + "%", 8, color, "middle", true));
                    }
                }

                angulo += barrido;
            }
            svg.Append(etiquetas);

            if (totalAlCentro)
            {
                svg.Append(TextoSvg(cx, cy + 2, total.ToString(), radioInterno * 0.55f, Texto, "middle", true, "g-texto"));
                svg.Append(TextoSvg(cx, cy + radioInterno * 0.38f, total == 1 ? "ticket" : "tickets", 8, TextoSuave, "middle", false, "g-suave"));
            }

            // Leyenda
            float xLeyenda = cx + radio + separacion;
            float yLeyenda = cy - (partes.Count - 1) * altoLinea / 2;
            for (int i = 0; i < partes.Count; i++)
            {
                float y = yLeyenda + i * altoLinea;
                svg.Append($"<circle cx=\"{F(xLeyenda + 4)}\" cy=\"{F(y)}\" r=\"4\" fill=\"{partes[i].Color}\"/>");
                svg.Append(TextoSvg(xLeyenda + 13, y + 3, $"{partes[i].Nombre}  ({partes[i].Valor})", tamanoLeyenda, Texto, "start", false, "g-texto"));
            }

            return svg.Append("</svg>").ToString();
        }

        // Una parte de la dona: arco de afuera, línea, arco de adentro de regreso
        private static string Sector(float cx, float cy, float radio, float radioInterno, double desde, double hasta, string color, string detalle)
        {
            // Un círculo completo no se puede dibujar con un solo arco; se parte en dos mitades
            if (hasta - desde >= 359.99)
            {
                return Sector(cx, cy, radio, radioInterno, desde, desde + 180, color, detalle)
                     + Sector(cx, cy, radio, radioInterno, desde + 180, hasta, color, detalle);
            }

            (float x, float y) Punto(float r, double grados)
            {
                double rad = grados * Math.PI / 180;
                return (cx + r * (float)Math.Cos(rad), cy + r * (float)Math.Sin(rad));
            }

            var (x1, y1) = Punto(radio, desde);
            var (x2, y2) = Punto(radio, hasta);
            var (x3, y3) = Punto(radioInterno, hasta);
            var (x4, y4) = Punto(radioInterno, desde);
            int arcoGrande = hasta - desde > 180 ? 1 : 0;

            return $"<path class=\"g-separador\" d=\"M {F(x1)} {F(y1)} A {F(radio)} {F(radio)} 0 {arcoGrande} 1 {F(x2)} {F(y2)} " +
                   $"L {F(x3)} {F(y3)} A {F(radioInterno)} {F(radioInterno)} 0 {arcoGrande} 0 {F(x4)} {F(y4)} Z\" " +
                   $"fill=\"{color}\" stroke=\"#FFFFFF\" stroke-width=\"1.5\" stroke-linejoin=\"round\">{Detalle(detalle)}</path>";
        }

        /* ------------------------------------------------------------------
           BARRAS HORIZONTALES
           Nombre a la izquierda, barra y al final "cantidad · porcentaje".
           ------------------------------------------------------------------ */
        public static string Barras(float ancho, float alto, IList<ParteGrafica> partes)
        {
            var svg = Inicio(ancho, alto);
            if (!partes.Any()) return svg.Append("</svg>").ToString();

            int total = partes.Sum(p => p.Valor);
            int maximo = EscalaMaxima(partes.Max(p => p.Valor));

            float xBarras = partes.Max(p => AnchoTexto(p.Nombre, 8.5f, true)) + 14;
            float anchoBarras = ancho - xBarras - 62;
            float altoEje = 14;
            float altoFila = (alto - altoEje) / partes.Count;
            float grosor = Math.Min(altoFila * 0.55f, 22);

            Rejilla(svg, xBarras, anchoBarras, 0, alto - altoEje, maximo);

            for (int i = 0; i < partes.Count; i++)
            {
                var parte = partes[i];
                float centro = altoFila * i + altoFila / 2;
                float largo = Math.Max(anchoBarras * parte.Valor / maximo, 2);
                string porcentaje = Numero(parte.Valor * 100.0 / total);

                svg.Append(TextoSvg(xBarras - 8, centro + 3, parte.Nombre, 8.5f, Texto, "end", true, "g-texto"));
                svg.Append($"<rect x=\"{F(xBarras)}\" y=\"{F(centro - grosor / 2)}\" width=\"{F(largo)}\" height=\"{F(grosor)}\" rx=\"3\" fill=\"{parte.Color}\">" +
                           $"{Detalle($"{parte.Nombre}: {parte.Valor} ({porcentaje}%)")}</rect>");
                svg.Append(TextoSvg(xBarras + largo + 6, centro + 3, $"{parte.Valor} · {porcentaje}%", 8, Texto, "start", true, "g-texto"));
            }

            return svg.Append("</svg>").ToString();
        }

        /* ------------------------------------------------------------------
           PALETAS (lollipop)
           Para un ranking: nombre a la izquierda, una línea delgada y un
           círculo al final con la cantidad adentro; a un lado el porcentaje.
           El porcentaje es sobre "total" (por ejemplo, todos los tickets aunque
           solo se muestren los primeros); sin él, sobre la suma de las partes.
           Los nombres largos se recortan con "…" (el completo sale al pasar el mouse).
           ------------------------------------------------------------------ */
        public static string Paletas(float ancho, float alto, IList<ParteGrafica> partes, int? total = null, int largoMaximoNombre = 24)
        {
            var svg = Inicio(ancho, alto);
            if (!partes.Any()) return svg.Append("</svg>").ToString();

            int totalPorcentaje = total ?? partes.Sum(p => p.Valor);
            int maximo = EscalaMaxima(partes.Max(p => p.Valor));
            var nombres = partes.Select(p => Recortar(p.Nombre, largoMaximoNombre)).ToList();

            float xEje = nombres.Max(n => AnchoTexto(n, 8, true)) + 14;
            float anchoEje = ancho - xEje - 46;
            float altoEje = 14;
            float altoFila = (alto - altoEje) / partes.Count;
            float radio = Math.Clamp(altoFila * 0.36f, 6, 10);

            Rejilla(svg, xEje, anchoEje, 0, alto - altoEje, maximo);

            for (int i = 0; i < partes.Count; i++)
            {
                var parte = partes[i];
                float centro = altoFila * i + altoFila / 2;
                float x = xEje + anchoEje * parte.Valor / maximo;
                string porcentaje = Numero(parte.Valor * 100.0 / totalPorcentaje);

                svg.Append($"<g>{Detalle($"{parte.Nombre}: {parte.Valor} ({porcentaje}%)")}");
                svg.Append(TextoSvg(xEje - 8, centro + 3, nombres[i], 8, Texto, "end", true, "g-texto"));
                svg.Append($"<line x1=\"{F(xEje)}\" y1=\"{F(centro)}\" x2=\"{F(x)}\" y2=\"{F(centro)}\" stroke=\"{parte.Color}\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>");
                svg.Append($"<circle cx=\"{F(x)}\" cy=\"{F(centro)}\" r=\"{F(radio)}\" fill=\"{parte.Color}\"/>");
                svg.Append(TextoSvg(x, centro + radio * 0.35f, parte.Valor.ToString(), radio, parte.ColorTexto ?? TextoSobre(parte.Color), "middle", true));
                svg.Append(TextoSvg(x + radio + 5, centro + 3, porcentaje + "%", 7.5f, TextoSuave, "start", false, "g-suave"));
                svg.Append("</g>");
            }

            return svg.Append("</svg>").ToString();
        }

        /* ------------------------------------------------------------------
           COLUMNAS DOBLES
           Por cada periodo (eje de abajo) una columna de cada serie, lado a
           lado, con su cantidad encima. Leyenda centrada arriba con el total
           de cada serie y el título del eje debajo de los periodos.
           Un periodo puede llevar dos renglones separados por \n
           ("Semana 1\n01 al 07 oct"): el primero en negritas.
           ------------------------------------------------------------------ */
        public static string Columnas(float ancho, float alto, IList<string> categorias, IList<SerieGrafica> series, string tituloEje)
        {
            var svg = Inicio(ancho, alto);
            if (!categorias.Any() || series.All(s => s.Valores.Sum() == 0)) return svg.Append("</svg>").ToString();

            // Leyenda centrada arriba: "Llamada (12)"
            float tamanoLeyenda = 8.5f;
            var textos = series.Select(s => $"{s.Nombre} ({s.Valores.Sum()})").ToList();
            var anchos = textos.Select(t => 14 + AnchoTexto(t, tamanoLeyenda, true)).ToList();
            float xLeyenda = (ancho - (anchos.Sum() + 16 * (series.Count - 1))) / 2;
            for (int s = 0; s < series.Count; s++)
            {
                svg.Append($"<rect x=\"{F(xLeyenda)}\" y=\"3\" width=\"10\" height=\"10\" rx=\"2\" fill=\"{series[s].Color}\"/>");
                svg.Append(TextoSvg(xLeyenda + 14, 12, textos[s], tamanoLeyenda, Texto, "start", true, "g-texto"));
                xLeyenda += anchos[s] + 16;
            }

            int maximo = EscalaMaxima(series.Max(s => s.Valores.Max()));
            float izquierda = 8 + AnchoTexto(maximo.ToString(), 7.5f) + 6;
            float derecha = ancho - 6;
            bool dosRenglones = categorias.Any(c => c.Contains('\n'));
            float arriba = 34;
            float abajo = alto - (dosRenglones ? 38 : 28);

            // Líneas guía horizontales con su número a la izquierda
            for (int p = 0; p <= 4; p++)
            {
                float y = abajo - (abajo - arriba) * p / 4;
                svg.Append($"<line class=\"g-linea\" x1=\"{F(izquierda)}\" y1=\"{F(y)}\" x2=\"{F(derecha)}\" y2=\"{F(y)}\" stroke=\"{Linea}\" stroke-width=\"0.75\"/>");
                svg.Append(TextoSvg(izquierda - 6, y + 3, (maximo * p / 4).ToString(), 7.5f, TextoSuave, "end", false, "g-suave"));
            }

            int n = categorias.Count;
            float anchoGrupo = (derecha - izquierda) / n;
            float anchoColumna = Math.Min(anchoGrupo * 0.75f / series.Count, 26);
            float tamanoValor = anchoColumna >= 12 ? 7.5f : 6.5f;

            // Si los periodos no caben, solo se escribe uno de cada tantos
            float anchoEtiqueta = categorias.SelectMany(c => c.Split('\n')).Max(r => AnchoTexto(r, 7.5f, true)) + 6;
            int cada = (int)Math.Ceiling(anchoEtiqueta / anchoGrupo);

            for (int c = 0; c < n; c++)
            {
                float centro = izquierda + anchoGrupo * c + anchoGrupo / 2;
                float x = centro - anchoColumna * series.Count / 2;

                foreach (var serie in series)
                {
                    int valor = serie.Valores[c];
                    if (valor > 0)
                    {
                        float altoColumna = (abajo - arriba) * valor / maximo;
                        svg.Append($"<rect x=\"{F(x + 1)}\" y=\"{F(abajo - altoColumna)}\" width=\"{F(anchoColumna - 2)}\" height=\"{F(altoColumna)}\" rx=\"2\" fill=\"{serie.Color}\">" +
                                   $"{Detalle($"{categorias[c].Replace("\n", " · ")} · {serie.Nombre}: {valor}")}</rect>");

                        if (anchoColumna >= 8)
                        {
                            svg.Append(TextoSvg(x + anchoColumna / 2, abajo - altoColumna - 3, valor.ToString(), tamanoValor, Texto, "middle", true, "g-texto"));
                        }
                    }

                    x += anchoColumna;
                }

                if (c % cada == 0)
                {
                    var renglones = categorias[c].Split('\n');
                    if (renglones.Length == 1)
                    {
                        svg.Append(TextoSvg(centro, abajo + 11, renglones[0], 7.5f, TextoSuave, "middle", false, "g-suave"));
                    }
                    else
                    {
                        svg.Append(TextoSvg(centro, abajo + 11, renglones[0], 7.5f, Texto, "middle", true, "g-texto"));
                        svg.Append(TextoSvg(centro, abajo + 21, renglones[1], 7, TextoSuave, "middle", false, "g-suave"));
                    }
                }
            }

            svg.Append(TextoSvg((izquierda + derecha) / 2, alto - 3, tituloEje, 8, TextoSuave, "middle", false, "g-suave"));

            return svg.Append("</svg>").ToString();
        }

        /* ------------------------------------------------------------------
           RADAR (araña)
           Un eje por parte saliendo del centro; la figura de color une las
           cantidades de cada eje. Necesita al menos 3 partes.
           ------------------------------------------------------------------ */
        public static string Radar(float ancho, float alto, IList<ParteGrafica> partes, string color)
        {
            var svg = Inicio(ancho, alto);
            int n = partes.Count;
            if (n < 3 || partes.All(p => p.Valor == 0)) return svg.Append("</svg>").ToString();

            int maximo = EscalaMaxima(partes.Max(p => p.Valor));
            float anchoEtiqueta = partes.Max(p => AnchoTexto($"{p.Nombre} ({p.Valor})", 8.5f, true));
            // Deja lugar arriba y abajo para los nombres de los ejes
            float radio = Math.Min(alto / 2 - 24, ancho / 2 - anchoEtiqueta - 14);
            float cx = ancho / 2;
            float cy = alto / 2 + 1;

            // El primer eje apunta hacia arriba y los demás siguen las manecillas del reloj
            (float x, float y) Punto(int i, float r)
            {
                double angulo = -Math.PI / 2 + 2 * Math.PI * i / n;
                return (cx + r * (float)Math.Cos(angulo), cy + r * (float)Math.Sin(angulo));
            }

            string Puntos(Func<int, float> r) => string.Join(" ", Enumerable.Range(0, n).Select(i =>
            {
                var (x, y) = Punto(i, r(i));
                return $"{F(x)},{F(y)}";
            }));

            // Telaraña: cuatro niveles con su número y un eje por parte
            for (int nivel = 1; nivel <= 4; nivel++)
            {
                float r = radio * nivel / 4;
                svg.Append($"<polygon class=\"g-linea\" points=\"{Puntos(_ => r)}\" fill=\"none\" stroke=\"{Linea}\" stroke-width=\"0.75\"/>");
                svg.Append(TextoSvg(cx + 3, cy - r + 8, (maximo * nivel / 4).ToString(), 6.5f, TextoSuave, "start", false, "g-suave"));
            }

            for (int i = 0; i < n; i++)
            {
                var (x, y) = Punto(i, radio);
                svg.Append($"<line class=\"g-linea\" x1=\"{F(cx)}\" y1=\"{F(cy)}\" x2=\"{F(x)}\" y2=\"{F(y)}\" stroke=\"{Linea}\" stroke-width=\"0.75\"/>");
            }

            // Figura con las cantidades
            svg.Append($"<polygon points=\"{Puntos(i => radio * partes[i].Valor / maximo)}\" fill=\"{color}\" fill-opacity=\"0.25\" " +
                       $"stroke=\"{color}\" stroke-width=\"2\" stroke-linejoin=\"round\"/>");

            for (int i = 0; i < n; i++)
            {
                var parte = partes[i];

                // Las áreas en 0 no llevan punto para que no se encimen en el centro
                if (parte.Valor > 0)
                {
                    var (px, py) = Punto(i, radio * parte.Valor / maximo);
                    svg.Append($"<circle cx=\"{F(px)}\" cy=\"{F(py)}\" r=\"4\" fill=\"{parte.Color}\">{Detalle($"{parte.Nombre}: {parte.Valor}")}</circle>");
                }

                // Nombre afuera de la punta del eje, alineado según de qué lado queda
                double angulo = -Math.PI / 2 + 2 * Math.PI * i / n;
                var (ex, ey) = Punto(i, radio + 9);
                string alineacion = Math.Cos(angulo) > 0.3 ? "start" : Math.Cos(angulo) < -0.3 ? "end" : "middle";
                float ajuste = Math.Sin(angulo) < -0.5 ? -2 : Math.Sin(angulo) > 0.5 ? 9 : 3;

                svg.Append(TextoSvg(ex, ey + ajuste, $"{parte.Nombre} ({parte.Valor})", 8.5f, Texto, alineacion, true, "g-texto"));
            }

            return svg.Append("</svg>").ToString();
        }

        /* ------------------------------------------------------------------
           COMPARATIVO
           Dos cifras grandes lado a lado, una franja con la proporción de
           cada una y debajo de cada cifra unas líneas de detalle.
           ------------------------------------------------------------------ */
        public static string Comparativo(float ancho, float alto, ParteGrafica izquierda, IList<string> detalleIzquierda, ParteGrafica derecha, IList<string> detalleDerecha)
        {
            var svg = Inicio(ancho, alto);
            int total = izquierda.Valor + derecha.Valor;
            if (total == 0) return svg.Append("</svg>").ToString();

            float tamanoNumero = Math.Min(alto * 0.17f, 34);
            float yNumero = alto * 0.27f;
            float margen = 12;
            float yFranja = yNumero + 44;
            float altoFranja = 14;
            float anchoFranja = ancho - margen * 2;
            float anchoIzquierda = anchoFranja * izquierda.Valor / total;
            float anchoDerecha = anchoFranja - anchoIzquierda;

            // Línea que separa las dos cifras
            svg.Append($"<line class=\"g-linea\" x1=\"{F(ancho / 2)}\" y1=\"{F(yNumero - tamanoNumero * 0.8f)}\" x2=\"{F(ancho / 2)}\" y2=\"{F(yNumero + 28)}\" stroke=\"{Linea}\" stroke-width=\"1\"/>");

            int letras = (int)((ancho / 2 - 16) / (7.5f * 0.55f));
            foreach (var (parte, cx, detalle) in new[] { (izquierda, ancho * 0.25f, detalleIzquierda), (derecha, ancho * 0.75f, detalleDerecha) })
            {
                svg.Append(TextoSvg(cx, yNumero, parte.Valor.ToString(), tamanoNumero, parte.Color, "middle", true));
                svg.Append(TextoSvg(cx, yNumero + 15, parte.Nombre, 9, Texto, "middle", true, "g-texto"));
                svg.Append(TextoSvg(cx, yNumero + 27, Numero(parte.Valor * 100.0 / total) + "% del total", 7.5f, TextoSuave, "middle", false, "g-suave"));

                float y = yFranja + altoFranja + 18;
                foreach (var linea in detalle.Take(4))
                {
                    svg.Append(TextoSvg(cx, y, Recortar(linea, letras), 7.5f, TextoSuave, "middle", false, "g-suave"));
                    y += 11;
                }
            }

            // Franja de proporción: redondeada en sus extremos y recta donde se juntan las dos partes
            float radio = altoFranja / 2;
            if (anchoIzquierda > 0)
            {
                svg.Append(RectanguloFranja(margen, yFranja, anchoIzquierda, altoFranja, radio, izquierda.Color,
                    anchoDerecha > 0 ? margen + anchoIzquierda - radio : null, izquierda));
            }
            if (anchoDerecha > 0)
            {
                svg.Append(RectanguloFranja(margen + anchoIzquierda, yFranja, anchoDerecha, altoFranja, radio, derecha.Color,
                    anchoIzquierda > 0 ? margen + anchoIzquierda : null, derecha));
            }

            // Porcentaje dentro de cada parte si cabe
            if (anchoIzquierda >= 34)
            {
                svg.Append(TextoSvg(margen + anchoIzquierda / 2, yFranja + 10, Numero(izquierda.Valor * 100.0 / total) + "%", 8, TextoSobre(izquierda.Color), "middle", true));
            }
            if (anchoDerecha >= 34)
            {
                svg.Append(TextoSvg(margen + anchoIzquierda + anchoDerecha / 2, yFranja + 10, Numero(derecha.Valor * 100.0 / total) + "%", 8, TextoSobre(derecha.Color), "middle", true));
            }

            return svg.Append("</svg>").ToString();
        }

        // Una parte de la franja; xRecto marca dónde poner un cuadro sin redondear para que la unión quede recta
        private static string RectanguloFranja(float x, float y, float ancho, float alto, float radio, string color, float? xRecto, ParteGrafica parte)
        {
            string recto = xRecto.HasValue
                ? $"<rect x=\"{F(xRecto.Value)}\" y=\"{F(y)}\" width=\"{F(Math.Min(radio, ancho))}\" height=\"{F(alto)}\" fill=\"{color}\"/>"
                : "";

            return $"<g>{Detalle($"{parte.Nombre}: {parte.Valor}")}" +
                   $"<rect x=\"{F(x)}\" y=\"{F(y)}\" width=\"{F(ancho)}\" height=\"{F(alto)}\" rx=\"{F(radio)}\" fill=\"{color}\"/>{recto}</g>";
        }

        /* ------------------------------------------------------------------
           BARRAS HORIZONTALES APILADAS
           Una barra por categoría partida en series; leyenda centrada arriba.
           ------------------------------------------------------------------ */
        public static string BarrasApiladas(float ancho, float alto, IList<string> categorias, IList<SerieGrafica> series, string tituloEje)
        {
            var svg = Inicio(ancho, alto);
            if (!categorias.Any()) return svg.Append("</svg>").ToString();

            // Leyenda centrada arriba
            float tamanoLeyenda = 8.5f;
            var anchos = series.Select(s => 14 + AnchoTexto(s.Nombre, tamanoLeyenda, true)).ToList();
            float x = (ancho - (anchos.Sum() + 14 * (series.Count - 1))) / 2;
            for (int s = 0; s < series.Count; s++)
            {
                svg.Append($"<rect x=\"{F(x)}\" y=\"3\" width=\"10\" height=\"10\" rx=\"2\" fill=\"{series[s].Color}\"/>");
                svg.Append(TextoSvg(x + 14, 12, series[s].Nombre, tamanoLeyenda, Texto, "start", true, "g-texto"));
                x += anchos[s] + 14;
            }

            float arriba = 24;
            float altoEje = 26;
            float xBarras = categorias.Max(c => AnchoTexto(c, 8.5f, true)) + 14;
            float anchoBarras = ancho - xBarras - 12;
            float altoFila = (alto - arriba - altoEje) / categorias.Count;
            float grosor = Math.Min(altoFila * 0.6f, 22);

            var totales = categorias.Select((_, c) => series.Sum(s => s.Valores[c])).ToList();
            int maximo = EscalaMaxima(totales.Max());

            Rejilla(svg, xBarras, anchoBarras, arriba, alto - altoEje, maximo);
            svg.Append(TextoSvg(xBarras + anchoBarras / 2, alto - 2, tituloEje, 8, TextoSuave, "middle", false, "g-suave"));

            for (int c = 0; c < categorias.Count; c++)
            {
                float centro = arriba + altoFila * c + altoFila / 2;
                svg.Append(TextoSvg(xBarras - 8, centro + 3, categorias[c], 8.5f, Texto, "end", true, "g-texto"));

                float inicio = xBarras;
                foreach (var serie in series)
                {
                    int valor = serie.Valores[c];
                    if (valor == 0) continue;

                    float largo = anchoBarras * valor / maximo;
                    svg.Append($"<rect x=\"{F(inicio)}\" y=\"{F(centro - grosor / 2)}\" width=\"{F(largo)}\" height=\"{F(grosor)}\" fill=\"{serie.Color}\">" +
                               $"{Detalle($"{categorias[c]} · {serie.Nombre}: {valor}")}</rect>");

                    if (largo >= 12)
                    {
                        svg.Append(TextoSvg(inicio + largo / 2, centro + 3, valor.ToString(), 8, serie.ColorTexto, "middle", true));
                    }

                    inicio += largo;
                }
            }

            return svg.Append("</svg>").ToString();
        }

        // Líneas guía verticales de arriba a abajo, con los números del eje debajo
        private static void Rejilla(StringBuilder svg, float xBarras, float anchoBarras, float arriba, float abajo, int maximo)
        {
            int pasos = 4;
            for (int p = 0; p <= pasos; p++)
            {
                float x = xBarras + anchoBarras * p / pasos;
                svg.Append($"<line class=\"g-linea\" x1=\"{F(x)}\" y1=\"{F(arriba)}\" x2=\"{F(x)}\" y2=\"{F(abajo)}\" stroke=\"{Linea}\" stroke-width=\"0.75\"/>");
                svg.Append(TextoSvg(x, abajo + 10, (maximo * p / pasos).ToString(), 7.5f, TextoSuave, "middle", false, "g-suave"));
            }
        }

        // Tope del eje redondeado hacia arriba a un número "bonito" divisible entre 4
        private static int EscalaMaxima(int valor)
        {
            int[] topes = { 4, 8, 12, 16, 20, 24, 32, 40, 48, 60, 80, 100, 120, 160, 200, 400, 600, 800, 1000 };
            return topes.FirstOrDefault(t => t >= valor, (int)Math.Ceiling(valor / 400.0) * 400);
        }

        /* ------------------------------------------------------------------
           AYUDAS
           ------------------------------------------------------------------ */
        private static StringBuilder Inicio(float ancho, float alto)
        {
            return new StringBuilder(
                $"<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"grafica-svg\" width=\"{F(ancho)}\" height=\"{F(alto)}\" viewBox=\"0 0 {F(ancho)} {F(alto)}\">");
        }

        private static string TextoSvg(float x, float y, string texto, float tamano, string color, string alineacion, bool negrita, string? clase = null)
        {
            string atributoClase = clase == null ? "" : $"class=\"{clase}\" ";
            return $"<text {atributoClase}x=\"{F(x)}\" y=\"{F(y)}\" font-family=\"{Fuente}\" font-size=\"{F(tamano)}\" " +
                   $"font-weight=\"{(negrita ? "bold" : "normal")}\" fill=\"{color}\" text-anchor=\"{alineacion}\">" +
                   $"{SecurityElement.Escape(texto)}</text>";
        }

        // Texto que muestra el navegador al pasar el mouse
        private static string Detalle(string texto) => $"<title>{SecurityElement.Escape(texto)}</title>";

        private static string Recortar(string texto, int largo)
        {
            return texto.Length <= largo ? texto : texto.Substring(0, Math.Max(largo - 1, 1)).TrimEnd() + "…";
        }

        // Ancho aproximado de un texto en Segoe UI
        private static float AnchoTexto(string texto, float tamano, bool negrita = false)
        {
            return texto.Length * tamano * (negrita ? 0.6f : 0.55f);
        }

        // Texto oscuro sobre colores claros y blanco sobre colores oscuros
        public static string TextoSobre(string fondo)
        {
            string hex = fondo.TrimStart('#');
            if (hex.Length < 6) return "#FFFFFF";

            int r = Convert.ToInt32(hex.Substring(0, 2), 16);
            int g = Convert.ToInt32(hex.Substring(2, 2), 16);
            int b = Convert.ToInt32(hex.Substring(4, 2), 16);
            return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? Texto : "#FFFFFF";
        }

        private static string F(float valor) => valor.ToString("0.##", Invariante);

        private static string Numero(double valor) => valor.ToString("0.#", Invariante);
    }
}
