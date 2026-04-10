export interface Department {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Position {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  role_name: string;
}

export interface Supervisor {
  id: string;
  email: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department: Department;
  position: Position;
  roles: Role[];
  external_user_id?: string | null;
  personnel_number?: string | null;
  hired_at?: string | null;
  quit_date?: string | null;
  internal_phone?: string | null;
  avatar_url?: string | null;
  supervisor?: Supervisor | null;
}
