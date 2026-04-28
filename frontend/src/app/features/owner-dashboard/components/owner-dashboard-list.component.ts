import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WebHeaderComponent } from '../../../shared/components/web-header/web-header.component';

@Component({
  selector: 'app-owner-dashboard-list',
  standalone: true,
  imports: [CommonModule, RouterLink, WebHeaderComponent],
  templateUrl: './owner-dashboard-list.component.html',
})
export class OwnerDashboardListComponent {
  @Input({ required: true }) owner!: any;
}
