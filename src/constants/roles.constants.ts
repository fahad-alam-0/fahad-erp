export enum UserRole {
  OWNER = 'OWNER',
  TECHNICIAN = 'TECHNICIAN',
  STAFF = 'STAFF',
}

export const USER_ROLES = [UserRole.OWNER, UserRole.TECHNICIAN, UserRole.STAFF] as const;
