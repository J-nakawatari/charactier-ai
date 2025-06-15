import type { IUser } from '../models/UserModel';

declare global {
  namespace Express {
    interface User extends IUser {
      isAdmin?: boolean;
      role?: string;
    }
    interface Request {
      user?: User;
    }
  }
}

export type AuthRequest = Express.Request;
export {};  // 型合成を壊さないために必須