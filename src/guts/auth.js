import ffpg from 'fastify-plugin';
import env from '#env';
import jwt from '@fastify/jwt';

export function policy_admin_only(user_id, target_user_id, role_id) {
  const ok = role_id == 1;
  //console.log(`## policy-admin-only: u:${user_id} t:${target_user_id} r:${role_id} ok:${ok}`);
  return ok;
}

export function policy_admin_or_self(user_id, target_user_id, role_id) {
  const ok = role_id == 1 || user_id == target_user_id;
  //console.log(`## policy-admin-or-self: u:${user_id} t:${target_user_id} r:${role_id} ok:${ok}`);
  return ok;
}

function check_rb_policy(policy) {
  return async function(req, reply) {
    try {
      await req.jwtVerify();
    }
    catch(err) {
      const err_msg = `Unauthorized, err: ${err}`;
      req.server.log.debug(err_msg);
      return reply.status(401).send({ error: err_msg });
    }

    const { user_id, role_id} = req.user.payload;
    const target_user_id = req.params.user_id;
    if(!policy(user_id, target_user_id, role_id)) {
      const err_msg = `Forbidden: does not have correct role`;
      req.server.log.debug(err_msg);
      return reply.status(403).send({ error: err_msg });
    }
  }
}

export default ffpg(async function (ffy, opts) {
  ffy.register(jwt, { secret: env.jwt_sign_key });
  ffy.decorate('rb_auth', check_rb_policy);
});

