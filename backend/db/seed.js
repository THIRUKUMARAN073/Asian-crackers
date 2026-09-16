import { query, pool } from './database.js';
import { INITIAL_CATALOG } from './catalogData.js';

export const seedDB = async () => {
  console.log('Checking database seed status...');

  // Check if any products already exist
  const existingCountRes = await query('SELECT COUNT(*) FROM products');
  const existingCount = parseInt(existingCountRes.rows[0].count, 10);

  if (existingCount > 0) {
    console.log(`Database already contains ${existingCount} products. Skipping initial seed to preserve admin modifications.`);
    return;
  }

  console.log('Seeding initial wholesale catalog (129 products)...');
  let sortOrder = 0;
  let insertedCount = 0;

  for (const cat of INITIAL_CATALOG) {
    for (const item of cat.items) {
      sortOrder += 1;
      const insertQuery = `
        INSERT INTO products (
          id, catalog_key, category_title, name, tamil, price, per, tags, img, sort_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
        ON CONFLICT (id) DO NOTHING;
      `;

      await query(insertQuery, [
        String(item.id),
        cat.key,
        cat.title,
        item.name,
        item.tamil,
        Number(item.price),
        item.per,
        JSON.stringify(item.tags || []),
        item.img || '',
        sortOrder,
      ]);
      insertedCount += 1;
    }
  }

  console.log(`Successfully seeded ${insertedCount} products into PostgreSQL.`);
};

// Allow direct CLI execution: node db/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  try {
    await seedDB();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}
