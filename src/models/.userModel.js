const pool = require('../config/db');

const crearUsuario = async (nombre, email, passwordHash) => {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
    [nombre, email, passwordHash]
  );
  return result.insertId;
};

const buscarPorEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return rows[0];
};

module.exports = { crearUsuario, buscarPorEmail };
