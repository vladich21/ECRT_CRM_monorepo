export interface Reference {
  id: string;
  name: string;
  short_name?: string;
  inn?: string;
}
export interface Department {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
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
  purchaser_id?: string | null;
  created_by?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}
