// Genera las hojas del tema claro (wwwroot/css/Claro/*.claro.css) a partir de las hojas oscuras.
// Por cada regla repite las declaraciones de color con su versión clara, bajo html[data-tema="claro"].
// Se vuelve a correr cuando se cambian colores en una hoja oscura:  node Scripts/GenerarTemaClaro.js
// Los ajustes hechos a mano van en wwwroot/css/tema-claro.css (este script no lo toca).
const fs = require('fs');
const path = require('path');

const PREFIJO = 'html[data-tema="claro"]';

// ---------- colores ----------
const NOMBRES = { white: '#ffffff', black: '#000000' };

function hexARgb(h) {
    h = h.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}
function rgbAHsl({ r, g, b, a }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
    }
    return { h, s, l, a };
}
function hslARgb({ h, s, l, a }) {
    const k = n => (n + h / 30) % 12;
    const m = s * Math.min(l, 1 - l);
    const f = n => l - m * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a };
}
function escribir(c, original) {
    const { r, g, b, a } = hslARgb(c);
    const al = Math.round(a * 100) / 100;
    if (al >= 1 && !/^rgba?\(/i.test(original)) return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    return al >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${al})`;
}
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

// Tonos fuertes para el texto de color (equivalen a los 700 de Tailwind)
const TONOS_TEXTO = {
    '38bdf8': '0369a1', '7dd3fc': '0369a1', '0ea5e9': '0369a1', 'bae6fd': '0369a1',
    '22d3ee': '0e7490', '67e8f9': '0e7490', '06b6d4': '0e7490',
    '60a5fa': '1d4ed8', '93c5fd': '1d4ed8', '3b82f6': '1d4ed8', 'bfdbfe': '1d4ed8', 'dbeafe': '1e3a8a',
    '34d399': '047857', '6ee7b7': '047857', '10b981': '047857', 'a7f3d0': '047857',
    '4ade80': '15803d', '86efac': '15803d', '22c55e': '15803d', 'bbf7d0': '15803d',
    'fbbf24': 'b45309', 'fcd34d': 'b45309', 'f59e0b': 'b45309', 'fde68a': 'b45309', 'facc15': 'a16207', 'eab308': 'a16207', 'fde047': 'a16207',
    'fb923c': 'c2410c', 'fdba74': 'c2410c', 'f97316': 'c2410c',
    'f87171': 'b91c1c', 'fca5a5': 'b91c1c', 'ef4444': 'b91c1c', 'fecaca': 'b91c1c',
    'fb7185': 'be123c', 'fda4af': 'be123c', 'f43f5e': 'be123c',
    'f472b6': 'be185d', 'f9a8d4': 'be185d',
    'c084fc': '7e22ce', 'd8b4fe': '7e22ce', 'a855f7': '7e22ce', 'e9d5ff': '7e22ce',
    'a78bfa': '6d28d9', 'c4b5fd': '6d28d9', '8b5cf6': '6d28d9', 'ddd6fe': '6d28d9',
    '818cf8': '4338ca', 'a5b4fc': '4338ca', '6366f1': '4338ca',
    '2dd4bf': '0f766e', '5eead4': '0f766e', '14b8a6': '0f766e'
};
function claveHex(c) {
    const { r, g, b } = hslARgb({ ...c, a: 1 });
    return [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Texto: lo claro pasa a oscuro (grises a pizarra, colores a su tono fuerte)
function texto(c) {
    const tono = TONOS_TEXTO[claveHex(c)];
    if (tono) return { ...rgbAHsl(hexARgb('#' + tono)), a: c.a };
    if (c.l < 0.5) return c;
    if (c.s < 0.25 || c.l > 0.93) {
        const gris = c.l >= 0.93 ? "#0f172a" : c.l >= 0.85 ? "#1e293b" : c.l >= 0.75 ? "#334155" : c.l >= 0.6 ? "#475569" : "#64748b";
        return { ...rgbAHsl(hexARgb(gris)), a: c.a };
    }
    return { h: c.h, s: Math.min(c.s, 0.8), l: 0.36, a: c.a };
}
// Color oscuro con tono (badges, botones de acción, estatus): en claro pasa a su versión pastel
function esColorOscuro(c) {
    return c.a >= 0.6 && c.s >= 0.6 && c.l >= 0.15 && c.l < 0.36;
}
// Color sólido de estatus o badge (no degradado): también pasa a pastel, aunque no sea tan oscuro
function esColorDeEstado(c) {
    return c.a >= 0.6 && c.s >= 0.6 && c.l >= 0.15 && c.l < 0.5;
}
function pastel(c) {
    return { h: c.h, s: Math.min(c.s, 0.75), l: 0.92, a: 1 };
}
// Texto que va sobre ese pastel: el mismo tono, oscuro
function textoDeTono(c) {
    return { h: c.h, s: Math.min(c.s, 0.8), l: 0.3, a: 1 };
}

// Fondo: lo oscuro pasa a blanco azulado; los colores fuertes (botones) se quedan
function fondo(c) {
    if (esColorOscuro(c)) return pastel(c);
    if (c.a < 1 && c.a >= 0.35 && c.s >= 0.55 && c.l >= 0.15 && c.l < 0.45) return { h: c.h, s: c.s, l: 0.5, a: c.a * 0.2 };
    const oscuro = c.l < 0.2 || (c.l <= 0.32 && c.s < 0.55);
    if (oscuro) {
        if (c.a < 1) return { h: 0, s: 0, l: 1, a: limitar(0.85 + c.a * 0.15, 0, 1) };
        return { h: c.h, s: Math.min(c.s, 0.45), l: limitar(1 - (c.l - 0.08) * 0.3, 0.93, 1), a: 1 };
    }
    if (c.l > 0.9 && c.a < 0.3) return { h: 222, s: 0.47, l: 0.11, a: c.a * 0.7 };
    return c;
}
// Bordes: oscuros a gris azulado claro; los grises transparentes se refuerzan un poco
function borde(c) {
    if (c.l < 0.35 && c.s < 0.6) return { h: c.h, s: Math.min(c.s, 0.4), l: 0.86, a: Math.max(c.a, 0.9) };
    if (c.l > 0.9 && c.a < 0.5) return { h: 222, s: 0.47, l: 0.11, a: limitar(c.a * 1.2, 0.08, 0.3) };
    if (c.s < 0.3 && c.l > 0.5 && c.l < 0.8 && c.a < 0.5) return { ...c, a: limitar(c.a * 2, 0, 0.45) };
    return c;
}
// Sombras: más suaves (en claro una sombra negra fuerte se ve sucia)
function sombra(c) {
    if (c.l < 0.25) return { h: 222, s: 0.47, l: 0.11, a: c.a * 0.3 };
    if (c.l > 0.9) return c;
    return { ...c, a: c.a * 0.6 };
}

const RE_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|\b(?:white|black)\b/g;

function convertirValor(valor, fn) {
    return valor.replace(RE_COLOR, m => {
        let rgb;
        if (m[0] === '#') rgb = hexARgb(m);
        else if (NOMBRES[m.toLowerCase()]) rgb = hexARgb(NOMBRES[m.toLowerCase()]);
        else {
            const p = m.replace(/rgba?\(|\)/g, '').split(/[\s,\/]+/).filter(Boolean);
            if (p.some(x => x.includes('var('))) return m;
            rgb = { r: +p[0], g: +p[1], b: +p[2], a: p[3] !== undefined ? parseFloat(p[3]) : 1 };
        }
        return escribir(fn(rgbAHsl(rgb)), m[0] === '#' || /^[a-z]/i.test(m) ? '#' : m);
    });
}

// Variables "r, g, b" (se usan como rgba(var(--x), .2))
function convertirTriple(valor, fn) {
    const p = valor.split(',').map(x => parseFloat(x));
    const c = fn(rgbAHsl({ r: p[0], g: p[1], b: p[2], a: 1 }));
    const { r, g, b } = hslARgb(c);
    return `${r}, ${g}, ${b}`;
}

function funcionPara(prop) {
    if (prop.startsWith('--')) {
        if (/estatus|grafica|sis-otro/.test(prop)) return null;
        if (/borde|linea/.test(prop)) return borde;
        if (/fondo|panel|superficie|header|bg|tooltip|tarjeta|campo/.test(prop)) return fondo;
        return texto;
    }
    if (/^(color|caret-color|-webkit-text-fill-color|fill|stroke)$/.test(prop)) return texto;
    if (/^background/.test(prop)) return fondo;
    if (/^(border|outline)/.test(prop) && !/radius|width|style|collapse|spacing/.test(prop)) return borde;
    if (prop === 'text-shadow') return brillo;
    if (/shadow$/.test(prop)) return sombra;
    return null;
}

// Brillos de texto: casi no se notan en claro
function brillo(c) { return { ...c, a: c.a * 0.25 }; }

// ---------- CSS ----------
function quitarComentarios(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

// Devuelve [{ tipo:'regla', selector, cuerpo } | { tipo:'at', cabecera, hijos }]
function analizar(css) {
    const nodos = [];
    let i = 0;
    while (i < css.length) {
        const abre = css.indexOf('{', i);
        if (abre < 0) break;
        const cabecera = css.slice(i, abre).trim();
        let prof = 1, j = abre + 1;
        while (j < css.length && prof > 0) { if (css[j] === '{') prof++; else if (css[j] === '}') prof--; j++; }
        const cuerpo = css.slice(abre + 1, j - 1);
        if (cabecera.startsWith('@')) nodos.push({ tipo: 'at', cabecera, hijos: /^@(media|supports)/.test(cabecera) ? analizar(cuerpo) : [] });
        else nodos.push({ tipo: 'regla', selector: cabecera, cuerpo });
        i = j;
    }
    return nodos;
}

function declaraciones(cuerpo) {
    const res = [];
    let actual = '', paren = 0;
    for (const ch of cuerpo) {
        if (ch === '(') paren++;
        if (ch === ')') paren--;
        if (ch === ';' && paren === 0) { res.push(actual); actual = ''; } else actual += ch;
    }
    res.push(actual);
    return res.map(d => d.trim()).filter(d => d.includes(':')).map(d => {
        const k = d.indexOf(':');
        let valor = d.slice(k + 1).trim();
        const imp = /!important\s*$/i.test(valor);
        valor = valor.replace(/\s*!important\s*$/i, '');
        return { prop: d.slice(0, k).trim().toLowerCase(), valor, imp };
    });
}

function prefijar(selector) {
    return selector.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        if (s === ':root' || s === 'html') return PREFIJO;
        if (s.startsWith('html')) return PREFIJO + s.slice(4);
        return PREFIJO + ' ' + s;
    }).join(',\n');
}

function coloresDe(valor) {
    return (valor.match(RE_COLOR) || []).map(x => {
        if (x[0] === "#") return rgbAHsl(hexARgb(x));
        if (NOMBRES[x.toLowerCase()]) return rgbAHsl(hexARgb(NOMBRES[x.toLowerCase()]));
        const p = x.replace(/rgba?\(|\)/g, "").split(/[\s,\/]+/).filter(Boolean);
        if (p.some(y => y.includes("var("))) return null;
        return rgbAHsl({ r: +p[0], g: +p[1], b: +p[2], a: p[3] !== undefined ? parseFloat(p[3]) : 1 });
    }).filter(Boolean);
}

// Fondo de color fuerte (botón, badge, encabezado): no cambia en claro y su texto se queda igual.
// En un degradado basta con que un color sea fuerte para dejarlo completo.
function esFondoFuerte(valor) {
    const fuerte = c => c.a >= 0.6 && c.l < 0.6 && fondo(c) === c;
    const colores = coloresDe(valor);
    if (!colores.length) return false;
    return /gradient/.test(valor) ? colores.some(fuerte) : colores.every(c => fuerte(c) && !esColorDeEstado(c));
}

// Fondo sólido con tono que pasa a pastel: devuelve el color de texto que le toca
function textoParaFondo(valor) {
    if (/gradient/.test(valor)) return null;
    const oscuro = coloresDe(valor).find(esColorDeEstado);
    return oscuro ? escribir(textoDeTono(oscuro), "#") : null;
}

// Qué texto lleva cada selector según su fondo: "igual" (fondo fuerte) o un color (fondo pastel).
// Sirve también para sus íconos (".boton i").
const textoPorSelector = new Map();

function textoDeRegla(cuerpo) {
    for (const d of declaraciones(cuerpo)) {
        if (!/^background/.test(d.prop)) continue;
        if (esFondoFuerte(d.valor)) return "igual";
        const texto = textoParaFondo(d.valor);
        if (texto) return texto;
    }
    return null;
}

function reunirFondos(nodos) {
    for (const n of nodos) {
        if (n.tipo === "at") { reunirFondos(n.hijos); continue; }
        const texto = textoDeRegla(n.cuerpo);
        if (texto) n.selector.split(",").forEach(x => textoPorSelector.set(x.trim(), texto));
    }
}

// Texto que hereda un ícono o hijo del selector padre (".boton i" toma el de ".boton")
function textoDelPadre(selector) {
    const textos = selector.split(",").map(x => {
        const padre = x.trim().replace(/\s+[^\s>+~]+$/, "");
        return padre !== x.trim() ? textoPorSelector.get(padre) : undefined;
    });
    return textos.every(t => t && t === textos[0]) ? textos[0] : null;
}

function convertirRegla(nodo) {
    const decl = declaraciones(nodo.cuerpo);
    const salida = [];
    const delPadre = textoDelPadre(nodo.selector);
    const propio = textoDeRegla(nodo.cuerpo);
    let tieneColor = false;
    for (const d of decl) {
        const fn = funcionPara(d.prop);
        if (!fn) continue;
        if (d.prop === "color") tieneColor = true;
        let nuevo;
        if (/^background/.test(d.prop) && esFondoFuerte(d.valor)) nuevo = d.valor;
        else if (d.prop.startsWith("--") && /-rgb$/.test(d.prop)) nuevo = convertirTriple(d.valor, fn);
        else if (d.prop.startsWith("--") && !coloresDe(d.valor).length) continue;
        else if (/^background/.test(d.prop) && textoParaFondo(d.valor)) nuevo = convertirValor(d.valor, c => esColorDeEstado(c) ? pastel(c) : fondo(c));
        else nuevo = convertirValor(d.valor, fn);
        salida.push({ ...d, nuevo });
    }
    // Sobre un fondo fuerte el texto se queda como estaba (normalmente blanco);
    // sobre un fondo pastel va oscuro del mismo tono
    const texto = propio || delPadre;
    if (texto) {
        for (const d of salida) if (d.prop === "color") d.nuevo = texto === "igual" ? d.valor : texto;
        // Con la misma prioridad (!important) que el fondo, para no ganarle a otra regla que sí lo tenga
        const impFondo = decl.some(d => /^background/.test(d.prop) && d.imp);
        if (!tieneColor && propio) salida.push({ prop: "color", nuevo: texto === "igual" ? "#ffffff" : texto, imp: impFondo });
    }
    if (!salida.length) return "";
    const cuerpo = salida.map(d => `    ${d.prop}: ${d.nuevo}${d.imp ? " !important" : ""};`).join("\n");
    return `${prefijar(nodo.selector)} {\n${cuerpo}\n}\n`;
}

function convertir(nodos, sangria = '') {
    let out = '';
    for (const n of nodos) {
        if (n.tipo === 'regla') {
            if (/keyframes|^from$|^to$|^\d+%/.test(n.selector)) continue;
            out += convertirRegla(n);
        } else if (/^@media/.test(n.cabecera) && !/\bprint\b/.test(n.cabecera)) {
            const dentro = convertir(n.hijos);
            if (dentro.trim()) out += `${n.cabecera} {\n${dentro.replace(/^/gm, '    ').trimEnd()}\n}\n`;
        }
    }
    return out;
}

const WEB = path.join(__dirname, "..", "SigesTI.Web");

const HOJAS = [
    ["wwwroot/css/layout.css", "layout.claro.css", "LAYOUT"],
    ["wwwroot/css/site.css", "site.claro.css", "GENERAL DEL SITIO"],
    ["wwwroot/css/notificaciones.css", "notificaciones.claro.css", "NOTIFICACIONES"],
    ["Pages/Index.cshtml.css", "index.claro.css", "INICIO"],
    ["Pages/AccesoDenegado.cshtml.css", "accesoDenegado.claro.css", "ACCESO DENEGADO"],
    ["Pages/Shared/_ModalesUsuario.cshtml.css", "modalesUsuario.claro.css", "MODALES DEL USUARIO"],
    ["wwwroot/css/Actividades/campañaR.css", "campañaR.claro.css", "CAMPAÑA DE RENOVACIÓN"],
    ["wwwroot/css/Actividades/indicadores.css", "indicadores.claro.css", "INDICADORES Y MÉTRICAS"],
    ["wwwroot/css/Actividades/planRespaldos.css", "planRespaldos.claro.css", "PLAN DE RESPALDOS"],
    ["wwwroot/css/Actividades/reporte-tickets.css", "reporte-tickets.claro.css", "REPORTE DE TICKETS"],
    ["wwwroot/css/Actividades/tareasg.css", "tareasg.claro.css", "TAREAS GENERALES"],
    ["wwwroot/css/Cuenta/controlAcceso.css", "controlAcceso.claro.css", "CONTROL DE ACCESO"],
    ["wwwroot/css/Personal/administracionPersonal.css", "administracionPersonal.claro.css", "ADMINISTRACIÓN DE PERSONAL"],
    ["wwwroot/css/Solicitudes/solicitudes.css", "solicitudes.claro.css", "SOLICITUDES"]
];

function generar(entrada, salida, titulo) {
    textoPorSelector.clear();
    const css = quitarComentarios(fs.readFileSync(entrada, "utf8").replace(/^﻿/, ""));
    const nodos = analizar(css);
    reunirFondos(nodos);
    const cuerpo = convertir(nodos);
    const cabecera = `/* ==========================================================================
   ${titulo} - TEMA CLARO
   Mismas reglas que ${path.basename(entrada)}, con los colores en su versión clara.
   Solo aplica con <html data-tema="claro"> y en pantalla (las impresiones no cambian).
   Archivo generado con Scripts/GenerarTemaClaro.js: no se edita a mano.
   ========================================================================== */

@media screen {

`;
    fs.writeFileSync(salida, "﻿" + cabecera + cuerpo.replace(/^(?=.)/gm, "    ") + "\n}\n");
}

for (const [entrada, salida, titulo] of HOJAS) {
    generar(path.join(WEB, entrada), path.join(WEB, "wwwroot/css/Claro", salida), titulo);
    console.log("Generado:", salida);
}
