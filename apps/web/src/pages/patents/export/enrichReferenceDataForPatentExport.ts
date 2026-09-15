import { partnerApi } from '@/api/partners/partnerApi';
import { userApi } from '@/api/users/userApi';
import { getPatentExpectedLicensees } from '@/helpers/licenseeEntryHelpers';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';
import type { Patent } from '@/types/patent';
import type { User } from '@/types/user';

const FETCH_CHUNK_SIZE = 20;

async function fetchMissingEntities<T extends { id: string }>(
  ids: string[],
  existing: T[] | undefined,
  fetchOne: (id: string) => Promise<T>,
): Promise<T[]> {
  const existingIds = new Set((existing ?? []).map(item => item.id));
  const missing = [...new Set(ids.filter(id => id.trim() && !existingIds.has(id)))];
  if (missing.length === 0) return existing ?? [];

  const fetched: T[] = [];
  for (let offset = 0; offset < missing.length; offset += FETCH_CHUNK_SIZE) {
    const chunk = missing.slice(offset, offset + FETCH_CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map(id => fetchOne(id)));
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.id) {
        fetched.push(result.value);
      }
    }
  }

  return [...(existing ?? []), ...fetched];
}

function collectPartnerIds(patents: Patent[]): string[] {
  const ids: string[] = [];
  for (const patent of patents) {
    for (const entry of getPatentExpectedLicensees(patent)) {
      const partnerId = entry.partner_id?.trim();
      if (partnerId) ids.push(partnerId);
    }
  }
  return ids;
}

function collectUserIds(patents: Patent[]): string[] {
  const ids: string[] = [];
  for (const patent of patents) {
    const responsibleId = patent.responsible_for_patenting_id?.trim();
    if (responsibleId) ids.push(responsibleId);
    for (const authorId of patent.author_ids ?? []) {
      const trimmed = authorId?.trim();
      if (trimmed) ids.push(trimmed);
    }
  }
  return ids;
}

/**
 * GET /users/:id отдаёт полную карточку без поля name, а справочник users — preview { id, name }.
 * ФИО собираем так же, как бэкенд для preview (Фамилия Имя Отчество, иначе id).
 */
async function fetchUserReference(id: string): Promise<{ id: string; name: string }> {
  const user: User | undefined = await userApi.getUserById(id);
  if (!user?.id) throw new Error(`Пользователь ${id} не найден`);
  const name = [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim();
  return { id: user.id, name: name || user.id };
}

export async function enrichReferenceDataForPatentExport(
  patents: Patent[],
  refs: ReferenceDataForPatents,
): Promise<ReferenceDataForPatents> {
  const [partners, users] = await Promise.all([
    fetchMissingEntities(collectPartnerIds(patents), refs.partners, partnerApi.getPartnerById),
    fetchMissingEntities(collectUserIds(patents), refs.users, fetchUserReference),
  ]);

  return { ...refs, partners, users };
}
