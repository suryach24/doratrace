import express from 'express';
import cors from 'cors';
import path from 'path';
import metricsRouter from './routes/metrics';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json());
app.use('/api', metricsRouter);

// Serve compiled React client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`doratrace running on http://localhost:${PORT}`);
});

export default app;
