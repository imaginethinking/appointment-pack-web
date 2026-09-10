import {Component} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

/**
 * Displays the navigation between patient and carer views of the Care Network.
 */
@Component({
  selector: 'app-care-network-tabs',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './care-network-tabs.html',
})
export class CareNetworkTabs {}
