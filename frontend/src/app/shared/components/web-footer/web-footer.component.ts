import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-web-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './web-footer.component.html',
  styleUrls: ['./web-footer.component.scss'],
})
export class WebFooterComponent {}
