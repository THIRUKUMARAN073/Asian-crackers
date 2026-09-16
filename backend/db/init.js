import { query, pool } from './database.js';

export const initDB = async () => {
  console.log('Running database migrations...');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      catalog_key VARCHAR(10) NOT NULL,
      category_title VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      tamil VARCHAR(255) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      per VARCHAR(50) NOT NULL,
      tags JSONB DEFAULT '[]'::jsonb,
      img TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_products_catalog_key ON products(catalog_key);
    CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
    CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
  `;

  await query(createTableQuery);
  console.log('Database schema verified / initialized successfully.');
};

// Allow direct CLI execution: node db/init.js
if (process.argv[1] && process.argv[1].endsWith('init.js')) {
  try {
    await initDB();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}
