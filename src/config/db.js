import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

/**
 * Initializes the MySQL database.
 * Creates the database if it doesn't exist, establishes a connection pool,
 * and initializes tables using the schema.sql file.
 */
export async function initDatabase() {
  try {
    // 1. Create a temporary connection without selecting a database
    const connection = await mysql.createConnection(poolConfig);
    console.log('Successfully connected to MySQL server.');

    // 2. Create the database if it doesn't exist
    const dbName = process.env.DB_NAME || 'bandflow';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database "${dbName}" verified/created.`);
    await connection.end();

    // 3. Create the connection pool with the database specified
    pool = mysql.createPool({
      ...poolConfig,
      database: dbName
    });

    // 4. Initialize tables if they do not exist
    await createTables();

    console.log('Database connection pool established successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Parses and executes the DDL statements in schema.sql to ensure tables exist.
 */
async function createTables() {
  try {
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Strip SQL comments first, then split by semicolon
    const cleanSql = schemaSql.replace(/--.*$/gm, '');
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    const connection = await pool.getConnection();
    try {
      for (const statement of statements) {
        // Skip USE statement as the pool is already connected to the correct database
        if (statement.toUpperCase().startsWith('USE ')) {
          continue;
        }
        await connection.query(statement);
      }
      console.log('Database tables verified/created successfully.');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
}

/**
 * Gets the active database connection pool.
 */
export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Helper utility to query the database.
 */
export async function query(sql, params) {
  return getPool().query(sql, params);
}
