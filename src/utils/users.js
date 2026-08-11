import { defaultUserAvatar, defaultUserBio } from '../data/catalog.js';

export const mapUserRow = (user, roles = [], permissions = []) => {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    roles,
    permissions
  };
};
