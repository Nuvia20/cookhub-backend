import { Router } from 'express';
import { createRecipe, getRecipeById, getRecipes } from '../controllers/recipeController.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';

const router = Router();

router.get('/', getRecipes);
router.get('/:recipeId', getRecipeById);
router.post('/', requireAuth, requirePermission('recipes:create'), createRecipe);

export default router;