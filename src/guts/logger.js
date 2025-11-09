import pino from 'pino';
import env from '#env';

const opts = {
  level: env.log_level,
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  },
};

const logger = pino(opts);
export default logger;

