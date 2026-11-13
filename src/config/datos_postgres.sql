-- 1. Insertar usuarios
INSERT INTO usuarios (id, nombre, email, password_hash, creado_en, status, foto_perfil) VALUES
(1,'Nuvia Yasmin Sanchez Palomino','nuviayasminsanchezpalomino@gmail.com','$2b$10$WrMUCjRyriSdl/8pfRq25./yqFv27NSoNhQfboYYora0g.X4tsMl6','2026-07-19 01:44:17','Activo',NULL),
(2,'Karen Perez Paz','karenpaz@gmail.com','$2b$10$/aMsWu2979snonupvn3oSOCT4ugQEz/11gIufkL3ZIOxDOiadff..','2026-07-19 02:01:09','Activo',NULL),
(3,'Meredith Vazquez','Mervazquez@gmail.com','$2b$10$Elg9VxnXh0RuFwHqRgbyrufMvFvgbEYlU2172PZicHCe1pMfS2lxS','2026-07-20 19:03:34','Activo',NULL),
(4,'Usuario 1','usuario1@gmail.com','12345678','2026-07-24 00:29:00','Activo',NULL),
(5,'Alumno 2','usuario2@gmail.com','12345678','2026-07-24 00:29:00','Activo',NULL),
(6,'Invitado','usuario3@gmail.com','12345678','2026-07-24 00:29:00','Activo',NULL),
(7,'Aldo Cruz','aldocruz@gmail.com','$2b$10$J7hq.G6WHQ99S9le8fWK9e.mFVOIEj4yknZ8VS9WYzGgFSymMGPCi','2026-07-29 22:40:36','Activo',NULL),
(8,'Laura Enriqez','enriquezlau@gmail.com','$2b$10$S1KRlcVEy8mSAlISfqcyAupP6HejnTi.xBfW4nyVew/nNvl78uF8C','2026-07-29 22:41:47','Activo','/uploads/1786601776223.jpg'),
(9,'Nat Villanueva Gonzales','villanuevanat@gmail.com','$2b$10$1mktw5FyiFJAM9gXlfUwQuVxMcsFebLJ3/hDm5YKqnRDjl3n0WNHi','2026-08-01 00:33:44','Activo','/uploads/1791924282132.jpg');

-- 2. Insertar categorías
INSERT INTO categorias (id, nombre) VALUES
(4,'Botanas'),
(2,'Postres'),
(1,'Saladas'),
(3,'Snacks');

-- 3. Insertar permisos
INSERT INTO permisos (id, nombre, descripcion) VALUES
(1,'crear_receta','Permite crear nuevas recetas'),
(2,'editar_receta','Permite editar recetas'),
(3,'eliminar_receta','Permite eliminar recetas'),
(4,'ver_receta','Permite ver recetas'),
(5,'comentar_receta','Permite comentar recetas'),
(6,'dar_like','Permite dar like a recetas'),
(7,'gestionar_usuarios','Permite administrar usuarios y roles'),
(8,'profile:view','Puede ver su perfil'),
(9,'profile:update','Puede editar su perfil'),
(10,'recipes:view','Puede ver recetas'),
(11,'recipes:create','Puede crear recetas'),
(12,'recipes:manage','Puede gestionar recetas'),
(13,'admin:access','Puede acceder al panel de administración');

-- 4. Insertar roles
INSERT INTO roles (id, nombre, descripcion) VALUES
(1,'Administrador','Acceso total al sistema'),
(2,'Editor','Puede crear y modificar recetas'),
(3,'Usuario','Acceso básico para ver y comentar recetas'),
(5,'admin','Administrador del sistema');

