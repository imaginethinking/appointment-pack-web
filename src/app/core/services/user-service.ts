import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import { CreateUserRequest, UserResponse } from '../models/user-model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly usersUrl = environment.apiBaseUrl + '/users';

  constructor(private readonly http: HttpClient) {}

  createUser(request: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.usersUrl, request);
  }
}
