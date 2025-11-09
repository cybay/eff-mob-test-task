import path from 'node:path';
import envSchema from 'env-schema';

const schema = {
  type: 'object',
  required: ['host', 'port', 'log_level', 'node_env', 'db_file', 'jwt_sign_key'],
  properties: {
    host: {
      type: 'string',
      minLength: 7,
      default: '127.0.0.1'
    },
    port: {
      type: 'integer',
      minimum: 1024,
      maximum: 65535,
      default: 3000
    },
    log_level: {
      type: 'string',
      default: 'info',
      enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    },
    node_env: {
      type: 'string',
      default: 'development',
      enum: ['development', 'testing', 'production', 'staging'],
    },
    db_file: {
      type: 'string',
      minLength: 1,
      default: 'users.db',
    },
    jwt_sign_key: {
      type: 'string',
      minLength: 6
    }
  },
};

const cfg = envSchema({
  schema: schema,
  dotenv: {
    path: path.join(import.meta.dirname, '../../.env'),
  },
});

const env = {
  host:         cfg.host,
  port:         cfg.port,
  log_level:    cfg.log_level,
  node_env:     cfg.node_env,
  db_file:      cfg.db_file,
  root_path:    path.join(import.meta.dirname, './../../'),
  jwt_sign_key: cfg.jwt_sign_key
};

export default env;

