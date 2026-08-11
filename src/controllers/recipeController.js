import { z } from 'zod';
import { AppError } from '../utils/appError.js';
import { createRecipe as createRecipeRecord, getAllRecipes, getRecipeById as findRecipeById } from '../services/recipeService.js';

const recipeInputSchema = z.object({
  title: z.string().trim().min(2, 'El título es obligatorio'),
  description: z.string().trim().min(10, 'La descripción es obligatoria'),
  ingredients: z.union([z.array(z.string().min(1)), z.string().min(1)]),
  steps: z.union([z.array(z.string().min(1)), z.string().min(1)]),
  prepTime: z.string().trim().min(1, 'El tiempo de preparación es obligatorio'),
  image: z.string().url().optional(),
  categoryId: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export const getRecipes = async (_req, res, next) => {
  try {
    const recipes = await getAllRecipes();
    res.json({ recipes });
  } catch (error) {
    next(error);
  }
};

export const getRecipeById = async (req, res, next) => {
  try {
    const recipe = await findRecipeById(req.params.recipeId);

    if (!recipe) {
      return next(new AppError('Receta no encontrada', 404));
    }

    res.json({ recipe });
  } catch (error) {
    next(error);
  }
};

export const createRecipe = async (req, res, next) => {
  const data = recipeInputSchema.parse(req.body);
  try {
    const recipe = await createRecipeRecord({
      userId: Number.parseInt(req.user.id, 10),
      payload: data,
    });

    res.status(201).json({ recipe });
  } catch (error) {
    next(error);
  }
};