-- 5. Insertar recetas
INSERT INTO recetas (id, usuario_id, titulo, descripcion, tiempo_preparacion, creado_en, imagen_url, categoria_id) VALUES
(2,9,'Enchiladas Verdes','Tortillas rellenas de pollo bañadas en salsa verde mexicana.',45,'2026-08-12 18:15:05','/uploads/1786827390476.jpg',1),
(3,9,'Pastel de tres leches','Pastel de tres leches con relleno de fresas con crema',45,'2026-08-13 20:31:43','/uploads/1786653103145.jpg',2),
(4,9,'Cheesecake de frambuesa','Cheesecake Factory Cheesecake - TremBom',60,'2026-08-13 20:41:37','/uploads/1786653697176.jpg',2),
(5,9,'Centinela de la luna','Food photography croissant bakery',60,'2026-08-15 17:12:22','/uploads/1786813942599.jpg',3),
(6,8,'Cupcakes con chispas de chocolate','Panquesitos de vainilla con chispas de chocolate.',110,'2026-08-15 19:04:44','/uploads/1786820684593.jpg',2),
(7,8,'Prueba','uwuw',81,'2026-08-17 01:34:46','/uploads/1786930486752.jpg',4);

-- 6. Insertar ingredientes
INSERT INTO ingredientes (id, receta_id, nombre, cantidad) VALUES
(8,3,'Tortillas de maíz','12 piezas'),
(9,3,'Pechuga de pollo','500g'),
(10,3,'Salsa verde','2 tazas'),
(11,3,'Queso fresco','200g'),
(12,3,'Crema','1 taza'),
(13,4,'Queso crema','200 gr'),
(14,4,'Lechera','1'),
(15,4,'Leche evaporada','1'),
(16,4,'Huevo','4'),
(17,4,'Maizena','30 gr'),
(18,5,'Harina','500 gr'),
(19,5,'Azúcar glass','200 gr'),
(20,6,'Harina de trigo','1 1/2 taza'),
(21,6,'Huevos','2'),
(22,6,'Azúcar','3/4 taza'),
(23,6,'Polvo para hornear','1 1/2 cucharadita'),
(24,6,'Bicarbonato','1/2 cucharadita'),
(25,6,'Mantequilla','1/2 taza'),
(26,6,'Leche','1/2 taza'),
(27,6,'Esencia de vainilla','1 cucharada'),
(28,6,'Sal','1 pizca'),
(29,6,'Chispas de chocolate','1 taza'),
(30,2,'Tortillas de maíz','12 piezas'),
(31,2,'Pechuga de pollo','500g'),
(32,2,'Salsa verde','2 tazas'),
(33,2,'Queso fresco','200g'),
(34,2,'Crema','1 taza'),
(37,7,'Huevos','129');

-- 7. Insertar pasos
INSERT INTO pasos (id, receta_id, paso_numero, descripcion) VALUES
(9,3,1,'Cocer la pechuga de pollo y deshebrar.'),
(10,3,2,'Calentar las tortillas en un comal.'),
(11,3,3,'Rellenar las tortillas con pollo y enrollar.'),
(12,3,4,'Bañar con salsa verde caliente.'),
(13,3,5,'Decorar con queso fresco y crema.'),
(14,4,1,'Mezclar los ingredientes'),
(15,5,1,'Prueba 1'),
(16,6,1,'Precalienta el horno a 180 °C (350 °F) y coloca capacillos en un molde.'),
(17,6,2,'Mezcla los ingredientes secos en un bowl, tamiza la harina, el polvo para hornear y la sal.'),
(18,6,3,'Bate la mantequilla y el azúcar hasta que estén cremosos, luego agrega los huevos uno a uno.'),
(19,6,4,'Incorpora la leche y la harina alternando hasta integrar la mezcla.'),
(20,6,5,'Coloca los capacillos en el molde y hornea durante 18-20 minutos o hasta que un palillo salga seco.'),
(21,6,6,'Deja enfriar y decora con crema batida o glaseado a tu gusto.'),
(22,2,1,'Cocer la pechuga de pollo y deshebrar.'),
(23,2,2,'Calentar las tortillas en un comal.'),
(24,2,3,'Rellenar las tortillas con pollo y enrollar.'),
(25,2,4,'Bañar con salsa verde caliente.'),
(26,2,5,'Decorar con queso fresco y crema.'),
(27,7,1,'Prueba 1');