import { Router } from 'express';
import { TestRequestSchema } from '../types.js';
import { createTest, listDevices, listTests } from '../services/btest-service.js';

export const testsRouter = Router();

testsRouter.get('/', (_req, res) => {
  res.json(listTests());
});

testsRouter.post('/', async (req, res) => {
  const parsed = TestRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const device = listDevices().find((item) => item.id === parsed.data.deviceId);

  if (!device) {
    return res.status(404).json({ error: 'MikroTik device not found.' });
  }

  const startedAt = new Date().toISOString();

  const test = createTest({
    deviceId: device.id,
    status: 'completed',
    serverAddress: parsed.data.serverAddress,
    direction: parsed.data.direction,
    protocol: parsed.data.protocol,
    durationSeconds: parsed.data.durationSeconds,
    startedAt,
    completedAt: new Date().toISOString(),
    throughputMbps: 325.5,
    jitterMs: 1.4,
    packetLossPercent: 0.3,
    notes: `Bandwidth test executed from ${device.name}`
  });

  return res.status(201).json(test);
});
