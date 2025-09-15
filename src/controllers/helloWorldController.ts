import { Request, Response, NextFunction } from 'express';

export class HelloWorldController {

  sayHelloWorld(req: Request, res: Response, next: NextFunction){
    
    console.log("Saying hello world");
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