import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const postgresPool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),
  max: Number(process.env.DB_CONNECTION_LIMIT || 10),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const prepareQuery = (text, values = []) => {
  let parameterIndex = 0;
  const parameters = [];
  const sql = text.replace(/\?/g, () => {
    const value = values[parameterIndex];

    if (Array.isArray(value)) {
      const placeholders = value.map((item) => {
        parameters.push(item);
        return `$${parameters.length}`;
      });
      parameterIndex += 1;
      return placeholders.length > 0 ? placeholders.join(', ') : 'NULL';
    }

    parameters.push(value);
    parameterIndex += 1;
    return `$${parameters.length}`;
  });

  return { sql, parameters };
};

const query = async (text, values = []) => {
  const prepared = prepareQuery(text, values);
  const result = await postgresPool.query(prepared.sql, prepared.parameters);
  const metadata = {
    affectedRows: result.rowCount,
    insertId: result.rows[0]?.id,
  };

  return [result.rows, metadata];
};

const pool = { query };

export { query };
export default pool;