# Átomos · simulador cuántico

Simulador 3D de átomos en el que los electrones **no** giran en círculos: cada orbital
ocupado se dibuja como una nube de puntos muestreada de |ψ|², con una tabla periódica
completa (118 elementos) al lado y datos reales de NIST, PubChem y el OIEA.

**Abrirlo en el navegador:** <https://juaneprietoreyes-lang.github.io/atomos/>

> Proyecto en construcción por fases (1 datos y tabla · 2 física · 3 orbitales ·
> 4 interacciones · 5 pulido). Este README se completa al final.

## Ejecutarlo en local

```bash
npm install
npm run dev
```

| Orden | Para qué |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm test` | tests de física y datos (Vitest) |
| `npm run build` | comprobación de tipos + compilación a `dist/` |
| `npm run data:fetch` | vuelve a descargar las fuentes a `data/raw/` |
| `npm run data:build` | regenera `src/data/*.json` y `data/INFORME.md` |

## Datos: nada inventado

- Fuentes, licencias y fecha de descarga: [`data/raw/FUENTES.md`](data/raw/FUENTES.md).
- Las discrepancias entre fuentes y cómo se resolvieron: [`data/INFORME.md`](data/INFORME.md).
- Las configuraciones electrónicas vienen de NIST, con sus excepciones reales a la
  regla de Madelung (Cr, Cu, Nb, Mo, Ru, Rh, Pd, Ag, Pt, Au, La, Ce, Gd, Ac, Th, Pa, U,
  Np, Cm, Lr); los tests comprueban esos casos.
- Lo que no se conoce aparece como «desconocido»; lo calculado teóricamente, como
  «predicho» o «teórico».

## Licencia

Código bajo licencia MIT. Los datos conservan la licencia de su fuente
(`elements.json` incluye datos de Periodic-Table-JSON, CC BY-SA 3.0).
