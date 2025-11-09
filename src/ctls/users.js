import Ajv from 'ajv';
import add_formats from 'ajv-formats';
import { roles_ref, statuses_ref, role_id, status_id } from '#src/guts/db.js';
import bcrypt from 'bcrypt';

const ajv = new Ajv();
add_formats(ajv);

const name_pattern = '^(?=.*[a-zA-Z]).+$';
const name_desc = {
  type: 'string',
  minLength: 2,
  maxLength: 30,
  pattern: name_pattern
};

const user_properties = [
  'first_name', 'last_name', 'middle_name', 'birth_date', 'email', 'password', 'role', 'status'];

const user_schema = {
  type: 'object',
  properties: {
    first_name: name_desc,
    last_name: name_desc,
    middle_name: name_desc,
    birth_date: {
      type: 'string',
      format: 'date',
      formatMinimum: '1900-01-01',
      formatExclusiveMaximum: '2020-01-01',
    },
    email: {
      type: 'string',
      format: 'email'
    },
    password: {
      type: 'string',
      minLength: 6,
      maxLength: 20,
    },
    role: {
      type: 'string',
      enum: roles_ref
    },
    status: {
      type: 'string',
      enum: statuses_ref
    }
  },
  required: user_properties,
  additionalProperties: false
};

const login_schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email'
    },
    password: {
      type: 'string',
      minLength: 6,
      maxLength: 20,
    }
  },
  required: ['email', 'password'],
  additionalProperties: false
};

///////////////////////////////////////////////////////////////////////////////////////////////////
function user_prop_to_table_field(prop) {
  switch(prop) {
    case 'role'    : return 'role_id';
    case 'status'  : return 'status_id';
    case 'password': return 'pwd_hash';
  }
  return prop;
}
///////////////////////////////////////////////////////////////////////////////////////////////////
async function hashify(user) {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
}
///////////////////////////////////////////////////////////////////////////////////////////////////
async function create_user(req, reply) {
  const user = req.body;
  const validator = ajv.compile(user_schema);
  const valid = validator(user);
  if(!valid)
    return reply.status(400).send({
      error: 'Invalid input user properties',
      details: validator.errors,
    });

  const { db } = req.server;
  const fields = user_properties.map(user_prop_to_table_field).join(', ');
  const plc_holders = user_properties.map(x => ":" + x).join(", ");

  try {
    const insert_stmt = db.prepare(`insert into users (${fields}) values (${plc_holders})`);
    user.role = role_id(user.role);
    user.status = status_id(user.status);
    await hashify(user);
    insert_stmt.run({...user});
  }
  catch(err) {
    const err_msg = `insert failed: ${err.message}`;
    req.server.log.error(err_msg);
    return reply.status(500).send({ error: err_msg });
  }

  return reply.send();
}
///////////////////////////////////////////////////////////////////////////////////////////////////
function get_all_users(req, reply) {
  const { db } = req.server;

  try {
    const select_stmt = db.prepare(`select * from users`);
    const rows = select_stmt.all();
    return reply.send(rows);
  }
  catch(err) {
    const err_msg = `select failed: ${err.message}`;
    req.server.log.error(err_msg);
    return reply.status(500).send({ error: err_msg });
  }

  return reply.send();
}
///////////////////////////////////////////////////////////////////////////////////////////////////
function get_user_by_id(req, reply) {
  const { user_id } = req.params;
  const { db } = req.server;

  try {
    const select_stmt = db.prepare(`select * from users where id = :user_id`);
    const rec = select_stmt.get({ user_id });
    return reply.send(rec);
  }
  catch(err) {
    const err_msg = `select failed: ${err.message}`;
    req.server.log.error(err_msg);
    return reply.status(500).send({ error: err_msg });
  }

  return reply.send();
}
///////////////////////////////////////////////////////////////////////////////////////////////////
function block_user_by_id(req, reply) {
  const { user_id } = req.params;
  const { db } = req.server;
  const blocked_id = status_id(statuses_ref[0]);

  try {
    const upd_stmt = db.prepare(`update users set status_id = :blocked_id  where id = :user_id`);
    upd_stmt.run({ user_id, blocked_id });
    return reply.send();
  }
  catch(err) {
    const err_msg = `update failed: ${err.message}`;
    req.server.log.error(err_msg);
    return reply.status(500).send({ error: err_msg });
  }

  return reply.send();
}
///////////////////////////////////////////////////////////////////////////////////////////////////
async function login_user(req, reply) {
  const validator = ajv.compile(login_schema);
  const valid = validator(req.body);
  if(!valid)
    return reply.status(400).send({
      error: 'Invalid input login parameters',
      details: validator.errors,
    });

  const { email, password } = req.body;

  const { db } = req.server;
  try {
    const select_stmt = db.prepare(`select * from users where email = :email`);
    const user = select_stmt.get({ email });
    if(!user) {
      const err_msg = `User not found`;
      req.server.log.debug(err_msg);
      return reply.status(401).send({ error: err_msg });
    }

    const pwd_ok = await bcrypt.compare(password, user.pwd_hash);
    if(!pwd_ok) {
      const err_msg = `Wrong password`;
      req.server.log.debug(err_msg);
      return reply.status(401).send({ error: err_msg });
    }

    const jwt_payload = {
      payload: {
        user_id: user.id,
        role_id: user.role_id
      }
    }
    const token = req.server.jwt.sign(jwt_payload);
    reply.send({ token });
  }
  catch(err) {
    const err_msg = `An error occurred during authorization: ${err.message}`;
    req.server.log.error(err_msg);
    return reply.status(500).send({ error: err_msg });
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////
export default {
  create_user,
  get_all_users,
  get_user_by_id,
  block_user_by_id,
  login_user
}
///////////////////////////////////////////////////////////////////////////////////////////////////

