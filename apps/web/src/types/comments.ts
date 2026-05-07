import { MyFile } from './files';

export interface Comment {
  id: string;
  parent_id: string | null;
  entity_type: string;
  entity_id: string;
  message: string;
  html: string;
  mention_ids: Array<string>;
  files: Array<MyFile>;
  created_by: string;
  created_by_fio?: string;
  created_by_avatar?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type PreparedComment = Omit<Comment, 'parent_id'> & {
  comments?: PreparedComment[];
};

export interface CommentWithLevel extends Comment {
  level: number;
}
