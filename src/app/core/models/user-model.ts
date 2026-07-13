export type UserRole = 'PATIENT' | 'CARER';

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
}
