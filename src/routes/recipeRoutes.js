import { Router } from 'express';
import { createRecipe, getRecipeById, getRecipes } from '../controllers/recipeController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', getRecipes);
router.get('/:recipeId', getRecipeById);
router.post('/', requireAuth, createRecipe);

export default router;