
import express from 'express';
import cors from 'cors';
import testRoutes from './routes/testRoutes.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173', // tu frontend
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));


//rutas de autenticacion
app.use('/api', testRoutes);
app.use('/auth', authRoutes);
app.use('/', profileRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

export default app;