# Template Creator Guide

## Overview

The **Template Creator** tab allows you to create custom scraper builder templates that define the step-by-step wizard structure. These templates are saved to PostgreSQL and can be loaded in the Build tab.

## Architecture

- **🏭 Template Tab (ROOT)**: Create builder templates → Save to database
- **🛠️ Build Tab (BRANCH)**: Use templates to build scrapers interactively
- **📚 Library Tab (LEAF)**: Manage and browse scrapers
- **🧪 Test Tab (LEAF)**: Execute scrapers on current page

## Creating a Template

### 1. Basic Information

- **Template Name** (required): Descriptive name like "Court Calendar Scraper"
- **Description** (optional): What kind of data this scraper collects
- **Database Table Name**: Where scraped data will be stored (e.g., `court_calendars`)
- **Auto-create table**: Check if you want the table created automatically

### 2. Adding Steps (Pages)

Click **"➕ Add Step"** to create a new page in the wizard:

1. Enter **Step Name** (e.g., "Metadata", "Calendar Structure", "Event Fields")
2. Choose **Step Icon** (emoji like 📋, 📅, 📝)
3. Enable **Capture Mode** if users should click elements on the page to capture selectors

#### Capture Mode

- **✅ Enabled**: Users click elements on the page to capture CSS selectors (for structure/data extraction)
- **❌ Disabled**: Users fill out a form with text inputs (for metadata like jurisdiction name)

### 3. Adding Fields to Steps

After creating a step, click **"✏️ Edit"** to modify it:

1. Update step name, icon, and capture mode
2. Edit the **fields JSON array** with your field definitions:

```json
[
  {
    "name": "jurisdiction",
    "type": "text",
    "required": true,
    "label": "Jurisdiction Name",
    "placeholder": "e.g., City of Boston"
  },
  {
    "name": "state_code",
    "type": "select",
    "required": true,
    "label": "State Code"
  }
]
```

#### Field Types

- **text**: Simple text input
- **textarea**: Multi-line text
- **select**: Dropdown menu
- **radio**: Radio button group
- **checkbox**: Checkbox
- **selector**: CSS selector (used with Capture Mode)
- **url**: URL input
- **date**: Date picker
- **number**: Numeric input

#### Field Properties

- `name`: Field identifier (snake_case recommended)
- `type`: Field type (see above)
- `required`: Boolean - is this field mandatory?
- `label`: Display label for the field
- `placeholder`: Hint text (optional)
- `default`: Default value (optional)
- `options`: Array of options for select/radio (optional)

### 4. Organizing Steps

- **↑ ↓ Arrows**: Reorder steps up or down
- **✏️ Edit**: Modify step properties and fields
- **🗑️ Delete**: Remove a step

### 5. Preview and Save

- **JSON Preview**: Updates automatically as you build the template
- **💾 Save Template to Database**: Saves to PostgreSQL via API
- **📋 Copy JSON**: Exports template JSON to clipboard

## Example: Legislative Calendar Template

Click **"📋 Load Legislative Template (Example)"** to see a working template with 3 steps:

### Step 1: Metadata (Form Mode)
- Jurisdiction name
- State code
- Government level

### Step 2: Calendar Structure (Capture Mode)
- Event list container selector
- Single event item selector

### Step 3: Event Fields (Capture Mode)
- Event name selector
- Date selector
- Time selector (optional)

## Using Templates in the Build Tab

Once saved:

1. Switch to the **Build** tab
2. Select your template from the dropdown
3. The 5-step wizard will use your template structure
4. Users fill in fields/capture elements as defined
5. Generated scraper configuration saves to library

## Database Schema

Templates are stored in the `builder_templates` table:

```sql
CREATE TABLE builder_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  steps JSONB NOT NULL,  -- Array of step objects
  storage_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

## Tips

1. **Start with Legislative Template**: Load the example to see the structure
2. **Simple First**: Start with 2-3 steps before adding complexity
3. **Capture Mode for Selectors**: Enable capture mode for steps that need CSS selectors
4. **Form Mode for Metadata**: Disable capture mode for text inputs and dropdowns
5. **Test in Build Tab**: After saving, test your template in the Build tab
6. **JSON Editing**: Advanced users can edit fields JSON directly for precise control

## Troubleshooting

**"Template not showing in Build tab"**
- Check that the template saved successfully (green status message)
- Refresh the extension or reload the Build tab
- Verify the API server is running (`npm start` in scraper-platform/)

**"Invalid JSON error when editing fields"**
- Ensure proper JSON syntax (quotes, commas, brackets)
- Use a JSON validator if needed
- Start with the example template structure

**"Can't connect to database"**
- Verify PostgreSQL is running
- Check API server is running on http://localhost:3001
- Run the migration: `psql -d scraper_platform -f database/migrations/004_builder_templates.sql`

## Advanced: Field Groups

For complex forms, you can group fields:

```json
{
  "stepNumber": 1,
  "stepName": "Contact Information",
  "fieldGroups": [
    {
      "groupName": "Primary Contact",
      "fields": [
        {"name": "contact_name", "type": "text", "required": true},
        {"name": "contact_email", "type": "text", "required": true}
      ]
    }
  ]
}
```

## Next Steps

1. Create your first template using the example as reference
2. Test it in the Build tab to verify the wizard flow
3. Share templates by exporting JSON
4. Build a library of reusable templates for different data types
