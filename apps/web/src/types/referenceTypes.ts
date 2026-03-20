export interface Reference {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  short_name: string;
  is_active: boolean;
  manager_id: string;
  parent_id: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  code: string | number;
  name: string;
  short_name: string;
  description: string;
  start_date: string;
  end_date: string;
  manager_id: string;
  /** Автор записи (UUID), если приходит с API */
  created_by?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
