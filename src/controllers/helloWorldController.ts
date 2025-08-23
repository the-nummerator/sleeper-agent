import { Request, Response, NextFunction } from 'express';

export class HelloWorldController {

  async sayHelloWorld(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        success: true,
        data: 'Hello good world, you are sooooo good loookin'
      });
    } catch (error) {
      next(error);
    }
  }

}