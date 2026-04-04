import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../core/services/compare.service';

@Component({
  selector: 'app-compare-tray',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="compare-tray" *ngIf="compareService.count()">
      <div class="compare-tray__copy">
        <span class="compare-tray__eyebrow">Comparador</span>
        <strong>
          {{ compareService.count() }} veículo{{
            compareService.count() > 1 ? 's' : ''
          }} na mesa
        </strong>
        <div class="compare-tray__chips">
          <button
            type="button"
            class="compare-tray__chip"
            *ngFor="let vehicle of compareService.items(); trackBy: trackById"
            (click)="compareService.remove(vehicle.id)"
          >
            <span>{{ vehicle.brand }} {{ vehicle.model }}</span>
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      <div class="compare-tray__actions">
        <button
          type="button"
          class="btn btn-ghost"
          (click)="compareService.clear()"
        >
          Limpar
        </button>

        <a class="btn btn-primary" routerLink="/compare">
          {{
            compareService.canCompare()
              ? 'Comparar agora'
              : 'Escolha mais 1 veículo'
          }}
        </a>
      </div>
    </section>
  `,
  styles: [
    `
      .compare-tray {
        position: fixed;
        right: 12px;
        bottom: calc(84px + env(safe-area-inset-bottom, 0px));
        left: 12px;
        z-index: 28;
        display: grid;
        gap: 14px;
        padding: 16px;
        border-radius: 24px;
        background: rgba(245, 251, 249, 0.98);
        border: 1px solid rgba(74, 121, 111, 0.16);
        box-shadow: 0 18px 48px rgba(28, 40, 37, 0.18);
      }

      .compare-tray__copy,
      .compare-tray__actions {
        display: grid;
        gap: 10px;
      }

      .compare-tray__eyebrow {
        color: var(--primary);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .compare-tray strong {
        color: var(--text-primary);
        font-size: 18px;
      }

      .compare-tray__chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .compare-tray__chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        padding: 0 12px;
        border: 1px solid rgba(74, 121, 111, 0.14);
        border-radius: 999px;
        background: #ffffff;
        color: var(--text-primary);
        font-size: 12px;
        font-weight: 600;
      }

      .compare-tray__chip .material-icons {
        font-size: 16px;
        color: var(--text-secondary);
      }

      .compare-tray__actions .btn {
        width: 100%;
      }

      @media (min-width: 768px) {
        .compare-tray {
          right: 24px;
          bottom: 28px;
          left: auto;
          max-width: 680px;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
        }

        .compare-tray__actions {
          align-content: end;
        }

        .compare-tray__actions .btn {
          width: auto;
        }
      }
    `,
  ],
})
export class CompareTrayComponent {
  protected readonly compareService = inject(CompareService);

  protected trackById(_index: number, item: { id: string }) {
    return item.id;
  }
}
