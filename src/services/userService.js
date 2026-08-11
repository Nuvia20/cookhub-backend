import pool from '../config/db.js';
import { getAccessRowsForUser, getDefaultRoleId } from './authorizationService.js';
import { mapUserRow } from '../utils/users.js';


const fetchUserRowByEmail = async (email) => {
  const [rows] = await query(
    `SELECT id, nombre, email, password_hash, creado_en
     FROM usuarios
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
};

const fetchUserRowById = async (userId) => {
  const [rows] = await query(
    `SELECT id, nombre, email, password_hash, creado_en
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
};


export const findUserAuthById = async (userId) => {
  const row = await fetchUserRowById(userId);
  if (!row) {
    return null;
  }

  const access = await getAccessRowsForUser(row.id);
  return { ...row, ...access };
};

export const createUser = async ({ name, email, passwordHash }) => {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );
  return { id: result.insertId, nombre: name, email };
};

export const findUserAuthByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return rows[0];
};

export const updateUserProfile = async ({ userId, name }) => {
  const assignments = [];
  const values = [];

  if (name !== undefined) {
    assignments.push('nombre = ?');
    values.push(name);
  }

  if (assignments.length === 0) {
    return findUserAuthById(userId);
  }
  values.push(userId);

  await query(`UPDATE usuarios SET ${assignments.join(', ')} WHERE id = ?`, values);
  return findUserAuthById(userId);
};

export const assignRoleToUser = async (userId, roleId) => {
  await pool.query(
    'INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (?, ?)',
    [userId, roleId]
  );
};
