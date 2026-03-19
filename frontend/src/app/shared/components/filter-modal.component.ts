import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-modal" *ngIf="open">
      <div class="filter-modal__backdrop" (click)="close.emit()"></div>

      <section class="filter-modal__sheet">
        <header>
          <div>
            <span class="eyebrow">Filtros</span>
            <h2>Refine sua busca</h2>
          </div>
          <button type="button" class="ghost" (click)="close.emit()">Fechar</button>
        </header>

        <label>
          <span>Categoria</span>
          <select [(ngModel)]="draft.category">
            <option value="">Todas</option>
            <option value="ECONOMY">Econômico</option>
            <option value="HATCH">Hatch</option>
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="PICKUP">Pickup</option>
            <option value="VAN">Van</option>
            <option value="LUXURY">Luxo</option>
          </select>
        </label>

        <div class="filter-modal__grid">
          <label>
            <span>Preço mínimo</span>
            <input [(ngModel)]="draft.minPrice" type="number" />
          </label>

          <label>
            <span>Preço máximo</span>
            <input [(ngModel)]="draft.maxPrice" type="number" />
          </label>
        </div>

        <footer>
          <button type="button" class="btn btn-secondary" (click)="reset()">
            Limpar
          </button>
          <button type="button" class="btn btn-primary" (click)="apply.emit(draft)">
            Aplicar
          </button>
        </footer>
      </section>
    </div>
  `,
  styles: [
    `
      .filter-modal {
        position: fixed;
        inset: 0;
        z-index: 40;
      }

      .filter-modal__backdrop {
        position: absolute;
        inset: 0;
        background: rgba(18, 34, 55, 0.22);
        backdrop-filter: blur(6px);
      }

      .filter-modal__sheet {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: grid;
        gap: 18px;
        padding: 24px 20px 28px;
        border-radius: 32px 32px 0 0;
        background: rgba(255, 255, 255, 0.99);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
      }

      header,
      footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      h2,
      .eyebrow {
        margin: 0;
      }

      .eyebrow {
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      label {
        display: grid;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
      }

      select,
      input {
        width: 100%;
        min-width: 0;
        height: 46px;
        border-radius: 18px;
        border: 1px solid var(--glass-border-soft);
        padding: 0 14px;
        font: inherit;
        background: var(--surface-muted);
      }

      .filter-modal__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .ghost {
        border: 0;
        background: transparent;
        color: var(--text-secondary);
        font: inherit;
      }

      footer {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      @media (max-width: 480px) {
        .filter-modal__grid,
        footer {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class FilterModalComponent {
  @Input() open = false;
  @Input() set filters(value: { category?: string; minPrice?: string; maxPrice?: string }) {
    this.draft = { ...value };
  }

  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<{
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }>();

  protected draft: { category?: string; minPrice?: string; maxPrice?: string } = {};

  reset() {
    this.draft = {};
    this.apply.emit(this.draft);
  }
}
