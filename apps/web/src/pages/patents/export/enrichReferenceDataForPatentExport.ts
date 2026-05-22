import { partnerApi } from '@/api/partners/partnerApi';
import { userApi } from '@/api/users/userApi';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';
import type { Patent } from '@/types/patent';

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
  return patents
    .map(patent => patent.expected_licensee_partner_id?.trim() ?? '')
    .filter(Boolean);
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

export async function enrichReferenceDataForPatentExport(
  patents: Patent[],
  refs: ReferenceDataForPatents,
): Promise<ReferenceDataForPatents> {
  const [partners, users] = await Promise.all([
    fetchMissingEntities(collectPartnerIds(patents), refs.partners, partnerApi.getPartnerById),
    fetchMissingEntities(collectUserIds(patents), refs.users, userApi.getUserById),
  ]);

  return { ...refs, partners, users };
}
