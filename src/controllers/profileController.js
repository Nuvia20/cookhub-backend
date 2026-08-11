import { z } from 'zod';
import { AppError } from '../utils/appError.js';
import { updateUserProfile } from '../services/userService.js';
import { mapUserRow } from '../utils/users.js';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
});

export const updateProfile = async (req, res, next) => {
  const data = updateProfileSchema.parse(req.body);
  const updatedUser = await updateUserProfile({ userId: req.user.id, ...data });

  if (!updatedUser) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.json({ user: mapUserRow(updatedUser, updatedUser.roles, updatedUser.permissions) });
};