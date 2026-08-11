import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

router.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ conectado: true, resultado: rows[0].result });
  } catch (error) {
    console.error('Error en conexión:', error);
    res.status(500).json({ conectado: false, error: error.message });
  }
});

export default router;
