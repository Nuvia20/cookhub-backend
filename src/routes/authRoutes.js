import express from 'express';
import { Router } from 'express';
import { login, logout, register } from '../controllers/authController.js';
import { requireAuth,verifyToken  } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', requireAuth, logout);

router.get("/verify", verifyToken, (req, res) => {
  res.json({
    valid: true,
    usuario: req.user,
  });
});


export default router;