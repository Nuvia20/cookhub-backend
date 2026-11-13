import pool, { query } from '../config/db.js';
import { categories, recipeCatalog } from '../data/catalog.js';

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const buildRecipeView = (row, ingredients, steps, authorName) => {
  const catalogItem = recipeCatalog[row.titulo] || {};
  const category = categories.find((item) => item.id === row.categoria_id) || categories.find((item) => item.title === catalogItem.category) || categories[0];

  return {
    id: String(row.id),
    title: row.titulo,
    description: row.descripcion || '',
    ingredients: ingredients.map((item) => (item.cantidad ? `${item.cantidad} ${item.nombre}`.trim() : item.nombre)),
    steps: steps.map((item) => item.descripcion),
    prepTime: row.tiempo_preparacion ? `${row.tiempo_preparacion} min` : '0 min',
    image: row.imagen_url || catalogItem.image,
    categoryId: row.categoria_id || catalogItem.categoryId || category.id,
    category: category?.title || catalogItem.category || 'Recetas',
    authorId: String(row.usuario_id),
    author: authorName || 'CookHub',
    createdAt: row.creado_en,
    updatedAt: row.actualizado_en || row.creado_en,
  };
};

export const getAllRecipes = async () => {
  const [recipes] = await query(
    `SELECT r.id, r.usuario_id, r.categoria_id, r.titulo, r.descripcion, r.tiempo_preparacion, r.imagen_url, r.creado_en, r.actualizado_en, u.nombre AS autor
     FROM recetas r
     INNER JOIN usuarios u ON u.id = r.usuario_id
     ORDER BY r.creado_en DESC`,
  );

  if (recipes.length === 0) {
    return [];
  }

  const recipeIds = recipes.map((recipe) => recipe.id);
  const [ingredientRows] = await query(`SELECT receta_id, nombre, cantidad FROM ingredientes WHERE receta_id IN (?) ORDER BY id ASC`, [recipeIds]);
  const [stepRows] = await query(`SELECT receta_id, paso_numero, descripcion FROM pasos WHERE receta_id IN (?) ORDER BY paso_numero ASC`, [recipeIds]);

  const ingredientsByRecipe = new Map();
  const stepsByRecipe = new Map();

  for (const ingredient of ingredientRows) {
    if (!ingredientsByRecipe.has(ingredient.receta_id)) {
      ingredientsByRecipe.set(ingredient.receta_id, []);
    }
    ingredientsByRecipe.get(ingredient.receta_id).push(ingredient);
  }

  for (const step of stepRows) {
    if (!stepsByRecipe.has(step.receta_id)) {
      stepsByRecipe.set(step.receta_id, []);
    }
    stepsByRecipe.get(step.receta_id).push(step);
  }

  return recipes.map((recipe) => buildRecipeView(recipe, ingredientsByRecipe.get(recipe.id) || [], stepsByRecipe.get(recipe.id) || [], recipe.autor));
};

export const getRecipeById = async (recipeId) => {
  const [recipes] = await query(
    `SELECT r.id, r.usuario_id, r.categoria_id, r.titulo, r.descripcion, r.tiempo_preparacion, r.imagen_url, r.creado_en, r.actualizado_en, u.nombre AS autor
     FROM recetas r
     INNER JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.id = ?
     LIMIT 1`,
    [recipeId],
  );

  if (!recipes[0]) {
    return null;
  }

  const [ingredientRows] = await query('SELECT receta_id, nombre, cantidad FROM ingredientes WHERE receta_id = ? ORDER BY id ASC', [recipeId]);
  const [stepRows] = await query('SELECT receta_id, paso_numero, descripcion FROM pasos WHERE receta_id = ? ORDER BY paso_numero ASC', [recipeId]);

  return buildRecipeView(recipes[0], ingredientRows, stepRows, recipes[0].autor);
};

export const createRecipe = async ({ userId, payload }) => {
  const title = payload.title.trim();
  const description = payload.description.trim();
  const prepTime = Number.parseInt(String(payload.prepTime).replace(/[^0-9]/g, ''), 10) || 0;
  const ingredients = normalizeList(payload.ingredients);
  const steps = normalizeList(payload.steps);
  const catalogItem = recipeCatalog[title] || {};
  const category = categories.find((item) => item.title.toLowerCase() === String(payload.category || catalogItem.category || '').toLowerCase()) || categories[0];

  const [recipeResult] = await query(
    `INSERT INTO recetas (usuario_id, categoria_id, titulo, descripcion, tiempo_preparacion, imagen_url)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [userId, category?.id || null, title, description, prepTime, payload.image || catalogItem.image || null],
  );

  for (const ingredient of ingredients) {
    await query('INSERT INTO ingredientes (receta_id, nombre, cantidad) VALUES (?, ?, ?)', [recipeResult.insertId, ingredient, null]);
  }

  for (const [index, step] of steps.entries()) {
    await query('INSERT INTO pasos (receta_id, paso_numero, descripcion) VALUES (?, ?, ?)', [recipeResult.insertId, index + 1, step]);
  }

  return getRecipeById(recipeResult.insertId);
};