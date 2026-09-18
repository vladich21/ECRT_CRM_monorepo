import { Body } from "@nestjs/common";

/**
 * Полезная нагрузка запроса. Фронт заворачивает тело в `{ body: ... }`
 * (перехватчик axios в apps/web/src/api/clients.ts), поэтому контроллеры читают
 * не всё тело, а его поле `body`.
 *
 * Это обёртка над `@Body('body')`, а не свой параметр-декоратор: валидация DTO
 * и пайпы работают ровно так же, а забыть про вложенность уже нельзя — однажды
 * из-за `@Body()` вместо `@Body('body')` три ручки SVN молча получали пустой dto.
 */
export const BodyPayload = (): ParameterDecorator => Body("body");
