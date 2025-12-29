-- Builder Templates Table
-- Stores custom scraper builder templates that define field structures and steps

CREATE TABLE IF NOT EXISTS builder_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100) DEFAULT 'custom',
  
  -- Template structure: array of steps with fields
  steps JSONB NOT NULL,
  -- Example structure:
  -- [
  --   {
  --     "stepNumber": 1,
  --     "stepName": "Metadata",
  --     "stepIcon": "📋",
  --     "fields": [
  --       { "name": "jurisdiction", "type": "text", "required": true, "label": "Jurisdiction Name" },
  --       { "name": "state_code", "type": "select", "required": true, "label": "State Code", "options": [...] }
  --     ]
  --   },
  --   {
  --     "stepNumber": 2,
  --     "stepName": "Page Structure",
  --     "stepIcon": "📅",
  --     "captureMode": true,
  --     "fields": [
  --       { "name": "container", "type": "selector", "required": true, "label": "Container Selector" },
  --       { "name": "item", "type": "selector", "required": true, "label": "Item Selector" }
  --     ]
  --   },
  --   {
  --     "stepNumber": 3,
  --     "stepName": "Data Fields",
  --     "stepIcon": "📝",
  --     "captureMode": true,
  --     "fields": [
  --       { "name": "title", "type": "selector", "required": true, "label": "Title" },
  --       { "name": "date", "type": "selector", "required": true, "label": "Date" },
  --       { "name": "description", "type": "selector", "required": false, "label": "Description" }
  --     ]
  --   }
  -- ]
  
  -- Storage configuration
  storage_config JSONB DEFAULT '{}',
  -- Example:
  -- {
  --   "table": "events",  // Always use unified events table
  --   "eventType": "court_calendar",  // Event classification
  --   "scraperSource": "honolulu_courts",  // Unique scraper identifier
  --   "useMetadata": true,  // Store scraper-specific fields in metadata JSONB
  --   "fieldMapping": {
  --     "core": {  // Maps to events table columns
  --       "name": "events.name",
  --       "date": "events.date",
  --       "location": "events.location_name"
  --     },
  --     "metadata": {  // Maps to events.metadata JSONB
  --       "case_number": "text",
  --       "judge_name": "text",
  --       "hearing_type": "text"
  --     }
  --   }
  -- }
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast template lookups
CREATE INDEX IF NOT EXISTS idx_builder_templates_category ON builder_templates(category);
CREATE INDEX IF NOT EXISTS idx_builder_templates_name ON builder_templates(name);

