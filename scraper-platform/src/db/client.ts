import { Pool, PoolClient } from 'pg';
import { ScraperConfig, Scraper, NavigationStep, PageStructure, ScraperField, FieldSelectorStep, ScraperCondition } from '../types';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'scraper_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

export class ScraperDatabase {
  public pool = pool;

  /**
   * Import a scraper configuration from JSON
   */
  async importScraper(config: ScraperConfig): Promise<number> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert main scraper
      const scraperResult = await client.query(`
        INSERT INTO scrapers (name, description, jurisdiction, state_code, level, base_url, start_url, requires_puppeteer, active, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          jurisdiction = EXCLUDED.jurisdiction,
          state_code = EXCLUDED.state_code,
          level = EXCLUDED.level,
          base_url = EXCLUDED.base_url,
          start_url = EXCLUDED.start_url,
          requires_puppeteer = EXCLUDED.requires_puppeteer,
          active = EXCLUDED.active,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        config.name,
        config.description,
        config.jurisdiction,
        config.stateCode,
        config.level,
        config.baseUrl,
        config.startUrl,
        config.requiresPuppeteer || false,
        config.active !== false,
        JSON.stringify(config.metadata || {})
      ]);
      
      const scraperId = scraperResult.rows[0].id;
      
      // Delete existing related records (cascade will handle this)
      await client.query('DELETE FROM navigation_steps WHERE scraper_id = $1', [scraperId]);
      await client.query('DELETE FROM page_structures WHERE scraper_id = $1', [scraperId]);
      await client.query('DELETE FROM scraper_conditions WHERE scraper_id = $1', [scraperId]);
      
      // Insert navigation steps
      if (config.navigationSteps && config.navigationSteps.length > 0) {
        for (const step of config.navigationSteps) {
          await client.query(`
            INSERT INTO navigation_steps (scraper_id, step_order, step_type, selector, xpath, action_value, wait_for_selector, wait_time, comment, is_required)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            scraperId,
            step.stepOrder,
            step.stepType,
            step.selector,
            step.xpath,
            step.actionValue,
            step.waitForSelector,
            step.waitTime,
            step.comment,
            step.isRequired !== false
          ]);
        }
      }
      
      // Insert page structures and fields
      if (config.pageStructures && config.pageStructures.length > 0) {
        for (const pageStruct of config.pageStructures) {
          const pageResult = await client.query(`
            INSERT INTO page_structures (scraper_id, page_type, page_name, container_selector, item_selector, has_pagination, next_button_selector, prev_button_selector, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
          `, [
            scraperId,
            pageStruct.pageType,
            pageStruct.pageName,
            pageStruct.containerSelector,
            pageStruct.itemSelector,
            pageStruct.hasPagination || false,
            pageStruct.nextButtonSelector,
            pageStruct.prevButtonSelector,
            pageStruct.comment
          ]);
          
          const pageStructureId = pageResult.rows[0].id;
          
          // Insert fields for this page structure
          if (pageStruct.fields && pageStruct.fields.length > 0) {
            for (const field of pageStruct.fields) {
              const fieldResult = await client.query(`
                INSERT INTO scraper_fields (scraper_id, page_structure_id, field_name, field_type, field_order, is_required, default_value, validation_regex, transformation, comment)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
              `, [
                scraperId,
                pageStructureId,
                field.fieldName,
                field.fieldType,
                field.fieldOrder,
                field.isRequired || false,
                field.defaultValue,
                field.validationRegex,
                field.transformation,
                field.comment
              ]);
              
              const fieldId = fieldResult.rows[0].id;
              
              // Insert selector steps for this field
              if (field.selectorSteps && field.selectorSteps.length > 0) {
                for (const selectorStep of field.selectorSteps) {
                  await client.query(`
                    INSERT INTO field_selector_steps (field_id, step_order, action_type, selector, xpath, attribute_name, wait_after, comment)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                  `, [
                    fieldId,
                    selectorStep.stepOrder,
                    selectorStep.actionType,
                    selectorStep.selector,
                    selectorStep.xpath,
                    selectorStep.attributeName,
                    selectorStep.waitAfter,
                    selectorStep.comment
                  ]);
                }
              }
            }
          }
        }
      }
      
      // Insert conditions
      if (config.conditions && config.conditions.length > 0) {
        for (const condition of config.conditions) {
          await client.query(`
            INSERT INTO scraper_conditions (scraper_id, condition_name, condition_type, selector, expected_value, action_on_true, action_on_false, alternative_selector, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            scraperId,
            condition.conditionName,
            condition.conditionType,
            condition.selector,
            condition.expectedValue,
            condition.actionOnTrue,
            condition.actionOnFalse,
            condition.alternativeSelector,
            condition.comment
          ]);
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ Imported scraper: ${config.name} (ID: ${scraperId})`);
      return scraperId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error importing scraper:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Export a scraper configuration to JSON
   */
  async exportScraper(scraperIdOrName: number | string): Promise<ScraperConfig> {
    const client = await pool.connect();
    
    try {
      // Get main scraper - handle both ID and name
      let scraperResult;
      if (typeof scraperIdOrName === 'number') {
        scraperResult = await client.query('SELECT * FROM scrapers WHERE id = $1', [scraperIdOrName]);
      } else {
        // Try parsing as number first, then treat as name
        const numId = parseInt(scraperIdOrName);
        if (!isNaN(numId)) {
          scraperResult = await client.query('SELECT * FROM scrapers WHERE id = $1', [numId]);
        } else {
          scraperResult = await client.query('SELECT * FROM scrapers WHERE name = $1', [scraperIdOrName]);
        }
      }
      
      if (scraperResult.rows.length === 0) {
        throw new Error(`Scraper not found: ${scraperIdOrName}`);
      }
      
      const scraper = scraperResult.rows[0];
      const scraperId = scraper.id;
      
      // Get navigation steps
      const navStepsResult = await client.query(
        'SELECT * FROM navigation_steps WHERE scraper_id = $1 ORDER BY step_order',
        [scraperId]
      );
      
      // Get page structures with fields
      const pageStructsResult = await client.query(
        'SELECT * FROM page_structures WHERE scraper_id = $1',
        [scraperId]
      );
      
      const pageStructures: PageStructure[] = [];
      for (const ps of pageStructsResult.rows) {
        // Get fields for this page structure
        const fieldsResult = await client.query(
          'SELECT * FROM scraper_fields WHERE page_structure_id = $1 ORDER BY field_order',
          [ps.id]
        );
        
        const fields: ScraperField[] = [];
        for (const field of fieldsResult.rows) {
          // Get selector steps for this field
          const selectorStepsResult = await client.query(
            'SELECT * FROM field_selector_steps WHERE field_id = $1 ORDER BY step_order',
            [field.id]
          );
          
          fields.push({
            fieldName: field.field_name,
            fieldType: field.field_type,
            fieldOrder: field.field_order,
            isRequired: field.is_required,
            defaultValue: field.default_value,
            validationRegex: field.validation_regex,
            transformation: field.transformation,
            comment: field.comment,
            selectorSteps: selectorStepsResult.rows.map(ss => ({
              stepOrder: ss.step_order,
              actionType: ss.action_type,
              selector: ss.selector,
              xpath: ss.xpath,
              attributeName: ss.attribute_name,
              waitAfter: ss.wait_after,
              comment: ss.comment
            }))
          });
        }
        
        pageStructures.push({
          pageType: ps.page_type,
          pageName: ps.page_name,
          containerSelector: ps.container_selector,
          itemSelector: ps.item_selector,
          hasPagination: ps.has_pagination,
          nextButtonSelector: ps.next_button_selector,
          prevButtonSelector: ps.prev_button_selector,
          comment: ps.comment,
          fields
        });
      }
      
      // Get conditions
      const conditionsResult = await client.query(
        'SELECT * FROM scraper_conditions WHERE scraper_id = $1',
        [scraperId]
      );
      
      const config: ScraperConfig = {
        name: scraper.name,
        description: scraper.description,
        jurisdiction: scraper.jurisdiction,
        stateCode: scraper.state_code,
        level: scraper.level,
        baseUrl: scraper.base_url,
        startUrl: scraper.start_url,
        requiresPuppeteer: scraper.requires_puppeteer,
        active: scraper.active,
        metadata: scraper.metadata,
        navigationSteps: navStepsResult.rows.map(ns => ({
          stepOrder: ns.step_order,
          stepType: ns.step_type,
          selector: ns.selector,
          xpath: ns.xpath,
          actionValue: ns.action_value,
          waitForSelector: ns.wait_for_selector,
          waitTime: ns.wait_time,
          comment: ns.comment,
          isRequired: ns.is_required
        })),
        pageStructures,
        conditions: conditionsResult.rows.map(c => ({
          conditionName: c.condition_name,
          conditionType: c.condition_type,
          selector: c.selector,
          expectedValue: c.expected_value,
          actionOnTrue: c.action_on_true,
          actionOnFalse: c.action_on_false,
          alternativeSelector: c.alternative_selector,
          comment: c.comment
        }))
      };
      
      return config;
      
    } finally {
      client.release();
    }
  }
  
  /**
   * List all scrapers
   */
  async listScrapers(): Promise<Scraper[]> {
    const result = await pool.query('SELECT * FROM scraper_summary ORDER BY name');
    return result.rows;
  }
  
  /**
   * Get scraper by ID
   */
  async getScraper(id: number): Promise<Scraper | null> {
    const result = await pool.query('SELECT * FROM scrapers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Delete scraper
   */
  async deleteScraper(id: number): Promise<void> {
    await pool.query('DELETE FROM scrapers WHERE id = $1', [id]);
  }
  
  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await pool.end();
  }
}

export const db = new ScraperDatabase();
