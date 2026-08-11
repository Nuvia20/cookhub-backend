import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/appError.js';
import { mapUserRow } from '../utils/users.js';

// Crear usuario
export const createUser = async (req, res, next) => {
  try {
    const { nombre, email, password_hash, role = 'user' } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, role, estado) VALUES (?, ?, ?, ?, "activo")',
      [nombre, email, passwordHash, role]
    );

    res.status(201).json({ id: result.insertId, nombre, email, role, estado: 'activo' });
  } catch (error) {
    next(new AppError('Error al crear usuario', 500));
  }
};

// Obtener usuario por ID
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);

    if (!rows[0]) return next(new AppError('Usuario no encontrado', 404));

    res.json(mapUserRow(rows[0]));
  } catch (error) {
    next(new AppError('Error al obtener usuario', 500));
  }
};

// Listar todos los usuarios
export const listUsers = async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios');
    res.json(rows.map((u) => mapUserRow(u)));
  } catch (error) {
    next(new AppError('Error al listar usuarios', 500));
  }
};

// Marcar usuario como inactivo
export const inactivarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE usuarios SET estado = "inactivo" WHERE id = ?', [id]);
    res.json({ message: 'Usuario inactivado' });
  } catch (error) {
    next(new AppError('Error al inactivar usuario', 500));
  }
};

// Marcar usuario como activo
export const activarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE usuarios SET estado = "activo" WHERE id = ?', [id]);
    res.json({ message: 'Usuario activado' });
  } catch (error) {
    next(new AppError('Error al activar usuario', 500));
  }
};

// Eliminar usuario
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(new AppError('Error al eliminar usuario', 500));
  }
};
