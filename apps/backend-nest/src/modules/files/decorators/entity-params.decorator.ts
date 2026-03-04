import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EntityParamsDto } from '../dto';

export const EntityParams = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EntityParamsDto => {
    const req = ctx.switchToHttp().getRequest<{ params: Record<string, string> }>();
    const { entityType, entityId } = req.params;
    const singular = entityType?.replace(/s$/, '') || entityType || '';
    return { entityType: singular, entityId: entityId ?? '' };
  },
);
