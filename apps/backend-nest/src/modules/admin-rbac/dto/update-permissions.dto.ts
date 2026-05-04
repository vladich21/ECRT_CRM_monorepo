import { IsObject, IsNotEmpty } from 'class-validator';

/**
 * Контракт PUT /admin/roles/:id/permissions:
 *   { permissions: { 'section.code': { canRead, canEdit, canDelete }, ... } }
 *
 * class-validator не умеет глубоко валидировать Record<string, T>; точная
 * проверка структуры (флаги boolean, существование разделов, нормализация
 * зависимостей delete→edit→read) выполняется в AdminRbacService.
 */
export class UpdatePermissionsDto {
  @IsObject({ message: 'permissions: ожидается объект' })
  @IsNotEmpty({ message: 'permissions: список разделов не может быть пустым' })
  permissions!: Record<string, { canRead: boolean; canEdit: boolean; canDelete: boolean }>;
}
