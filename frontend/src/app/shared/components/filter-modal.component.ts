import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type FilterDraft = {
  vehicleType: string;
  category: string;
  motorcycleStyle: string;
  minEngineCc: string;
  maxEngineCc: string;
  minPrice: string;
  maxPrice: string;
  radiusKm: string;
};

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
          <span>Tipo de veículo</span>
          <select [(ngModel)]="draft.vehicleType" (ngModelChange)="onVehicleTypeChange()">
            <option value="">Todos</option>
            <option value="CAR">Carro</option>
            <option value="MOTORCYCLE">Moto</option>
          </select>
        </label>

        <label>
          <span>Categoria</span>
          <select
            [(ngModel)]="draft.category"
            [disabled]="draft.vehicleType === 'MOTORCYCLE'"
          >
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

        <div class="filter-modal__grid" *ngIf="draft.vehicleType === 'MOTORCYCLE'">
          <label>
            <span>Estilo</span>
            <select [(ngModel)]="draft.motorcycleStyle">
              <option value="">Todos</option>
              <option value="SCOOTER">Scooter</option>
              <option value="STREET">Street</option>
              <option value="SPORT">Sport</option>
              <option value="TRAIL">Trail</option>
              <option value="CUSTOM">Custom</option>
              <option value="TOURING">Touring</option>
            </select>
          </label>

          <label>
            <span>Raio (km)</span>
            <input [(ngModel)]="draft.radiusKm" type="number" min="1" />
          </label>
        </div>

        <div class="filter-modal__grid" *ngIf="draft.vehicleType === 'MOTORCYCLE'">
          <label>
            <span>Cilindrada mín.</span>
            <input [(ngModel)]="draft.minEngineCc" type="number" min="50" />
          </label>

          <label>
            <span>Cilindrada máx.</span>
            <input [(ngModel)]="draft.maxEngineCc" type="number" min="50" />
          </label>
        </div>

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

        <label *ngIf="draft.vehicleType !== 'MOTORCYCLE'">
          <span>Raio (km)</span>
          <input [(ngModel)]="draft.radiusKm" type="number" min="1" placeholder="Use com Minha localização" />
        </label>

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
        background: rgba(36, 49, 45, 0.18);
      }

      .filter-modal__sheet {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: grid;
        gap: 18px;
        max-height: min(100dvh, 760px);
        overflow-y: auto;
        padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
        border-radius: 32px 32px 0 0;
        background: rgba(251, 253, 252, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
      }

      header,
      footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
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
        background: rgba(255, 255, 255, 0.94);
      }

      .filter-modal__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
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
        grid-template-columns: minmax(0, 1fr);
        position: sticky;
        bottom: calc(-20px - env(safe-area-inset-bottom, 0px));
        padding-top: 4px;
        padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
        background: linear-gradient(180deg, rgba(251, 253, 252, 0), rgba(251, 253, 252, 0.98) 32%);
      }

      @media (min-width: 481px) {
        .filter-modal__grid,
        footer {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class FilterModalComponent {
  @Input() open = false;
  @Input() set filters(value: Partial<FilterDraft>) {
    this.draft = {
      ...this.createDraft(),
      ...value,
    };
  }

  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<FilterDraft>();

  protected draft: FilterDraft = this.createDraft();

  reset() {
    this.draft = this.createDraft();
    this.apply.emit(this.draft);
  }

  protected onVehicleTypeChange() {
    if (this.draft.vehicleType === 'MOTORCYCLE') {
      this.draft.category = '';
      return;
    }

    this.draft.motorcycleStyle = '';
    this.draft.minEngineCc = '';
    this.draft.maxEngineCc = '';
  }

  private createDraft(): FilterDraft {
    return {
      vehicleType: '',
      category: '',
      motorcycleStyle: '',
      minEngineCc: '',
      maxEngineCc: '',
      minPrice: '',
      maxPrice: '',
      radiusKm: '',
    };
  }
}
