import { makeRound, type Question } from '../game/questions';
import type { AppState, Level } from '../state';
import { escapeHtml } from './format';
import type { PeriodicTable } from './periodic-table';

const ROUND = 10;

const recordKey = (level: Level) => `atomos-record-${level}`;

function readRecord(level: Level): number {
  try {
    return Number(localStorage.getItem(recordKey(level)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveRecord(level: Level, value: number): void {
  try {
    localStorage.setItem(recordKey(level), String(value));
  } catch {
    // Sin almacenamiento (modo privado): el récord dura solo esta partida
  }
}

export interface GameHost {
  level(): Level;
  /** Pone el visor como pide la pregunta */
  apply(view: Partial<AppState>): void;
  /** Vuelve al estado de antes de jugar */
  restore(): void;
  /** Se llama al empezar y al terminar (para ocultar o mostrar la ficha) */
  onActiveChange(active: boolean): void;
}

/**
 * Modo juego: rondas de 10 preguntas con puntos, racha y récord. Algunas se
 * contestan tocando la tabla periódica y otras eligiendo una opción.
 */
export class GamePanel {
  active = false;
  private questions: Question[] = [];
  private index = 0;
  private score = 0;
  private streak = 0;
  private bestStreak = 0;
  private answered: { correct: boolean; chosen: number | null } | null = null;
  private level: Level = 'completo';

  constructor(
    private readonly container: HTMLElement,
    private readonly table: PeriodicTable,
    private readonly host: GameHost,
  ) {}

  start(): void {
    this.level = this.host.level();
    this.questions = makeRound(this.level, ROUND);
    this.index = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.answered = null;
    if (!this.active) {
      this.active = true;
      this.host.onActiveChange(true);
    }
    this.show();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.container.hidden = true;
    this.container.innerHTML = '';
    this.host.restore();
    this.host.onActiveChange(false);
  }

  /** Clic en la tabla: si la pregunta se contesta así, la consume */
  answerTable(z: number): boolean {
    if (!this.active) return false;
    const q = this.questions[this.index];
    if (!q || this.answered || q.answer.type !== 'table') return true;
    const correct = z === q.answer.z;
    this.table.flash(z, correct ? 'ok' : 'bad');
    if (!correct) this.table.flash(q.answer.z, 'ok');
    this.resolve(correct, null);
    return true;
  }

  private answerChoice(i: number): void {
    const q = this.questions[this.index];
    if (this.answered || q.answer.type !== 'choice') return;
    this.resolve(i === q.answer.correct, i);
  }

  private resolve(correct: boolean, chosen: number | null): void {
    this.answered = { correct, chosen };
    if (correct) {
      this.score++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else this.streak = 0;
    // Ya se puede ver qué átomo era
    this.host.apply({ hideIdentity: false });
    this.render();
  }

  private next(): void {
    this.index++;
    this.answered = null;
    if (this.index >= this.questions.length) {
      const record = readRecord(this.level);
      if (this.score > record) saveRecord(this.level, this.score);
      this.render();
      return;
    }
    this.show();
  }

  private show(): void {
    const q = this.questions[this.index];
    this.host.apply({ hidden: new Set(), lastPhoton: null, phase: false, model: 'quantum', ...q.view });
    this.render();
  }

  private render(): void {
    this.container.hidden = false;
    if (this.index >= this.questions.length) {
      const record = readRecord(this.level);
      const message =
        this.score === ROUND
          ? '¡Perfecto! Eres un experto en átomos.'
          : this.score >= 7
            ? '¡Muy bien!'
            : this.score >= 4
              ? 'Vas bien: repasa las explicaciones y vuelve a intentarlo.'
              : 'Cada error es una pista: juega otra vez y fíjate en las explicaciones.';
      this.container.innerHTML = `
        <div class="game panel">
          <div class="game-head"><strong>Reto terminado</strong><button type="button" class="btn btn-ghost" data-exit>Salir</button></div>
          <div class="game-final"><span class="game-big">${this.score}/${ROUND}</span>
            <div>${message}<div class="muted">Mejor racha: ${this.bestStreak} · Récord (${this.level}): ${Math.max(record, this.score)}</div></div></div>
          <div class="act-row"><button type="button" class="btn btn-primary" data-again>Jugar otra vez</button></div>
        </div>`;
      this.container.querySelector('[data-again]')!.addEventListener('click', () => this.start());
      this.container.querySelector('[data-exit]')!.addEventListener('click', () => this.exit());
      return;
    }

    const q = this.questions[this.index];
    const a = this.answered;
    const options =
      q.answer.type === 'choice'
        ? `<div class="game-options">${q.answer.options
            .map((o, i) => {
              const state =
                a && q.answer.type === 'choice'
                  ? i === q.answer.correct
                    ? ' is-ok'
                    : i === a.chosen
                      ? ' is-bad'
                      : ''
                  : '';
              return `<button type="button" class="game-opt${state}" data-opt="${i}" ${a ? 'disabled' : ''}>${escapeHtml(o)}</button>`;
            })
            .join('')}</div>`
        : a
          ? ''
          : '<p class="game-hint">👇 Toca el elemento en la tabla periódica.</p>';
    const feedback = a
      ? `<div class="game-feedback ${a.correct ? 'ok' : 'bad'}">
          <strong>${a.correct ? '✓ ¡Correcto!' : '✗ No era eso.'}</strong> ${q.explain}
        </div>
        <div class="act-row"><button type="button" class="btn btn-primary" data-next>${
          this.index + 1 < this.questions.length ? 'Siguiente →' : 'Ver resultado'
        }</button></div>`
      : '';

    this.container.innerHTML = `
      <div class="game panel">
        <div class="game-head">
          <span><strong>Reto</strong> · ${this.index + 1}/${this.questions.length}</span>
          <span class="game-score">⭐ ${this.score}${this.streak >= 2 ? ` · 🔥 ${this.streak}` : ''}</span>
          <button type="button" class="btn btn-ghost" data-exit>Salir</button>
        </div>
        <p class="game-q">${q.prompt}</p>
        ${options}
        ${feedback}
      </div>`;
    this.container.querySelector('[data-exit]')!.addEventListener('click', () => this.exit());
    this.container.querySelector('[data-next]')?.addEventListener('click', () => this.next());
    this.container.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((b) =>
      b.addEventListener('click', () => this.answerChoice(Number(b.dataset.opt))),
    );
    // En móvil la pregunta queda a la vista
    if (!a) this.container.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
