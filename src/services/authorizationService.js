import pool from '../config/db.js';


const seedRoles = [
  { nombre: 'usuario', descripcion: 'Usuario autenticado estándar' },
  { nombre: 'admin', descripcion: 'Administrador del sistema' },
];

const seedPermissions = [
  { nombre: 'profile:view', descripcion: 'Puede ver su perfil' },
  { nombre: 'profile:update', descripcion: 'Puede editar su perfil' },
  { nombre: 'recipes:view', descripcion: 'Puede ver recetas' },
  { nombre: 'recipes:create', descripcion: 'Puede crear recetas' },
  { nombre: 'recipes:manage', descripcion: 'Puede gestionar recetas' },
  { nombre: 'admin:access', descripcion: 'Puede acceder al panel de administración' },
];

const seedRolePermissions = [
  ['usuario', 'profile:view'],
  ['usuario', 'profile:update'],
  ['usuario', 'recipes:view'],
  ['usuario', 'recipes:create'],
  ['admin', 'profile:view'],
  ['admin', 'profile:update'],
  ['admin', 'recipes:view'],
  ['admin', 'recipes:create'],
  ['admin', 'recipes:manage'],
  ['admin', 'admin:access'],
];


export const findUserByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return rows[0];
}; 

export const seedAuthorizationData = async () => {
  for (const role of seedRoles) {
    await query('INSERT IGNORE INTO roles (nombre, descripcion) VALUES (?, ?)', [role.nombre, role.descripcion]);
  }

  for (const permission of seedPermissions) {
    await query('INSERT IGNORE INTO permisos (nombre, descripcion) VALUES (?, ?)', [permission.nombre, permission.descripcion]);
  }

  const [roles] = await query('SELECT id, nombre FROM roles');
  const [permissions] = await query('SELECT id, nombre FROM permisos');

  const roleByName = new Map(roles.map((role) => [role.nombre, role.id]));
  const permissionByName = new Map(permissions.map((permission) => [permission.nombre, permission.id]));

  for (const [roleName, permissionName] of seedRolePermissions) {
    const roleId = roleByName.get(roleName);
    const permissionId = permissionByName.get(permissionName);

    if (roleId && permissionId) {
      await query('INSERT IGNORE INTO rol_permiso (rol_id, permiso_id) VALUES (?, ?)', [roleId, permissionId]);
    }
  }
};

export const getDefaultRoleId = async () => {
  const [rows] = await query('SELECT id FROM roles WHERE nombre = ? LIMIT 1', ['usuario']);
  return rows[0]?.id || null;
};

export const getAccessRowsForUser = async (userId) => {
  const [roleRows] = await query(
    `SELECT DISTINCT r.nombre
     FROM roles r
     INNER JOIN usuario_rol ur ON ur.rol_id = r.id
     WHERE ur.usuario_id = ?
     ORDER BY r.nombre`,
    [userId],
  );

  const [permissionRows] = await query(
    `SELECT DISTINCT p.nombre
     FROM permisos p
     INNER JOIN rol_permiso rp ON rp.permiso_id = p.id
     INNER JOIN usuario_rol ur ON ur.rol_id = rp.rol_id
     WHERE ur.usuario_id = ?
     ORDER BY p.nombre`,
    [userId],
  );

  return {
    roles: roleRows.map((row) => row.nombre),
    permissions: permissionRows.map((row) => row.nombre),
  };
};