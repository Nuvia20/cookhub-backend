import express from 'express';
import {
  createUser,
  getUserById,
  listUsers,
  inactivarUsuario,
  activarUsuario,
  deleteUser
} from '../controllers/userController.js';

const router = express.Router();

router.post('/', createUser);
router.get('/', listUsers);
router.get('/:id', getUserById);
router.put('/:id/inactivar', inactivarUsuario);
router.put('/:id/activar', activarUsuario);
router.delete('/:id', deleteUser);

export default router;
