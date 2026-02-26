import { DepartmentRefDto } from './department-ref.dto';
import { PositionRefDto } from './position-ref.dto';
import { RoleRefDto } from './role-ref.dto';

export class UserResponseDto {
  id: string;
  login: string;
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
}
