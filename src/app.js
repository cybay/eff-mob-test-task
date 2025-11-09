import Fastify from 'fastify';
import close_with_grace from 'close-with-grace';

import env from '#env';
import logger from '#src/guts/logger.js';
import db_connector from '#src/guts/db.js';
import user_routes from '#src/routes/users.js';
import auth from '#src/guts/auth.js';

const ffy_opts = { loggerInstance: logger };
const ffy = Fastify(ffy_opts);

const api_pfx_v1 = '/api/v1';
const route_opts = { prefix: api_pfx_v1 };

ffy.register(db_connector);
ffy.register(auth);
ffy.register(user_routes, route_opts);

// delay is the number of milliseconds for the graceful close to finish
close_with_grace({ delay: process.env.FASTIFY_CLOSE_GRACE_DELAY || 500 },
  async function ({ signal, err, manual }) {
    if(err) ffy.log.error(err);
    await ffy.close();
  });

const conn_opts = {
  port: env.port,
  host: env.host
};

ffy.listen(conn_opts, (err, addr) => {
  if(err) {
    ffy.log.error(err);
    process.exit(1);
  }
  ffy.log.info(`App is running in ${env.node_env} mode at ${addr}`);
  ffy.log.info(`log-level:${ffy.log.level} conn-opts:${JSON.stringify(conn_opts)}`);
});

