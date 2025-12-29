-- Generalized Scraper Platform Schema
-- Designed to handle any multi-page scraper configuration

-- Main scraper configurations
CREATE TABLE scrapers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    jurisdiction VARCHAR(255),
    state_code VARCHAR(2),
    level VARCHAR(50), -- 'state', 'local', 'federal'
    base_url TEXT NOT NULL,
    start_url TEXT NOT NULL,
    requires_puppeteer BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Additional flexible metadata
);

-- Navigation steps (for pagination, date selection, etc.)
CREATE TABLE navigation_steps (
    id SERIAL PRIMARY KEY,
    scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'click', 'input', 'select', 'wait', 'scroll'
    selector VARCHAR(500),
    xpath VARCHAR(500),
    action_value TEXT, -- Value to input/select
    wait_for_selector VARCHAR(500), -- Selector to wait for after action
    wait_time INTEGER, -- Milliseconds to wait
    comment TEXT,
    is_required BOOLEAN DEFAULT true,
    UNIQUE(scraper_id, step_order)
);

-- Page structure definitions (list pages, detail pages, etc.)
CREATE TABLE page_structures (
    id SERIAL PRIMARY KEY,
    scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
    page_type VARCHAR(50) NOT NULL, -- 'list', 'detail', 'calendar', 'custom'
    page_name VARCHAR(100) NOT NULL,
    container_selector VARCHAR(500), -- Container for list items
    item_selector VARCHAR(500), -- Individual item selector
    has_pagination BOOLEAN DEFAULT false,
    next_button_selector VARCHAR(500),
    prev_button_selector VARCHAR(500),
    comment TEXT,
    UNIQUE(scraper_id, page_type, page_name)
);

-- Field definitions for data extraction
CREATE TABLE scraper_fields (
    id SERIAL PRIMARY KEY,
    scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
    page_structure_id INTEGER REFERENCES page_structures(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'date', 'url', 'html', 'attribute', 'number'
    field_order INTEGER,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    validation_regex VARCHAR(500),
    transformation VARCHAR(50), -- 'trim', 'lowercase', 'uppercase', 'parse_date', 'extract_number'
    comment TEXT
);

-- Selector steps for each field (multi-step capture)
CREATE TABLE field_selector_steps (
    id SERIAL PRIMARY KEY,
    field_id INTEGER REFERENCES scraper_fields(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'click', 'hover', 'wait'
    selector VARCHAR(500),
    xpath VARCHAR(500),
    attribute_name VARCHAR(100), -- For extracting attributes (href, src, etc.)
    wait_after INTEGER, -- Milliseconds to wait after action
    comment TEXT,
    UNIQUE(field_id, step_order)
);

-- Conditional logic for dynamic scrapers
CREATE TABLE scraper_conditions (
    id SERIAL PRIMARY KEY,
    scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
    condition_name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(50) NOT NULL, -- 'element_exists', 'url_contains', 'text_contains'
    selector VARCHAR(500),
    expected_value TEXT,
    action_on_true VARCHAR(50), -- 'skip', 'use_alternative', 'stop'
    action_on_false VARCHAR(50),
    alternative_selector VARCHAR(500),
    comment TEXT
);

-- Scraper execution logs
CREATE TABLE scraper_runs (
    id SERIAL PRIMARY KEY,
    scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50), -- 'running', 'completed', 'failed', 'partial'
    items_found INTEGER DEFAULT 0,
    items_saved INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER,
    metadata JSONB
);

-- Generic scraped data storage (flexible schema)
CREATE TABLE scraped_data (
    id SERIAL PRIMARY KEY,
    scraper_id INTEGER REFERENCES scrapers(id) ON DELETE CASCADE,
    scraper_run_id INTEGER REFERENCES scraper_runs(id) ON DELETE SET NULL,
    data JSONB NOT NULL, -- Flexible JSON storage for all scraped fields
    source_url TEXT,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fingerprint VARCHAR(64) UNIQUE, -- Hash of data for deduplication
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX idx_scrapers_name ON scrapers(name);
CREATE INDEX idx_scrapers_active ON scrapers(active);
CREATE INDEX idx_navigation_steps_scraper ON navigation_steps(scraper_id, step_order);
CREATE INDEX idx_page_structures_scraper ON page_structures(scraper_id);
CREATE INDEX idx_scraper_fields_scraper ON scraper_fields(scraper_id);
CREATE INDEX idx_scraper_fields_page ON scraper_fields(page_structure_id);
CREATE INDEX idx_field_selector_steps_field ON field_selector_steps(field_id, step_order);
CREATE INDEX idx_scraper_runs_scraper ON scraper_runs(scraper_id);
CREATE INDEX idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX idx_scraped_data_scraper ON scraped_data(scraper_id);
CREATE INDEX idx_scraped_data_fingerprint ON scraped_data(fingerprint);
CREATE INDEX idx_scraped_data_data ON scraped_data USING gin(data); -- GIN index for JSON queries

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to scrapers table
CREATE TRIGGER update_scrapers_updated_at BEFORE UPDATE ON scrapers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easier querying
CREATE VIEW scraper_summary AS
SELECT 
    s.id,
    s.name,
    s.description,
    s.jurisdiction,
    s.active,
    COUNT(DISTINCT ps.id) as page_structures_count,
    COUNT(DISTINCT sf.id) as fields_count,
    COUNT(DISTINCT ns.id) as navigation_steps_count,
    MAX(sr.completed_at) as last_run,
    SUM(CASE WHEN sr.status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
    SUM(CASE WHEN sr.status = 'failed' THEN 1 ELSE 0 END) as failed_runs
FROM scrapers s
LEFT JOIN page_structures ps ON s.id = ps.scraper_id
LEFT JOIN scraper_fields sf ON s.id = sf.scraper_id
LEFT JOIN navigation_steps ns ON s.id = ns.scraper_id
LEFT JOIN scraper_runs sr ON s.id = sr.scraper_id
GROUP BY s.id, s.name, s.description, s.jurisdiction, s.active;

-- Sample data for the existing legislative calendar scraper
INSERT INTO scrapers (name, description, jurisdiction, state_code, level, base_url, start_url, requires_puppeteer, metadata)
VALUES (
    'Honolulu City Council Calendar',
    'Scraper for Honolulu City Council meeting calendar',
    'Honolulu',
    'HI',
    'local',
    'https://www.honolulu.gov',
    'https://www.honolulu.gov/clerk/clk-council-calendar/',
    false,
    '{"timezone": "Pacific/Honolulu", "calendar_type": "monthly"}'::jsonb
);

COMMENT ON TABLE scrapers IS 'Main scraper configurations - stores high-level scraper metadata';
COMMENT ON TABLE navigation_steps IS 'Sequential steps for navigating the site (pagination, filters, etc.)';
COMMENT ON TABLE page_structures IS 'Defines the structure of different page types (list vs detail pages)';
COMMENT ON TABLE scraper_fields IS 'Individual fields to extract from pages';
COMMENT ON TABLE field_selector_steps IS 'Multi-step selectors for complex interactions (click popup, then extract)';
COMMENT ON TABLE scraper_conditions IS 'Conditional logic for handling dynamic page structures';
COMMENT ON TABLE scraper_runs IS 'Execution history and statistics';
COMMENT ON TABLE scraped_data IS 'Actual scraped data stored as flexible JSON';
