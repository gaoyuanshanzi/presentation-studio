import { neon } from '@neondatabase/serverless';

export function getDbClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  try {
    return neon(connectionString);
  } catch (error) {
    console.error('Failed to initialize Neon DB client:', error);
    return null;
  }
}

export async function initDbTables() {
  const sql = getDbClient();
  if (!sql) return { success: false, message: 'DATABASE_URL is not set.' };

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slide_count INT DEFAULT 1,
        slides_data TEXT NOT NULL,
        zip_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS recordings (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        duration INT DEFAULT 0,
        video_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return { success: true, message: 'Neon DB tables created successfully!' };
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return { success: false, message: error.message };
  }
}
