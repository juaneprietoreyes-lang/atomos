# Fuentes de datos

Todo lo que muestra la app sale de estas fuentes, descargadas con `npm run data:fetch`
(fecha y tamaños en `DESCARGA.txt`) y cruzadas con `npm run data:build`
(discrepancias en `../INFORME.md`). Nada se rellena a mano.

| Archivo | Fuente | Qué se usa | Licencia / condiciones |
|---|---|---|---|
| `nist-ie.csv` | NIST Atomic Spectra Database — Ionization Energies (A. Kramida, Yu. Ralchenko, J. Reader y NIST ASD Team), <https://physics.nist.gov/asd> | Configuración del estado fundamental y 1ª energía de ionización (Z = 1–108) | Dominio público (obra del Gobierno de EE. UU.); se cita la fuente |
| `nist-lines/*.csv` | NIST ASD — Lines, átomo neutro (espectro I), 380–750 nm, longitudes de onda en aire | Líneas de emisión e intensidades relativas | Ídem |
| `bowserinator.json` | Periodic-Table-JSON de Bowserinator, <https://github.com/Bowserinator/Periodic-Table-JSON> (datos de Wikipedia) | Posición en la tabla, grupo, periodo, bloque, masa atómica estándar, electronegatividad de Pauling, radios atómicos, estados predichos | CC BY-SA 3.0 |
| `pubchem.json` | PubChem Periodic Table (NCBI), <https://pubchem.ncbi.nlm.nih.gov/periodic-table/> | Categoría (con halógenos), estado estándar, configuraciones predichas de Z > 108, contraste | Datos de libre uso del NCBI; se cita la fuente |
| `iaea-ground-states.csv` | IAEA Nuclear Data Section — LiveChart of Nuclides (ENSDF/NUBASE), <https://www-nds.iaea.org/relnsd/> | Isótopos: abundancia natural, semivida, masa | Uso libre citando al OIEA |
| `wikidata-es.csv` | Wikidata (consulta SPARQL), <https://www.wikidata.org> | Nombres de los elementos en español | CC0 |
