import { Request, Response, NextFunction } from 'express';
import { User } from '../types/user';

export class UserController {
  private static users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
  ];

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        success: true,
        data: UserController.users,
        count: UserController.users.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = UserController.users.find(u => u.id === id);
      
      if (!user) {
        const error = new Error('User not found');
        (error as any).status = 404;
        return next(error);
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        const error = new Error('Name and email are required');
        (error as any).status = 400;
        return next(error);
      }

      const newUser: User = {
        id: (UserController.users.length + 1).toString(),
        name,
        email
      };

      UserController.users.push(newUser);

      res.status(201).json({
        success: true,
        data: newUser
      });
    } catch (error) {
      next(error);
    }
  }
}