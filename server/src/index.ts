import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import activitiesRoutes from './routes/activities'
import webhooksRoutes from './routes/webhooks'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Stryde server is running' });
});

app.use('/auth', authRoutes);
app.use('/activities', activitiesRoutes);
app.use('/', webhooksRoutes);

app.listen(PORT, () => {
  console.log(`Stryde server running on port ${PORT}`);
});