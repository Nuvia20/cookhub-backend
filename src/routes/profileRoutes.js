import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import pool from '../config/db.js';

const router = Router();

router.get('/profile', requireAuth, async (req, res) => {
  try {
    // Obtener datos básicos del usuario
    const [rows] = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener roles
    const [roles] = await pool.query(
      `SELECT r.nombre 
       FROM usuario_rol ur 
       JOIN roles r ON ur.rol_id = r.id 
       WHERE ur.usuario_id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      usuario: rows[0],
      roles: roles.map(r => r.nombre)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});


export default router;