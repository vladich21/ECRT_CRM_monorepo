import { DepartmentRefDto } from './department-ref.dto';
import { PositionRefDto } from './position-ref.dto';
import { RoleRefDto } from './role-ref.dto';
import { SupervisorRefDto } from './supervisor-ref.dto';

export class UserResponseDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department: DepartmentRefDto;
  position: PositionRefDto;
  roles: RoleRefDto[];
  /** HR / синхронизация */
  external_user_id: string | null;
  personnel_number: string | null;
  hired_at: string | null;
  quit_date: string | null;
  internal_phone: string | null;
  /** Абсолютный URL аватара (если задан EXTERNAL_HR_ASSET_BASE_URL) */
  avatar_url: string | null;
  supervisor: SupervisorRefDto | null;
}
