import path from 'node:path';
import ffpg from 'fastify-plugin';
import Database from 'better-sqlite3';
import env from '#env';

export const roles_ref    = ['admin', 'user'];
export const statuses_ref = ['blocked', 'active'];

const role_name_to_id = {};
const status_name_to_id = {};

function fill_up_ref(db, log, table, ref_values, ref_map) {
  const insert_stmt = db.prepare(`insert into ${table} (name) values (?)`);

  try {
    for(const val of ref_values) insert_stmt.run(val);
  }
  catch(err) {
    log.fatal(`insert into reference talbe '${table}' failed: ${err.message}`);
  }

  const select_stmt = db.prepare(`select * from ${table};`);
  const entries = select_stmt.all();
  log.debug(`${table}-ref: ${JSON.stringify(entries)}`);
  for(const ent of entries) ref_map[ent.name] = ent.id;
}

async function db_connector(ffy, opts) {
  const db = new Database(
    path.join(env.root_path, env.db_file),
    { verbose: console.log }
  );

  db.exec('pragma foreign_keys = on;');

  db.exec(`
    create table if not exists roles (
      id    integer primary key autoincrement,
      name  text not null unique
    );
  `);

  db.exec(`
    create table if not exists statuses (
      id    integer primary key autoincrement,
      name  text not null unique
    );
  `);

  db.exec(`
    create table if not exists users (
      id          integer primary key autoincrement,
      first_name  text not null,
      last_name   text not null,
      middle_name text not null,
      birth_date  text not null,
      email       text not null unique,
      pwd_hash    text not null,
      role_id     integer,
      status_id   integer,
      foreign key (role_id) references roles (id),
      foreign key (status_id) references statuses (id)
    );
  `);

  ffy.decorate('db', db);

  ffy.addHook('onClose', (ffy, done) => {
    db.close();
    done();
  });

  const { log } = ffy;
  fill_up_ref(db, log, 'roles', roles_ref, role_name_to_id);
  fill_up_ref(db, log, 'statuses', statuses_ref, status_name_to_id);

  console.log('Database and users-table created successfully');
}

export default ffpg(db_connector);
export function role_id(name) { return role_name_to_id[name]; }
export function status_id(name) { return status_name_to_id[name]; }

