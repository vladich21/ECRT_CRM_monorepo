import { useMemo } from 'react';
import dayjs from 'dayjs';

import { User } from '@/types/user';

export const useFilteredUsers = (users: User[], filters: Record<string, any>) => {
  const filteredUsers = useMemo(() => {
    if (!users.length) return [];

    return users.filter(user => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          user.first_name?.toLowerCase().includes(searchLower) ||
          user.last_name?.toLowerCase().includes(searchLower) ||
          user.middle_name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      if (filters.department && user.department?.id !== String(filters.department)) {
        return false;
      }

      if (filters.position && user.position?.id !== String(filters.position)) {
        return false;
      }

      if (filters.role && user.roles?.length > 0) {
        const userRoleIds = user.roles.map(role => String(role.id));
        const hasMatchingRole = userRoleIds.includes(String(filters.role));
        if (!hasMatchingRole) return false;
      }

      if (filters.is_active !== undefined && filters.is_active !== '') {
        const filterActive = filters.is_active === 'true';
        if (user.is_active !== filterActive) return false;
      }

      if (filters.created_at) {
        const [startDate, endDate] = filters.created_at;
        const userCreatedAt = dayjs(user.created_at);

        if (startDate && userCreatedAt.isBefore(startDate.startOf('day'))) return false;
        if (endDate && userCreatedAt.isAfter(endDate.endOf('day'))) return false;
      }

      return true;
    });
  }, [users, filters]);

  return filteredUsers;
};
