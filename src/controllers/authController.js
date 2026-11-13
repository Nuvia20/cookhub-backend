import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';
import { createUser, findUserAuthByEmail, assignRoleToUser } from '../services/userService.js';
import { mapUserRow } from '../utils/users.js';

export async function register(req, res, next) {
  try {
    const { nombre, email, password } = req.body;

    // Validar si ya existe
    const [existing] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Insertar usuario
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?) RETURNING id',
      [nombre, email, password_hash]
    );

    const userId = result.insertId;
    // Asignar rol Usuario (id = 3)
    await assignRoleToUser(userId, 3);

    res.json({
      success: true,
      message: 'Usuario registrado correctamente',
      usuario: { id: userId, nombre, email, rol: 'Usuario' }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Validar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Obtener roles del usuario
    const [roles] = await pool.query(
      `SELECT r.nombre 
       FROM usuario_rol ur 
       JOIN roles r ON ur.rol_id = r.id 
       WHERE ur.usuario_id = ?`,
      [user.id]
    );

    const userRoles = roles.map(r => r.nombre);

    // Generar token
    const token = jwt.sign({ id: user.id, roles: userRoles }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: { id: user.id, nombre: user.nombre, email: user.email, roles: userRoles }
    });
  } catch (error) {
    next(error);
  }
}

export async function changeUserRole(req, res, next) {
  try {
    const { userId, roleId } = req.body;

    // Validar que el usuario autenticado sea Super Admin
    if (!req.user.roles.includes('SuperAdmin')) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await assignRoleToUser(userId, roleId);
    res.json({ success: true, message: 'Rol asignado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
}

