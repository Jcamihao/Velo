import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss'],
})
export class ImageGalleryComponent implements OnDestroy {
  @Input() images: Array<{ url: string }> = [];

  protected readonly activeIndex = signal(0);
  protected readonly previewOpen = signal(false);
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

  protected openPreview(index = this.activeIndex()) {
    if (!this.images.length) {
      return;
    }

    this.activeIndex.set(index);
    this.previewOpen.set(true);
    document.body.classList.add('gallery-preview-open');
  }

  protected closePreview() {
    this.previewOpen.set(false);
    document.body.classList.remove('gallery-preview-open');
  }

  ngOnDestroy() {
    document.body.classList.remove('gallery-preview-open');
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboard(event: KeyboardEvent) {
    if (!this.previewOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      this.closePreview();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPreviousImage();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goToNextImage();
    }
  }
}
