import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import activitiesRoutes from './routes/activities'
import synthesisRoutes from './routes/synthesis'
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

// AI synthesis route gated behind an env variable, defaulting to
// disabled. This lets the feature exist fully in the codebase/git history
// while never actually running in a deployed environment unless
// ENABLE_AI_SYNTHESIS=true is explicitly set there.
if (process.env.ENABLE_AI_SYNTHESIS === 'true') {
  app.use('/synthesis', synthesisRoutes);
  console.log('AI synthesis route enabled');
} else {
  console.log('AI synthesis route disabled (set ENABLE_AI_SYNTHESIS=true to enable)');
}

app.listen(PORT, () => {
  console.log(`Stryde server running on port ${PORT}`);
});