-- Insert default legislative calendar template
INSERT INTO builder_templates (name, description, category, steps, storage_config)
VALUES (
  'Legislative Calendar Scraper',
  'Default template for scraping legislative/government meeting calendars with events, committees, and bill information',
  'legislative',
  '[
    {
      "stepNumber": 1,
      "stepName": "Metadata",
      "stepIcon": "📋",
      "captureMode": false,
      "fields": [
        { "name": "jurisdiction", "type": "text", "required": true, "label": "Jurisdiction Name", "placeholder": "e.g., City of Boston / State of California" },
        { "name": "state_code", "type": "select", "required": true, "label": "State Code" },
        { "name": "level", "type": "radio", "required": true, "label": "Level", "options": ["state", "local", "federal"] },
        { "name": "calendar_url", "type": "url", "required": true, "label": "Calendar URL", "autofill": "currentUrl" },
        { "name": "base_url", "type": "url", "required": true, "label": "Base URL", "autofill": "baseUrl" },
        { "name": "requires_puppeteer", "type": "radio", "required": true, "label": "Requires Puppeteer?", "options": ["yes", "no", "unknown"], "default": "no" },
        { "name": "notes", "type": "textarea", "required": false, "label": "Notes" }
      ]
    },
    {
      "stepNumber": 2,
      "stepName": "Calendar Structure",
      "stepIcon": "📅",
      "captureMode": true,
      "instruction": "Click buttons below, then click elements on the page to capture selectors",
      "fieldGroups": [
        {
          "groupName": "Navigation (Optional)",
          "fields": [
            { "name": "month_view_button", "type": "selector", "required": false, "label": "Month View Button" },
            { "name": "next_button", "type": "selector", "required": false, "label": "Next Month Button" },
            { "name": "prev_button", "type": "selector", "required": false, "label": "Previous Month Button" }
          ]
        },
        {
          "groupName": "Event List",
          "fields": [
            { "name": "has_event_list", "type": "checkbox", "required": false, "label": "Page has visible event list", "default": true },
            { "name": "event_container", "type": "selector", "required": false, "label": "Event List Container" },
            { "name": "event_item", "type": "selector", "required": false, "label": "Single Event Item" }
          ]
        }
      ]
    },
    {
      "stepNumber": 3,
      "stepName": "Event Fields",
      "stepIcon": "📝",
      "captureMode": true,
      "instruction": "Click buttons to capture event data fields. Supports multi-step captures for modals.",
      "fieldGroups": [
        {
          "groupName": "Required Fields",
          "fields": [
            { "name": "name", "type": "selector", "required": true, "label": "Event Name" },
            { "name": "date", "type": "selector", "required": true, "label": "Date" }
          ]
        },
        {
          "groupName": "Recommended Fields",
          "fields": [
            { "name": "time", "type": "selector", "required": false, "label": "Time" },
            { "name": "location", "type": "selector", "required": false, "label": "Location" },
            { "name": "committee", "type": "selector", "required": false, "label": "Committee" },
            { "name": "details_link", "type": "selector", "required": false, "label": "Details Link" }
          ]
        },
        {
          "groupName": "Optional Fields",
          "fields": [
            { "name": "description", "type": "selector", "required": false, "label": "Description" },
            { "name": "type", "type": "selector", "required": false, "label": "Event Type" },
            { "name": "virtual_link", "type": "selector", "required": false, "label": "Virtual Meeting Link" }
          ]
        }
      ]
    },
    {
      "stepNumber": 4,
      "stepName": "Details Page",
      "stepIcon": "🔍",
      "captureMode": true,
      "optional": true,
      "instruction": "Navigate to a details page and capture additional fields",
      "fieldGroups": [
        {
          "groupName": "Details Page Fields",
          "fields": [
            { "name": "has_details_page", "type": "checkbox", "required": false, "label": "Site has separate detail pages", "default": false },
            { "name": "agenda_url", "type": "selector", "required": false, "label": "Agenda/PDF Link" },
            { "name": "docket_url", "type": "selector", "required": false, "label": "Docket Link" },
            { "name": "details_virtual_link", "type": "selector", "required": false, "label": "Virtual Meeting Link" },
            { "name": "details_description", "type": "selector", "required": false, "label": "Full Description" }
          ]
        },
        {
          "groupName": "Bills/Agenda Items",
          "fields": [
            { "name": "bills_container", "type": "selector", "required": false, "label": "Bill List Container" },
            { "name": "bill_item", "type": "selector", "required": false, "label": "Single Bill Item" }
          ]
        },
        {
          "groupName": "Bill Fields",
          "fields": [
            { "name": "bill_number", "type": "selector", "required": false, "label": "Bill Number" },
            { "name": "bill_title", "type": "selector", "required": false, "label": "Bill Title" },
            { "name": "bill_url", "type": "selector", "required": false, "label": "Bill Link" }
          ]
        }
      ]
    },
    {
      "stepNumber": 5,
      "stepName": "Review & Export",
      "stepIcon": "✅",
      "captureMode": false,
      "showSummary": true,
      "showValidation": true,
      "showPreview": true
    }
  ]'::jsonb,
  '{
    "table": "events",
    "eventType": "legislative_calendar",
    "scraperSource": "custom_legislative",
    "useMetadata": true,
    "fieldMapping": {
      "core": {
        "name": "events.name",
        "date": "events.date",
        "time": "events.time",
        "location_name": "events.location_name",
        "description": "events.description",
        "details_url": "events.details_url",
        "source_url": "events.source_url"
      },
      "metadata": {
        "committee_name": "text",
        "bill_numbers": "array",
        "chair": "text",
        "meeting_type": "text",
        "agenda_url": "text",
        "virtual_meeting_url": "text"
      }
    }
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE builder_templates IS 'Templates that define the structure of scraper builders - essentially "meta-templates" that generate builder interfaces';
COMMENT ON COLUMN builder_templates.steps IS 'Array of step definitions with fields, field types, validation rules, and capture modes';
COMMENT ON COLUMN builder_templates.storage_config IS 'Database storage configuration - always uses unified events table with JSONB metadata';
