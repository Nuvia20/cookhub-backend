import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middlewares/auth.js'; // middleware JWT
import upload from '../middlewares/upload.js'; // middleware para subir imágenes
import { uploadImage } from '../services/cloudinaryService.js';

const router = express.Router();

/* ============================
   RUTAS DE CATEGORÍAS
============================ */

// Obtener todas las categorías
router.get("/categorias", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categorias");
    res.json({ success: true, categorias: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error al obtener categorías" });
  }
});

// Obtener recetas por categoría
router.get("/categorias/:id/recetas", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT r.id, r.usuario_id, r.titulo, r.descripcion, r.tiempo_preparacion, 
              r.imagen_url, r.creado_en, c.nombre AS categoria
       FROM recetas r
       LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.categoria_id = ?`,
      [id]
    );
    res.json({ success: true, recetas: rows });
  } catch (error) {
    console.error("Error al obtener recetas por categoría:", error);
    res.status(500).json({ success: false, error: "Error al obtener recetas por categoría" });
  }
});

/* ============================
   RUTAS DE RECETAS
============================ */

// Obtener todas las recetas
router.get('/', async (req, res) => {
  try {
    const [recetas] = await pool.query(
      `SELECT r.id, r.usuario_id, r.titulo, r.descripcion, r.tiempo_preparacion, 
              r.imagen_url, r.creado_en, u.nombre AS usuario_nombre, c.nombre AS categoria
       FROM recetas r
       LEFT JOIN usuarios u ON u.id = r.usuario_id
       LEFT JOIN categorias c ON r.categoria_id = c.id
       ORDER BY r.creado_en DESC`
    );

    for (const receta of recetas) {
      const [ingredientes] = await pool.query(
        `SELECT nombre, cantidad FROM ingredientes WHERE receta_id = ?`,
        [receta.id]
      );
      const [pasos] = await pool.query(
        `SELECT paso_numero, descripcion FROM pasos WHERE receta_id = ? ORDER BY paso_numero ASC`,
        [receta.id]
      );

      receta.ingredientes = ingredientes;
      receta.pasos = pasos;
    }

    res.json({ success: true, recetas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener recetas' });
  }
});



// Crear receta (requiere token)
router.post('/', verifyToken, upload.single('imagen'), async (req, res) => {
  try {
    const { titulo, descripcion, tiempo_preparacion, categoria_id } = req.body;
    const ingredientes = req.body.ingredientes ? JSON.parse(req.body.ingredientes) : [];
    const pasos = req.body.pasos ? JSON.parse(req.body.pasos) : [];

    const usuario_id = req.user.id;
    const categoriaId = categoria_id || null;
    const imagen_url = await uploadImage(req.file, 'cookhub/recetas');

    const [recetaRows] = await pool.query(
      `INSERT INTO recetas (usuario_id, titulo, descripcion, tiempo_preparacion, imagen_url, categoria_id)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [usuario_id, titulo, descripcion, tiempo_preparacion, imagen_url, categoriaId]
    );
    const receta_id = recetaRows[0]?.id;

    for (const ingrediente of ingredientes) {
      await pool.query(
        `INSERT INTO ingredientes (receta_id, nombre, cantidad) VALUES (?, ?, ?)`,
        [receta_id, ingrediente.nombre, ingrediente.cantidad]
      );
    }

    for (const paso of pasos) {
      await pool.query(
        `INSERT INTO pasos (receta_id, paso_numero, descripcion) VALUES (?, ?, ?)`,
        [receta_id, paso.paso_numero, paso.descripcion]
      );
    }

    res.status(201).json({ success: true, receta_id, imagen_url });
  } catch (error) {
    console.error('Error al crear receta:', error);
    res.status(500).json({ success: false, error: 'Error al crear receta' });
  }
});

// Obtener una receta por id
router.get('/:id', async (req, res) => {
  try {
    const recetaId = req.params.id;

    const [rows] = await pool.query(
      `SELECT r.id, r.usuario_id, r.titulo, r.descripcion, r.tiempo_preparacion, r.imagen_url, r.creado_en,
              u.nombre AS usuario_nombre, c.nombre AS categoria
       FROM recetas r
       LEFT JOIN usuarios u ON u.id = r.usuario_id
       LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.id = ?`,
      [recetaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Receta no encontrada' });
    }

    const receta = rows[0];

    const [ingredientes] = await pool.query(
      `SELECT nombre, cantidad FROM ingredientes WHERE receta_id = ? ORDER BY id ASC`,
      [recetaId]
    );

    const [pasos] = await pool.query(
      `SELECT paso_numero, descripcion FROM pasos WHERE receta_id = ? ORDER BY paso_numero ASC`,
      [recetaId]
    );

    receta.ingredientes = ingredientes;
    receta.pasos = pasos;

    res.json({ success: true, receta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener la receta' });
  }
});

// Editar receta por ID
router.put('/:id', verifyToken, upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, tiempo_preparacion, categoria_id } = req.body;
    const ingredientes = req.body.ingredientes ? JSON.parse(req.body.ingredientes) : [];
    const pasos = req.body.pasos ? JSON.parse(req.body.pasos) : [];
    const categoriaId = categoria_id || null;
    const imagen_url = req.file
      ? await uploadImage(req.file, 'cookhub/recetas')
      : req.body.imagen_url || null;

    const [result] = await pool.query(
      `UPDATE recetas
      SET titulo = ?, descripcion = ?, tiempo_preparacion = ?, imagen_url = COALESCE(?, imagen_url), categoria_id = ?
       WHERE id = ?`,
      [titulo, descripcion, tiempo_preparacion, imagen_url, categoriaId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Receta no encontrada' });
    }

    await pool.query('DELETE FROM ingredientes WHERE receta_id = ?', [id]);
    await pool.query('DELETE FROM pasos WHERE receta_id = ?', [id]);

    for (const ingrediente of ingredientes) {
      await pool.query(
        'INSERT INTO ingredientes (receta_id, nombre, cantidad) VALUES (?, ?, ?)',
        [id, ingrediente.nombre, ingrediente.cantidad]
      );
    }

    for (const paso of pasos) {
      await pool.query(
        'INSERT INTO pasos (receta_id, paso_numero, descripcion) VALUES (?, ?, ?)',
        [id, paso.paso_numero || 1, paso.descripcion]
      );
    }

    return res.json({ success: true, message: 'Receta actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar receta:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar receta' });
  }
});

// Eliminar receta por ID
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM recetas WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Receta no encontrada" });
    }

    res.json({ success: true, message: "Receta eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Error al eliminar receta" });
  }
});

export default router;
