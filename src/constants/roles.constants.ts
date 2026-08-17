export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  STAFF = 'STAFF',
}

export const USER_ROLES = [UserRole.OWNER, UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.STAFF] as const;
