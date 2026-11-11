import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { testsRouter } from './routes/tests.js';
import { devicesRouter } from './routes/devices.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mtik-linktest-backend', timestamp: new Date().toISOString() });
});

app.use('/api/tests', testsRouter);
app.use('/api/devices', devicesRouter);

app.listen(config.port, () => {
  console.log(`MTIK-LinkTest backend listening on http://localhost:${config.port}`);
});
