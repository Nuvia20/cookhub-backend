-- Ejecutar una vez en la base de datos de Render si ya existe una secuencia desincronizada.
SELECT setval(
  pg_get_serial_sequence('ingredientes', 'id'),
  COALESCE(MAX(id), 0) + 1,
  false
)
FROM ingredientes;

SELECT setval(
  pg_get_serial_sequence('pasos', 'id'),
  COALESCE(MAX(id), 0) + 1,
  false
)
FROM pasos;

SELECT setval(
  pg_get_serial_sequence('recetas', 'id'),
  COALESCE(MAX(id), 0) + 1,
  false
)
FROM recetas;