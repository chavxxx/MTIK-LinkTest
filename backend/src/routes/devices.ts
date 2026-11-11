import { Router, type Request, type Response } from 'express';
import { CreateDeviceSchema } from '../types.js';
import { createDevice, listDevices } from '../services/btest-service.js';

export const devicesRouter = Router();

devicesRouter.get('/', (_req, res) => {
  res.json(listDevices());
});

devicesRouter.post('/', (req: Request, res: Response) => {
  const parsed = CreateDeviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const device = createDevice(parsed.data);
  const { password: _password, ...publicDevice } = device;
  return res.status(201).json(publicDevice);
});

