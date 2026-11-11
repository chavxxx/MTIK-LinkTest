import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  routerosHost: process.env.ROUTEROS_HOST ?? '192.168.88.1',
  routerosPort: Number(process.env.ROUTEROS_PORT ?? 8728),
  routerosUser: process.env.ROUTEROS_USER ?? 'admin',
  routerosPassword: process.env.ROUTEROS_PASSWORD ?? '',
  routerosUseSSL: process.env.ROUTEROS_USE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET ?? 'development-secret'
};
