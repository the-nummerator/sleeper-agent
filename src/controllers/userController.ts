import { Request, Response, NextFunction } from 'express';
import { User } from '../types/user';

const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
];

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    
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
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      const error = new Error('Name and email are required');
      (error as any).status = 400;
      return next(error);
    }

    const newUser: User = {
      id: (users.length + 1).toString(),
      name,
      email
    };

    users.push(newUser);

    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};