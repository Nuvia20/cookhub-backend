import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AppError } from '../utils/appError.js';
import { findUserAuthById } from '../services/userService.js';
import { mapUserRow } from '../utils/users.js';
import pool from '../config/db.js'; // Importa el pool para consultar la BD

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requirePermission(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ valid: false, error: "Token no proporcionado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, roles: decoded.roles };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ valid: false, error: "Token expirado" });
    }
    return res.status(403).json({ valid: false, error: "Token inválido" });
  }
};


