import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import { uploadImage } from '../services/cloudinaryService.js';

const router = express.Router();

// Obtener perfil de usuario
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const usuario_id = req.params.id;
    const [rows] = await pool.query(
      `SELECT id, nombre, email, foto_perfil FROM usuarios WHERE id = ?`,
      [usuario_id]
    );
    res.json({ success: true, perfil: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener perfil' });
  }
});

// Actualizar perfil (nombre + foto)
router.put('/:id', verifyToken, upload.single('foto_perfil'), async (req, res) => {
  try {
    const usuario_id = req.params.id;
    const nombre = req.body.nombre;
    const foto_perfil = await uploadImage(req.file, 'cookhub/perfiles');

    await pool.query(
      `UPDATE usuarios SET nombre = ?, foto_perfil = COALESCE(?, foto_perfil) WHERE id = ?`,
      [nombre, foto_perfil, usuario_id]
    );

    res.json({ success: true, message: 'Perfil actualizado', foto_perfil });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar perfil' });
  }
});

// Obtener una receta específica de un usuario
router.get('/:id/recetas/:receta_id', verifyToken, async (req, res) => {
  try {
    const usuario_id = req.params.id;
    const receta_id = req.params.receta_id;

    const [rows] = await pool.query(
      `SELECT r.id, r.titulo, r.descripcion, r.tiempo_preparacion, r.imagen_url, r.categoria_id, r.creado_en,
              u.nombre AS usuario_nombre
       FROM recetas r
       LEFT JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.id = ? AND r.usuario_id = ?`,
      [receta_id, usuario_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Receta no encontrada para este usuario' });
    }

    const receta = rows[0];

    const [ingredientes] = await pool.query(
      `SELECT nombre, cantidad FROM ingredientes WHERE receta_id = ? ORDER BY id ASC`,
      [receta_id]
    );

    const [pasos] = await pool.query(
      `SELECT paso_numero, descripcion FROM pasos WHERE receta_id = ? ORDER BY paso_numero ASC`,
      [receta_id]
    );

    receta.ingredientes = ingredientes;
    receta.pasos = pasos;

    res.json({ success: true, receta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener la receta del usuario' });
  }
});

// Obtener recetas de un usuario específico
router.get('/:id/recetas', verifyToken, async (req, res) => {
  try {
    const usuario_id = req.params.id;

    const [recetas] = await pool.query(
      `SELECT r.id, r.titulo, r.descripcion, r.tiempo_preparacion, r.imagen_url, r.creado_en
       FROM recetas r
       WHERE r.usuario_id = ?
       ORDER BY r.creado_en DESC`,
      [usuario_id]
    );

    res.json({ success: true, recetas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener recetas del usuario' });
  }
});

export default router;
