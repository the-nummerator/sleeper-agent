import { Router } from 'express';
import userRoutes from './users';
import helloWorld from './helloWorld';


const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users'
    }
  });
});

router.use('/users', userRoutes);
router.use('/hello-world', helloWorld);

export default router;