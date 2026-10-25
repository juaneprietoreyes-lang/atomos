/**
 * Descarga las fuentes de datos originales a data/raw/ (tal cual llegan).
 * Solo hace falta ejecutarlo para actualizar los datos: `npm run data:fetch`.
 * La app nunca accede a internet; usa los JSON generados por build-data.ts.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAW = join(import.meta.dirname, '..', 'data', 'raw');
const UA = 'atomos-simulador-escolar/0.1 (proyecto educativo)';

const SOURCES: { file: string; url: string; accept?: string }[] = [
  {
    file: 'bowserinator.json',
    url: 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json',
  },
  { file: 'pubchem.json', url: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON' },
  {
    // NIST ASD: configuración fundamental y 1ª energía de ionización de los átomos neutros
    file: 'nist-ie.csv',
    url:
      'https://physics.nist.gov/cgi-bin/ASD/ie.pl?spectra=H-Og+I&units=1&format=2&order=0&at_num_out=on' +
      '&sp_name_out=on&shells_out=on&conf_out=on&level_out=on&e_out=0&unc_out=on&biblio=on&submit=Retrieve+Data',
  },
  {
    // IAEA LiveChart (ENSDF): estados fundamentales de todos los núclidos
    file: 'iaea-ground-states.csv',
    url: 'https://www-nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all',
  },
  {
    file: 'wikidata-es.csv',
    accept: 'text/csv',
    url:
      'https://query.wikidata.org/sparql?query=' +
      encodeURIComponent(
        'SELECT ?z ?es WHERE { ?e wdt:P31 wd:Q11344; wdt:P1086 ?z. ' +
          '?e rdfs:label ?es FILTER(lang(?es)="es") } ORDER BY xsd:integer(?z)',
      ),
  },
];

async function get(url: string, accept?: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...(accept ? { Accept: accept } : {}) } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

/** Líneas del átomo neutro en el visible (380–750 nm, longitudes de onda en aire). */
function nistLinesUrl(symbol: string): string {
  const p = new URLSearchParams({
    spectra: `${symbol} I`,
    limits_type: '0',
    low_w: '380',
    upp_w: '750',
    unit: '1',
    de: '0',
    format: '2',
    line_out: '0',
    remove_js: 'on',
    en_unit: '0',
    output: '0',
    page_size: '5000',
    show_obs_wl: '1',
    show_calc_wl: '1',
    order_out: '0',
    show_av: '2',
    A_out: '0',
    intens_out: 'on',
    allowed_out: '1',
    forbid_out: '1',
    submit: 'Retrieve Data',
  });
  return `https://physics.nist.gov/cgi-bin/ASD/lines1.pl?${p}`;
}

async function main(): Promise<void> {
  await mkdir(join(RAW, 'nist-lines'), { recursive: true });
  const stamp: string[] = [`Descarga: ${new Date().toISOString()}`, ''];

  for (const s of SOURCES) {
    const body = await get(s.url, s.accept);
    await writeFile(join(RAW, s.file), body);
    stamp.push(`${s.file}\t${body.length} bytes\t${s.url}`);
    console.log(`✓ ${s.file} (${body.length} bytes)`);
  }

  // Las líneas espectrales necesitan los símbolos: los saco del JSON de Bowserinator.
  const { elements } = JSON.parse(
    await (await import('node:fs/promises')).readFile(join(RAW, 'bowserinator.json'), 'utf8'),
  ) as { elements: { number: number; symbol: string }[] };

  let withLines = 0;
  for (const el of elements.filter((e) => e.number <= 118)) {
    const body = await get(nistLinesUrl(el.symbol));
    // Si NIST no tiene datos devuelve una página HTML de error, no un CSV.
    if (body.startsWith('obs_wl_air') || body.startsWith('obs_wl_vac')) {
      await writeFile(join(RAW, 'nist-lines', `${el.symbol}.csv`), body);
      withLines++;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  stamp.push(`nist-lines/*.csv\t${withLines} elementos con líneas\t${nistLinesUrl('X')}`);
  console.log(`✓ líneas NIST: ${withLines} elementos con datos`);

  await writeFile(join(RAW, 'DESCARGA.txt'), stamp.join('\n') + '\n');
}

await main();
