export const buildRecipeView = (recipe, db) => {
  const author = db.data.users.find((user) => user.id === recipe.authorId);
  const category = db.data.categories.find((item) => item.id === recipe.categoryId);

  return {
    ...recipe,
    author: author?.name || 'CookHub',
    category: category?.title || 'Sin categoría',
  };
};