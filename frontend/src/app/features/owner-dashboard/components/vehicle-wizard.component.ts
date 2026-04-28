import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AnnounceConditionsStepComponent } from './announce-conditions-step.component';
import { AnnounceDataStepComponent } from './announce-data-step.component';
import { AnnouncePhotosPriceStepComponent } from './announce-photos-price-step.component';
import { WebHeaderComponent } from '../../../shared/components/web-header/web-header.component';

@Component({
  selector: 'app-vehicle-wizard',
  standalone: true,
  imports: [
    CommonModule,
    AnnounceDataStepComponent,
    AnnouncePhotosPriceStepComponent,
    AnnounceConditionsStepComponent,
    WebHeaderComponent,
  ],
  templateUrl: './vehicle-wizard.component.html',
})
export class VehicleWizardComponent {
  @Input({ required: true }) owner!: any;
}
