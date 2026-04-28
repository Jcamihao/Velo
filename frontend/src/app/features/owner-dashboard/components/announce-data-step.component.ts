import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-announce-data-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announce-data-step.component.html',
})
export class AnnounceDataStepComponent {
  @Input({ required: true }) owner!: any;
}
