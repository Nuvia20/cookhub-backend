import app from './app.js';
import { syncSequences } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

syncSequences()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudieron sincronizar las secuencias de PostgreSQL:', error);
    process.exit(1);
  });
