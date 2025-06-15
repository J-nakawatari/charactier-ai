declare namespace Express {
  interface User {
    _id: string;
    name: string;
    email: string;
    tokenBalance: number;
    selectedCharacter?: string;
  }
  interface Request {
    user?: User;
  }
}