import { Router } from 'express';
import { z } from 'zod';
import { CreateDeviceSchema, TestRequestSchema } from '../types.js';
import { createDevice, createTest, listDevices, listTests } from './btest-service.js';

export const devicesRouter = Router();

const deviceHandler = async (req, res) => {
  const parsed = CreateDeviceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const device = createDevice({
    name: parsed.data.name,
    host: parsed.data.host,
    port: parsed.data.port,
    username: parsed.data.username,
    password: parsed.data.password,
    useSSL: parsed.data.useSSL,
    notes: parsed.data.notes,
  });

  return res.status(201).json(device);
};

devicesRouter.get('/', (_req, res) => {
  res.json(listDevices());
});

devicesRouter.post('/', deviceHandler);

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

  const result = createTest({
    deviceId: device.id,
    status: 'completed',
    serverAddress: parsed.data.serverAddress,
    direction: parsed.data.direction,
    protocol: parsed.data.protocol,
    durationSeconds: parsed.data.durationSeconds,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    throughputMbps: 325.5,
    jitterMs: 1.4,
    packetLossPercent: 0.3,
    notes: `Test issued against ${device.host}`
  });

  return res.status(201).json({
    status: 'ok',
    test: result,
    device
  });
});
