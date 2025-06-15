declare global {
  namespace Express {
    interface User {
      _id: string;
      name: string;
      email: string;
      tokenBalance: number;
      selectedCharacter?: string;
      isAdmin?: boolean;
      role?: string;
    }
    interface Request {
      user?: User;
    }
  }
}

export type AuthRequest = Express.Request;