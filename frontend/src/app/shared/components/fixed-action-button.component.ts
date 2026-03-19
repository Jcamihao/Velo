import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-fixed-action-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="fixed-action">
      <div class="fixed-action__copy">
        <small>{{ helper }}</small>
        <strong>{{ label }}</strong>
      </div>
      <div class="fixed-action__actions">
        <button
          *ngIf="secondaryActionLabel"
          type="button"
          class="fixed-action__chat"
          [attr.aria-label]="secondaryActionLabel"
          [attr.title]="secondaryActionLabel"
          (click)="secondaryAction.emit()"
        >
          <span class="material-icons" aria-hidden="true" *ngIf="secondaryActionIcon">
            {{ secondaryActionIcon }}
          </span>
          <span class="fixed-action__badge" *ngIf="secondaryBadgeLabel">
            {{ secondaryBadgeLabel }}
          </span>
        </button>

        <button type="button" class="btn btn-primary fixed-action__primary" (click)="action.emit()">
          <span
            class="material-icons"
            aria-hidden="true"
            *ngIf="actionIcon"
            >{{ actionIcon }}</span
          >
          <span>{{ actionLabel }}</span>
        </button>
      </div>
    </aside>
  `,
  styles: [
    `
      .fixed-action {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: calc(70px + env(safe-area-inset-bottom, 0px));
        z-index: 22;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        box-shadow: 0 18px 36px rgba(28, 17, 18, 0.14);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        animation: fixed-action-enter 420ms cubic-bezier(0.22, 1, 0.36, 1)
          both;
      }

      .fixed-action__copy {
        min-width: 0;
      }

      .fixed-action__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex: 1;
      }

      small {
        display: block;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      strong {
        font-size: 16px;
        color: var(--primary);
      }

      .btn {
        min-width: 152px;
        border-radius: 16px;
        animation: fixed-action-control-enter 480ms
          cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
      }

      .fixed-action__primary {
        min-width: 184px;
        box-shadow: 0 16px 26px rgba(255, 59, 48, 0.24);
      }

      .fixed-action__primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .fixed-action__primary .material-icons {
        font-size: 20px;
      }

      .fixed-action__chat {
        position: relative;
        width: 56px;
        height: 56px;
        border: 1px solid var(--glass-border);
        border-radius: 50%;
        background: #ffffff;
        color: var(--primary);
        box-shadow: 0 14px 24px rgba(28, 17, 18, 0.1);
        flex-shrink: 0;
        animation: fixed-action-control-enter 480ms
          cubic-bezier(0.22, 1, 0.36, 1) 140ms both;
      }

      .fixed-action__chat .material-icons {
        font-size: 22px;
      }

      .fixed-action__badge {
        position: absolute;
        top: -4px;
        right: -2px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        background: linear-gradient(180deg, #ff6f61 0%, #ef4444 100%);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 10px 18px rgba(239, 68, 68, 0.24);
      }

      @keyframes fixed-action-enter {
        from {
          opacity: 0;
          transform: translateY(24px) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes fixed-action-control-enter {
        from {
          opacity: 0;
          transform: translateY(16px) scale(0.96);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .fixed-action,
        .btn,
        .fixed-action__chat {
          animation: none;
        }
      }

      @media (max-width: 480px) {
        .fixed-action {
          align-items: stretch;
          flex-direction: column;
          bottom: calc(72px + env(safe-area-inset-bottom, 0px));
        }

        .fixed-action__actions {
          width: 100%;
        }

        .fixed-action__primary {
          min-width: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class FixedActionButtonComponent {
  @Input() helper = 'Pronto para seguir?';
  @Input() label = 'Continue';
  @Input() actionLabel = 'Avançar';
  @Input() actionIcon = 'arrow_forward';
  @Input() secondaryActionLabel?: string;
  @Input() secondaryActionIcon = 'chat_bubble';
  @Input() secondaryBadgeCount = 0;
  @Output() action = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  get secondaryBadgeLabel() {
    if (!this.secondaryBadgeCount) {
      return '';
    }

    return this.secondaryBadgeCount > 99
      ? '99+'
      : String(this.secondaryBadgeCount);
  }
}
