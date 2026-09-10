import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shows a simple message when the current page cannot be accessed.
 */
@Component({
  selector: 'app-access-denied',
  imports: [RouterLink],
  templateUrl: './access-denied.html',
})
export class AccessDenied {}
