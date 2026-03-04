import { Request } from 'express';

export interface JwtPayload {
  user_id: string;
}

export type RequestWithUser = Request & {
  user?: JwtPayload;
};
