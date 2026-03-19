import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="gallery">
      <div class="gallery__hero">
        <button
          type="button"
          class="gallery__nav gallery__nav--prev"
          *ngIf="images.length > 1"
          (click)="goToPreviousImage()"
          aria-label="Ver foto anterior"
        >
          <span class="material-icons" aria-hidden="true">chevron_left</span>
        </button>

        <img
          class="gallery__hero-image"
          [src]="(activeImage() && activeImage()!.url) || fallbackImage"
          alt="Imagem do veículo"
        />

        <button
          type="button"
          class="gallery__nav gallery__nav--next"
          *ngIf="images.length > 1"
          (click)="goToNextImage()"
          aria-label="Ver próxima foto"
        >
          <span class="material-icons" aria-hidden="true">chevron_right</span>
        </button>
      </div>

      <div class="gallery__thumbs">
        <button
          type="button"
          *ngFor="let image of images; let index = index"
          [class.is-active]="activeIndex() === index"
          [style.backgroundImage]="'url(' + image.url + ')'"
          (click)="activeIndex.set(index)"
        ></button>
      </div>
    </section>
  `,
  styles: [
    `
      .gallery {
        display: grid;
        gap: 14px;
      }

      .gallery__hero {
        position: relative;
        min-height: 274px;
        border-radius: 28px;
        overflow: hidden;
        background: linear-gradient(180deg, #ffffff 0%, #f6f0f0 100%);
        border: 1px solid var(--glass-border-soft);
        box-shadow: var(--shadow-soft);
      }

      .gallery__hero-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }

      .gallery__nav {
        position: absolute;
        top: 50%;
        z-index: 2;
        display: inline-grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        color: var(--text-primary);
        box-shadow: 0 12px 22px rgba(34, 23, 24, 0.16);
        transform: translateY(-50%);
      }

      .gallery__nav .material-icons {
        font-size: 24px;
      }

      .gallery__nav--prev {
        left: 12px;
      }

      .gallery__nav--next {
        right: 12px;
      }

      .gallery__thumbs {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 72px;
        gap: 12px;
        overflow-x: auto;
      }

      .gallery__thumbs button {
        min-height: 64px;
        border: 1px solid var(--glass-border-soft);
        border-radius: 16px;
        background-size: cover;
        background-position: center;
        background-color: #fff;
        box-shadow: 0 10px 18px rgba(34, 23, 24, 0.08);
        opacity: 0.7;
      }

      .gallery__thumbs button.is-active {
        opacity: 1;
        outline: 2px solid var(--primary);
        box-shadow: 0 14px 20px rgba(255, 59, 48, 0.16);
      }

      @media (max-width: 480px) {
        .gallery__nav {
          width: 38px;
          height: 38px;
        }

        .gallery__nav--prev {
          left: 10px;
        }

        .gallery__nav--next {
          right: 10px;
        }
      }
    `,
  ],
})
export class ImageGalleryComponent {
  @Input() images: Array<{ url: string }> = [];

  protected readonly activeIndex = signal(0);
  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';

  protected activeImage() {
    return this.images[this.activeIndex()] ?? null;
  }

  protected goToPreviousImage() {
    if (!this.images.length) {
      return;
    }

    const previousIndex =
      (this.activeIndex() - 1 + this.images.length) % this.images.length;
    this.activeIndex.set(previousIndex);
  }

  protected goToNextImage() {
    if (!this.images.length) {
      return;
    }

    const nextIndex = (this.activeIndex() + 1) % this.images.length;
    this.activeIndex.set(nextIndex);
  }
}
