import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { patents, users } from '../../../database/schema';
import {
  swItemPatents,
  swItems,
  swRefElementTypes,
  swRefResponsibilityRoles,
  swStructureElements,
  swStructureResponsibles,
  swDocuments,
} from '../sw-registry.schema';
import type { AddStructureResponsibleDto, CreateStructureElementDto, UpdateStructureElementDto } from '../dto/sw-registry.dto';
import { formatPersonName, isPgUniqueViolation } from '../sw-registry.util';

type ElementRow = typeof swStructureElements.$inferSelect;

@Injectable()
export class SwStructureService {
  constructor(private readonly db: DatabaseService) {}

  async listTree(parentId?: string, recordState = 'active') {
    const rows = await this.db.db.select().from(swStructureElements);
    const visible = rows.filter((r) => r.recordState !== 'deleted' && (recordState === 'all' || r.recordState === recordState));
    const byParent = new Map<string | null, ElementRow[]>();
    for (const row of visible) {
      const key = row.parentId;
      const list = byParent.get(key) ?? [];
      list.push(row);
      byParent.set(key, list);
    }
    const elementIds = visible.map((r) => r.id);
    const responsibles = elementIds.length
      ? await this.db.db
          .select({
            elementId: swStructureResponsibles.elementId,
            userId: swStructureResponsibles.userId,
            roleCode: swStructureResponsibles.roleCode,
            lastName: users.lastName,
            firstName: users.firstName,
            middleName: users.middleName,
          })
          .from(swStructureResponsibles)
          .innerJoin(users, eq(users.id, swStructureResponsibles.userId))
          .where(inArray(swStructureResponsibles.elementId, elementIds))
      : [];
    const respByElement = new Map<string, typeof responsibles>();
    for (const r of responsibles) {
      const list = respByElement.get(r.elementId) ?? [];
      list.push(r);
      respByElement.set(r.elementId, list);
    }

    const mapNode = (row: ElementRow): Record<string, unknown> => {
      const children = (byParent.get(row.id) ?? []).map(mapNode);
      const resp = (respByElement.get(row.id) ?? []).map((x) => ({
        userId: x.userId,
        roleCode: x.roleCode,
        name: formatPersonName({ ...x, id: x.userId }),
      }));
      return {
        id: row.id,
        parentId: row.parentId,
        elementTypeCode: row.elementTypeCode,
        code: row.code,
        name: row.name,
        description: row.description,
        recordState: row.recordState,
        archivedByCascade: row.archivedByCascade,
        responsibles: resp,
        children,
      };
    };

    if (parentId) {
      const root = visible.find((r) => r.id === parentId);
      if (!root) throw new NotFoundException('Элемент структуры не найден');
      return mapNode(root);
    }
    return (byParent.get(null) ?? []).map(mapNode);
  }

