import { categories } from '../data/catalog.js';

export const getCategories = (_req, res) => {
  res.json({ categories });
};