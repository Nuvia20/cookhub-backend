import { ZodError } from 'zod';
import { AppError } from '../utils/appError.js';

export const notFound = (_req, _res, next) => {
  next(new AppError('Ruta no encontrada', 404));
};

export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: error.flatten(),
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({
    message: error?.message || 'Error interno del servidor',
  });
};