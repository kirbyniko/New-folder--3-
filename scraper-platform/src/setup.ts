// Quick database setup using pg client
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setup() {
  console.log('🔧 Setting up Scraper Platform Database...');
  
  // Connect to postgres database to create our database
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'password',
  });
  
  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Drop and create database
    try {
      await adminClient.query('DROP DATABASE IF EXISTS scraper_platform');
      console.log('🗑️  Dropped existing database');
    } catch (err: any) {
      console.log('⚠️  No existing database to drop');
    }
    
    await adminClient.query('CREATE DATABASE scraper_platform');
    console.log('📦 Created database: scraper_platform');
    
    await adminClient.end();
    
    // Connect to new database to run schema
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'scraper_platform',
      user: 'postgres',
      password: 'password',
    });
    
    await client.connect();
    console.log('✅ Connected to scraper_platform database');
    
    // Read and execute schema
    const schemaPath = join(__dirname, '../schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    console.log('📋 Applying schema...');
    await client.query(schema);
    console.log('✅ Schema applied successfully!');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:');
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    await client.end();
    
    console.log('\n✨ Setup complete!');
    console.log('📊 Connection string: postgresql://postgres:password@localhost:5432/scraper_platform');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setup();
