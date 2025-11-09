import user_ctl from '#src/ctls/users.js';
import { policy_admin_only, policy_admin_or_self } from '#src/guts/auth.js';

export default async function (ffy, opts) {
  ffy.get('/users', { onRequest: [ffy.rb_auth(policy_admin_only)] }, user_ctl.get_all_users);
  ffy.get('/users/:user_id', { onRequest: [ffy.rb_auth(policy_admin_or_self)] }, user_ctl.get_user_by_id);
  ffy.post('/users', user_ctl.create_user);
  ffy.put('/users/:user_id', { onRequest: [ffy.rb_auth(policy_admin_or_self)] }, user_ctl.block_user_by_id);
  ffy.post('/users/login', user_ctl.login_user);
}

