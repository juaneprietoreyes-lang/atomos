import { describe, expect, it } from 'vitest';
import { makeRound } from '../../src/game/questions';
import { mulberry32 } from '../../src/physics/random';

describe('preguntas del modo juego', () => {
  for (const level of ['sencillo', 'completo'] as const) {
    it(`nivel ${level}: 400 preguntas bien formadas`, () => {
      const qs = makeRound(level, 400, mulberry32(level.length * 7919));
      const kinds = new Set<string>();
      for (const q of qs) {
        kinds.add(q.kind);
        expect(q.prompt.length).toBeGreaterThan(10);
        expect(q.explain.length).toBeGreaterThan(10);
        if (q.answer.type === 'table') {
          expect(q.answer.z).toBeGreaterThanOrEqual(1);
          expect(q.answer.z).toBeLessThanOrEqual(118);
          expect(q.view.hideIdentity).toBe(true);
        } else {
          const { options, correct } = q.answer;
          expect(options.length).toBeGreaterThanOrEqual(2);
          expect(new Set(options).size, q.prompt).toBe(options.length);
          expect(correct).toBeGreaterThanOrEqual(0);
          expect(correct).toBeLessThan(options.length);
        }
      }
      if (level === 'sencillo') expect([...kinds].sort()).toEqual(['buscar', 'estable', 'iones', 'neutrones', 'protones', 'tipo']);
      else expect(kinds.size).toBe(10);
    });
  }

  it('las respuestas numéricas son correctas: N = A − Z y electrones = Z − carga', () => {
    const qs = makeRound('sencillo', 300, mulberry32(42));
    for (const q of qs) {
      if (q.answer.type !== 'choice') continue;
      const answer = q.answer.options[q.answer.correct];
      if (q.kind === 'neutrones') {
        const m = /tiene Z = (\d+) protones: N = (\d+) − \d+ = (\d+)/.exec(q.explain)!;
        expect(Number(answer)).toBe(Number(m[2]) - Number(m[1]));
        expect(q.view.neutrons).toBe(Number(answer));
      }
      if (q.kind === 'iones') expect(Number(answer)).toBe(q.view.z! - q.view.charge!);
    }
  });

  it('no repite el mismo tipo de pregunta dos veces seguidas', () => {
    const qs = makeRound('completo', 200, mulberry32(7));
    for (let i = 1; i < qs.length; i++) expect(qs[i].kind).not.toBe(qs[i - 1].kind);
  });
});
