export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count?: {
    lectures: number;
    quizAttempts: number;
    conceptMasteries: number;
    revisionTasks: number;
  };
}

export interface AuthResponse {
  message?: string;
  user: User;
  token?: string;
  error?: string;
}