  async create(dto: CreateStructureElementDto, userId?: string) {
    await this.assertType(dto.elementTypeCode);
    if (dto.parentId) {
      const parent = await this.requireElement(dto.parentId);
      if (parent.recordState !== 'active') {
        throw new UnprocessableEntityException('Нельзя создать элемент на архивном или удалённом родителе');
      }
    }
    try {
      const [row] = await this.db.db
        .insert(swStructureElements)
        .values({
          parentId: dto.parentId ?? null,
          elementTypeCode: dto.elementTypeCode,
          code: dto.code.trim(),
          name: dto.name.trim(),
          description: dto.description ?? null,
          createdBy: userId ?? null,
        })
        .returning();
      return this.toDto(row);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'CODE_TAKEN', message: 'Код элемента уже занят у этого родителя' });
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateStructureElementDto, userId?: string) {
    const current = await this.requireElement(id);
    if (dto.elementTypeCode) await this.assertType(dto.elementTypeCode);
    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException({ code: 'CYCLE', message: 'Элемент не может быть родителем самому себе' });
      }
      if (dto.parentId) {
        const parent = await this.requireElement(dto.parentId);
        if (parent.recordState !== 'active') {
          throw new UnprocessableEntityException('Родитель в архиве или удалён');
        }
        const descendantIds = await this.collectDescendantIds(id);
        if (descendantIds.has(dto.parentId)) {
          throw new ConflictException({ code: 'CYCLE', message: 'Нельзя выбрать потомка родителем — цикл' });
        }
      }
    }
    try {
      const [row] = await this.db.db
        .update(swStructureElements)
        .set({
          parentId: dto.parentId !== undefined ? dto.parentId : current.parentId,
          elementTypeCode: dto.elementTypeCode ?? current.elementTypeCode,
          code: dto.code?.trim() ?? current.code,
          name: dto.name?.trim() ?? current.name,
          description: dto.description !== undefined ? dto.description : current.description,
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(swStructureElements.id, id))
        .returning();
      return this.toDto(row);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'CODE_TAKEN', message: 'Код элемента уже занят у этого родителя' });
      }
      throw err;
    }
  }

  async archive(id: string) {
    const root = await this.requireElement(id);
    if (root.recordState === 'deleted') throw new NotFoundException('Элемент структуры не найден');
    const ids = [id, ...[...(await this.collectDescendantIds(id))]];
    await this.db.db
      .update(swStructureElements)
      .set({ recordState: 'archived', archivedByCascade: false, updatedAt: new Date() })
      .where(eq(swStructureElements.id, id));
    const childIds = ids.filter((x) => x !== id);
    if (childIds.length) {
      await this.db.db
        .update(swStructureElements)
        .set({ recordState: 'archived', archivedByCascade: true, updatedAt: new Date() })
        .where(and(inArray(swStructureElements.id, childIds), eq(swStructureElements.recordState, 'active')));
    }
    await this.db.db
      .update(swItems)
      .set({ recordState: 'archived', archivedByCascade: true, updatedAt: new Date() })
      .where(and(inArray(swItems.elementId, ids), eq(swItems.recordState, 'active')));
    const itemRows = await this.db.db
      .select({ id: swItems.id })
      .from(swItems)
      .where(inArray(swItems.elementId, ids));
    const itemIds = itemRows.map((r) => r.id);
    if (itemIds.length) {
      await this.db.db
        .update(swDocuments)
        .set({ recordState: 'archived', archivedByCascade: true, updatedAt: new Date() })
        .where(and(inArray(swDocuments.softwareId, itemIds), eq(swDocuments.recordState, 'active')));
    }
    return { id, archivedIds: ids };
  }

  async restore(id: string) {
    const root = await this.requireElement(id);
    if (root.recordState === 'deleted') throw new NotFoundException('Элемент структуры не найден');
    const descendantIds = [...(await this.collectDescendantIds(id))];
    await this.db.db
      .update(swStructureElements)
      .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
      .where(eq(swStructureElements.id, id));
    if (descendantIds.length) {
      await this.db.db
        .update(swStructureElements)
        .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
        .where(
          and(
            inArray(swStructureElements.id, descendantIds),
            eq(swStructureElements.recordState, 'archived'),
            eq(swStructureElements.archivedByCascade, true),
          ),
        );
    }
    const restoredElementIds = [id, ...descendantIds];
    await this.db.db
      .update(swItems)
      .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
      .where(
        and(
          inArray(swItems.elementId, restoredElementIds),
          eq(swItems.recordState, 'archived'),
          eq(swItems.archivedByCascade, true),
        ),
      );
    const itemRows = await this.db.db
      .select({ id: swItems.id })
      .from(swItems)
      .where(inArray(swItems.elementId, restoredElementIds));
    const itemIds = itemRows.map((r) => r.id);
    if (itemIds.length) {
      await this.db.db
        .update(swDocuments)
        .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
        .where(
          and(
            inArray(swDocuments.softwareId, itemIds),
            eq(swDocuments.recordState, 'archived'),
            eq(swDocuments.archivedByCascade, true),
          ),
        );
    }
    return { id, restored: true };
  }

  async markDeleted(id: string) {
    const root = await this.requireElement(id);
    if (root.recordState === 'deleted') throw new NotFoundException('Элемент структуры не найден');
    const ids = [id, ...[...(await this.collectDescendantIds(id))]];
    await this.db.db
      .update(swStructureElements)
      .set({ recordState: 'deleted', updatedAt: new Date() })
      .where(and(inArray(swStructureElements.id, ids), ne(swStructureElements.recordState, 'deleted')));
    await this.db.db
      .update(swItems)
      .set({ recordState: 'deleted', updatedAt: new Date() })
      .where(and(inArray(swItems.elementId, ids), ne(swItems.recordState, 'deleted')));
    const itemRows = await this.db.db
      .select({ id: swItems.id })
      .from(swItems)
      .where(inArray(swItems.elementId, ids));
    const itemIds = itemRows.map((r) => r.id);
    if (itemIds.length) {
      await this.db.db
        .update(swDocuments)
        .set({ recordState: 'deleted', updatedAt: new Date() })
        .where(and(inArray(swDocuments.softwareId, itemIds), ne(swDocuments.recordState, 'deleted')));
    }
    return { id, deletedIds: ids };
  }

  async addResponsible(elementId: string, dto: AddStructureResponsibleDto) {
    await this.requireElement(elementId);
    const [role] = await this.db.db
      .select()
      .from(swRefResponsibilityRoles)
      .where(eq(swRefResponsibilityRoles.code, dto.roleCode))
      .limit(1);
    if (!role?.isActive) throw new UnprocessableEntityException('Роль ответственности неизвестна или выключена');
    const [user] = await this.db.db.select().from(users).where(eq(users.id, dto.userId)).limit(1);
    if (!user || user.isActive === false) throw new UnprocessableEntityException('Пользователь не найден или неактивен');
    try {
      const [row] = await this.db.db
        .insert(swStructureResponsibles)
        .values({ elementId, userId: dto.userId, roleCode: dto.roleCode })
        .returning();
      return { userId: row.userId, roleCode: row.roleCode, name: formatPersonName(user) };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'RESPONSIBLE_EXISTS', message: 'Сотрудник уже закреплён в этой роли' });
      }
      throw err;
    }
  }

  async removeResponsible(elementId: string, userId: string, roleCode: string) {
    await this.requireElement(elementId);
    await this.db.db
      .delete(swStructureResponsibles)
      .where(
        and(
          eq(swStructureResponsibles.elementId, elementId),
          eq(swStructureResponsibles.userId, userId),
          eq(swStructureResponsibles.roleCode, roleCode),
        ),
      );
  }

  async requireActiveElement(id: string) {
    const row = await this.requireElement(id);
    if (row.recordState !== 'active') {
      throw new UnprocessableEntityException('Элемент в архиве или удалён');
    }
    return row;
  }

  async descendantIdsIncluding(id: string): Promise<string[]> {
    return [id, ...[...(await this.collectDescendantIds(id))]];
  }

  /** Связи РИД программ, привязанных к элементу (без каскада по поддереву). */
  async listPatentLinksForElement(elementId: string) {
    await this.requireElement(elementId);
    const rows = await this.db.db
      .select({
        id: swItemPatents.id,
        patentId: swItemPatents.patentId,
        comment: swItemPatents.comment,
        createdAt: swItemPatents.createdAt,
        softwareId: swItems.id,
        designation: swItems.designation,
        shortName: swItems.shortName,
        patentName: patents.name,
        registrationNumber: patents.registrationNumber,
        applicationNumber: patents.applicationNumber,
        kdNumber: patents.kdNumber,
        isDeleted: patents.isDeleted,
      })
      .from(swItemPatents)
      .innerJoin(swItems, eq(swItems.id, swItemPatents.softwareId))
      .innerJoin(patents, eq(patents.id, swItemPatents.patentId))
      .where(and(eq(swItems.elementId, elementId), ne(swItems.recordState, 'deleted')))
      .orderBy(asc(swItems.designation), asc(swItemPatents.createdAt));

    return rows.map((r) => ({
      id: r.id,
      patentId: r.patentId,
      comment: r.comment,
      createdAt: r.createdAt,
      software: {
        id: r.softwareId,
        designation: r.designation,
        shortName: r.shortName,
      },
      patent: {
        id: r.patentId,
        name: r.patentName,
        registrationNumber: r.registrationNumber,
        applicationNumber: r.applicationNumber,
        kdNumber: r.kdNumber,
        isDeleted: r.isDeleted,
      },
    }));
  }

  private async requireElement(id: string) {
    const [row] = await this.db.db.select().from(swStructureElements).where(eq(swStructureElements.id, id)).limit(1);
    if (!row || row.recordState === 'deleted') throw new NotFoundException('Элемент структуры не найден');
    return row;
  }

  private async assertType(code: string) {
    const [row] = await this.db.db.select().from(swRefElementTypes).where(eq(swRefElementTypes.code, code)).limit(1);
    if (!row?.isActive) throw new UnprocessableEntityException('Тип элемента неизвестен или выключен');
  }

  private async collectDescendantIds(rootId: string): Promise<Set<string>> {
    const rows = await this.db.db
      .select({ id: swStructureElements.id, parentId: swStructureElements.parentId })
      .from(swStructureElements)
      .where(ne(swStructureElements.recordState, 'deleted'));
    const children = new Map<string, string[]>();
    for (const r of rows) {
      if (!r.parentId) continue;
      const list = children.get(r.parentId) ?? [];
      list.push(r.id);
      children.set(r.parentId, list);
    }
    const out = new Set<string>();
    const walk = (id: string) => {
      for (const child of children.get(id) ?? []) {
        if (out.has(child)) continue;
        out.add(child);
        walk(child);
      }
    };
    walk(rootId);
    return out;
  }

  private toDto(row: ElementRow) {
    return {
      id: row.id,
      parentId: row.parentId,
      elementTypeCode: row.elementTypeCode,
      code: row.code,
      name: row.name,
      description: row.description,
      recordState: row.recordState,
      archivedByCascade: row.archivedByCascade,
    };
  }
}
