CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- TABLAS DE AUTENTICACION


CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT NULL,
    avatar VARCHAR(255) NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_usuarios_actualizado_en
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS usuario_rol (
    usuario_id INT NOT NULL,
    rol_id INT NOT NULL,
    PRIMARY KEY (usuario_id, rol_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rol_permiso (
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);


-- CATALOGO DE CATEGORIAS


CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    imagen VARCHAR(255) NULL
);


-- TABLAS DEL SISTEMA DE RECETAS


CREATE TABLE IF NOT EXISTS recetas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tiempo_preparacion INT,
    imagen VARCHAR(255) NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_recetas_actualizado_en
BEFORE UPDATE ON recetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE IF NOT EXISTS ingredientes (
    id SERIAL PRIMARY KEY,
    receta_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    cantidad VARCHAR(50),
    FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pasos (
    id SERIAL PRIMARY KEY,
    receta_id INT NOT NULL,
    paso_numero INT NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    receta_id INT NOT NULL,
    usuario_id INT NOT NULL,
    comentario TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    receta_id INT NOT NULL,
    usuario_id INT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (receta_id, usuario_id)
);

-- =========================================
-- PERMISOS BASICOS
-- =========================================

INSERT INTO roles (nombre, descripcion) VALUES
('usuario', 'Usuario autenticado estándar'),
('admin', 'Administrador del sistema')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO permisos (nombre, descripcion) VALUES
('profile:view', 'Puede ver su perfil'),
('profile:update', 'Puede editar su perfil'),
('recipes:view', 'Puede ver recetas'),
('recipes:create', 'Puede crear recetas'),
('recipes:manage', 'Puede gestionar recetas'),
('admin:access', 'Puede acceder al panel de administración')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON true
WHERE r.nombre = 'usuario' AND p.nombre IN ('profile:view', 'profile:update', 'recipes:view', 'recipes:create')
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON true
WHERE r.nombre = 'admin' AND p.nombre IN ('profile:view', 'profile:update', 'recipes:view', 'recipes:create', 'recipes:manage', 'admin:access')
ON CONFLICT DO NOTHING;

INSERT INTO categorias (nombre, slug, imagen) VALUES
('Postres', 'postres', 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&w=1200&q=80'),
('Comida Mexicana', 'comida-mexicana', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80'),
('Italiana', 'italiana', 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80'),
('Vegana', 'vegana', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80'),
('Bebidas', 'bebidas', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80'),
('Desayunos', 'desayunos', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80')
ON CONFLICT (nombre) DO NOTHING;