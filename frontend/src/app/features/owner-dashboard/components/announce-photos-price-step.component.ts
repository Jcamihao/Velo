import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-announce-photos-price-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announce-photos-price-step.component.html',
})
export class AnnouncePhotosPriceStepComponent {
  @Input({ required: true }) owner!: any;
}
