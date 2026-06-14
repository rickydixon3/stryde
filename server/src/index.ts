import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Stryde server is running' });
});

// Authorization route
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Stryde server running on port ${PORT}`);
});



