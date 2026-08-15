import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-care-network-tabs',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './care-network-tabs.html',
  styleUrl: './care-network-tabs.css',
})
export class CareNetworkTabs {}
