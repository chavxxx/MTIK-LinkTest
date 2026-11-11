import { Router } from 'express';
import { TestRequestSchema } from '../types.js';
import { createTest, getDevice, listTests, updateTest } from '../services/btest-service.js';
import { MikroTikBandwidthService } from '../services/mikrotik-service.js';

export const testsRouter = Router();
const bandwidthService = new MikroTikBandwidthService();
const activeDevices = new Set<string>();

testsRouter.get('/', (_req, res) => {
  res.json(listTests());
});

testsRouter.post('/', async (req, res) => {
  const parsed = TestRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const device = getDevice(parsed.data.deviceId);
  if (!device) return res.status(404).json({ error: 'MikroTik device not found.' });
  if (activeDevices.has(device.id)) return res.status(409).json({ error: 'A bandwidth test is already running on this device.' });

  activeDevices.add(device.id);
  const startedAt = new Date().toISOString();
  const record = createTest({
    deviceId: device.id,
    deviceName: device.name,
    status: 'running',
    serverAddress: parsed.data.serverAddress,
    direction: parsed.data.direction,
    protocol: parsed.data.protocol,
    durationSeconds: parsed.data.durationSeconds,
    startedAt
  });

  try {
    const result = await bandwidthService.startTest(device, parsed.data);
    const completed = updateTest(record.id, {
      status: 'completed',
      completedAt: result.completedAt,
      throughputMbps: result.throughputMbps,
      txMbps: result.txMbps,
      rxMbps: result.rxMbps,
      jitterMs: result.jitterMs,
      packetLossPercent: result.packetLossPercent,
      notes: result.notes
    });
    return res.status(201).json(completed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bandwidth test failed.';
    const failed = updateTest(record.id, { status: 'failed', completedAt: new Date().toISOString(), notes: message });
    return res.status(502).json({ error: message, test: failed });
  } finally {
    activeDevices.delete(device.id);
  }
});

