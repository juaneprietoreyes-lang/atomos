# Informe de cruce de fuentes

Generado por `npm run data:build`. Revisa aquí cada discrepancia entre fuentes; la columna «usado» indica el valor que entra en la app.

## Configuraciones: NIST frente a otras fuentes

- **Lr** (103): usado NIST `[Rn] 5f14 7s2 7p1` · PubChem `[Rn] 5f14 6d1 7s2`
- **Ds** (110): usado PubChem `[Rn] 5f14 6d8 7s2` · Bowserinator `[Rn] 5f14 6d9 7s1`
- **Rg** (111): usado PubChem `[Rn] 5f14 6d9 7s2` · Bowserinator `[Rn] 5f14 6d10 7s1`

## Excepciones a la regla de Madelung (configuración usada)

- Cr `[Ar] 3d5 4s1` (Madelung: `[Ar] 3d4 4s2`)
- Cu `[Ar] 3d10 4s1` (Madelung: `[Ar] 3d9 4s2`)
- Nb `[Kr] 4d4 5s1` (Madelung: `[Kr] 4d3 5s2`)
- Mo `[Kr] 4d5 5s1` (Madelung: `[Kr] 4d4 5s2`)
- Ru `[Kr] 4d7 5s1` (Madelung: `[Kr] 4d6 5s2`)
- Rh `[Kr] 4d8 5s1` (Madelung: `[Kr] 4d7 5s2`)
- Pd `[Kr] 4d10` (Madelung: `[Kr] 4d8 5s2`)
- Ag `[Kr] 4d10 5s1` (Madelung: `[Kr] 4d9 5s2`)
- La `[Xe] 5d1 6s2` (Madelung: `[Xe] 4f1 6s2`)
- Ce `[Xe] 4f1 5d1 6s2` (Madelung: `[Xe] 4f2 6s2`)
- Gd `[Xe] 4f7 5d1 6s2` (Madelung: `[Xe] 4f8 6s2`)
- Pt `[Xe] 4f14 5d9 6s1` (Madelung: `[Xe] 4f14 5d8 6s2`)
- Au `[Xe] 4f14 5d10 6s1` (Madelung: `[Xe] 4f14 5d9 6s2`)
- Ac `[Rn] 6d1 7s2` (Madelung: `[Rn] 5f1 7s2`)
- Th `[Rn] 6d2 7s2` (Madelung: `[Rn] 5f2 7s2`)
- Pa `[Rn] 5f2 6d1 7s2` (Madelung: `[Rn] 5f3 7s2`)
- U `[Rn] 5f3 6d1 7s2` (Madelung: `[Rn] 5f4 7s2`)
- Np `[Rn] 5f4 6d1 7s2` (Madelung: `[Rn] 5f5 7s2`)
- Cm `[Rn] 5f7 6d1 7s2` (Madelung: `[Rn] 5f8 7s2`)
- Lr `[Rn] 5f14 7s2 7p1` (Madelung: `[Rn] 5f14 6d1 7s2`)

## Categorías

- **Po**: usado PubChem «Metalloid» · Bowserinator «post-transition metal»
- **At**: usado PubChem «Halogen» · Bowserinator «metalloid»
- **Nh**: usado PubChem «Post-transition metal» · Bowserinator «unknown, probably transition metal»
- **Ts**: usado PubChem «Halogen» · Bowserinator «unknown, probably metalloid»

## Electronegatividad

- **Pm**: usado Bowserinator 1.13 · PubChem —
- **Eu**: usado Bowserinator 1.2 · PubChem —
- **Tb**: usado Bowserinator 1.1 · PubChem —
- **Yb**: usado Bowserinator 1.1 · PubChem —
- **Pb**: usado Bowserinator 1.87 · PubChem 2.33
- **Rn**: usado Bowserinator 2.2 · PubChem —
- **Fr**: usado Bowserinator 0.79 · PubChem 0.7
- **Am**: usado Bowserinator 1.13 · PubChem 1.3

## Estado a temperatura ambiente

- **Cn**: usado «líquido» (predicho) · PubChem «Expected to be a Solid» · Bowserinator «Liquid»
- **Og**: usado «sólido» (predicho) · PubChem «Expected to be a Gas» · Bowserinator «Solid»

## Masa atómica

- **Li**: usado 6.94 · media ENSDF 6.9675 · PubChem 7
- **S**: usado 32.06 · media ENSDF 32.0675 · PubChem 32.07
- **Ar**: usado 39.9481 · media ENSDF 39.9478 · PubChem 39.9
- **Zn**: usado 65.382 · media ENSDF 65.3778 · PubChem 65.4
- **Ru**: usado 101.072 · media ENSDF 101.0649 · PubChem 101.1
- **Pd**: usado 106.421 · media ENSDF 106.4153 · PubChem 106.42
- **Sn**: usado 118.7107 · media ENSDF 118.7552 · PubChem 118.71
- **Sm**: usado 150.362 · media ENSDF 150.3647 · PubChem 150.4
- **Yb**: usado 173.0451 · media ENSDF 173.0541 · PubChem 173.05
- **Hf**: usado 178.492 · media ENSDF 178.4850 · PubChem 178.49
- **Os**: usado 190.233 · media ENSDF 190.2249 · PubChem 190.2
- **Pb**: usado 207.21 · media ENSDF 207.2169 · PubChem 207
- **Bh**: usado [278] (isótopo de mayor semivida en ENSDF) · PubChem 270.133
- **Hs**: usado [278] (isótopo de mayor semivida en ENSDF) · PubChem 269.1336
- **Mt**: usado [282] (isótopo de mayor semivida en ENSDF) · PubChem 277.154
- **Rg**: usado [286] (isótopo de mayor semivida en ENSDF) · PubChem 282.169
- **Og**: usado [294] (isótopo de mayor semivida en ENSDF) · PubChem 295.216

## Datos que se muestran como desconocidos

- Mt: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Ds: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Rg: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Cn: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Nh: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Fl: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Mc: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Lv: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Ts: 1ª energía de ionización (NIST no la tiene) → «desconocida»
- Og: 1ª energía de ionización (NIST no la tiene) → «desconocida»

## Espectros NIST

- Elementos con líneas con intensidad relativa: 97
- Con líneas pero sin intensidades (no se muestran): Fr
