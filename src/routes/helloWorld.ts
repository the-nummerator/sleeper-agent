import { Router } from 'express';
import { HelloWorldController } from '../controllers/helloWorldController';

const router = Router();
const helloWorldController = new HelloWorldController();

router.get('/', helloWorldController.sayHelloWorld.bind(helloWorldController));
//router.get('/:id', );
//router.post('/', );

export default router;