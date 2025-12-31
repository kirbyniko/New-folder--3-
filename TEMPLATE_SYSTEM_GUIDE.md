# 📋 Scraper Template System

A complete template management system that makes web scraping accessible for everyone.

## 🎯 What This Solves

**Problem**: Users struggle to create scrapers from scratch
**Solution**: Pre-built templates with common patterns + easy customization

## ✨ Features

### 1. **Database-Backed Templates**
- Cloudflare D1 storage
- 10 pre-configured starter templates
- Real-time sync across devices
- Usage tracking and analytics

### 2. **10 Starter Templates**

| Template | Use Case | Fields | JS Required |
|----------|----------|--------|-------------|
| **News Article** | News sites | title, author, date, content | ❌ |
| **E-commerce Product** | Shopping sites | name, price, images, rating | ❌ |
| **Job Posting** | Job boards | title, company, salary, requirements | ❌ |
| **Real Estate** | Property listings | price, address, beds, baths | ❌ |
| **Event Details** | Event pages | name, date, location, price | ❌ |
| **Government Meeting** | Gov websites | title, agenda, documents | ❌ |
| **Social Profile** | Social media | name, bio, followers, posts | ✅ |
| **Restaurant Menu** | Food sites | items, prices, descriptions | ❌ |
| **Blog Post** | Blogs | title, author, content, tags | ❌ |
| **Academic Paper** | Research sites | title, authors, abstract, DOI | ❌ |

### 3. **Smart UI**
- ✅ Modal-based creation flow
- ✅ Category grouping
- ✅ Usage statistics
- ✅ One-click template selection
- ✅ Visual feedback

### 4. **API Endpoints**

```bash
# List all templates
GET /api/scraper-templates

# Filter by category
GET /api/scraper-templates?category=News

# Search templates
GET /api/scraper-templates?search=product

# Get single template
GET /api/scraper-templates?id=news-article

# Create template
POST /api/scraper-templates
{
  "name": "My Template",
  "category": "Custom",
  "selectors": { "title": "h1" }
}

# Update template
PUT /api/scraper-templates?id=xyz
{
  "name": "Updated Name"
}

# Delete template
DELETE /api/scraper-templates?id=xyz
```

## 🚀 Setup

### 1. Apply Database Migration

```powershell
# Run the setup script
.\setup-templates.ps1
```

Or manually:
```bash
npx wrangler d1 execute DB --file=database/scraper-templates.sql
```

### 2. Verify Templates

```bash
# Query templates
npx wrangler d1 execute DB --command="SELECT name, category FROM scraper_templates"
```

### 3. Test API

```bash
curl https://civitracker.pages.dev/api/scraper-templates
```

## 💡 Usage

### For Users

1. **Open Templates Tab**
   - Click "🏭 Templates" in sidebar

2. **Browse Templates**
   - Grouped by category
   - Shows field count and usage stats
   - Example URLs provided

3. **Create New Template**
   - Click "+ New Template"
   - Fill in name, description, category
   - Add example URL

4. **Use Template**
   - Click "Use Template" button
   - Switch to Builder tab
   - Configure selectors

### For Developers

```javascript
import { TemplateManager } from './src/components/TemplateManager.js';

// Initialize
const manager = new TemplateManager();

// Load templates from API
await manager.loadTemplates();

// Create template
await manager.saveTemplateToAPI({
  name: 'Custom Template',
  category: 'Custom',
  selectors: {
    title: 'h1.main-title',
    content: '.article-body'
  }
});

// Listen for template selection
window.addEventListener('template-selected', (e) => {
  const template = e.detail;
  console.log('Template selected:', template);
});
```

## 📊 Database Schema

```sql
CREATE TABLE scraper_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url_pattern TEXT,
  selectors TEXT, -- JSON
  example_url TEXT,
  requires_javascript INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_public INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0
);
```

## 🎨 Categories

- **News** 📰 - Articles, press releases
- **E-commerce** 🛒 - Products, listings
- **Jobs** 💼 - Job postings, careers
- **Real Estate** 🏠 - Properties, rentals
- **Events** 📅 - Conferences, meetups
- **Government** 🏛️ - Meetings, documents
- **Social Media** 👥 - Profiles, posts
- **Food** 🍽️ - Menus, restaurants
- **Blog** ✍️ - Posts, articles
- **Academic** 🎓 - Papers, research
- **Custom** ⚙️ - User-created

## 🔧 Extending

### Add New Template

```sql
INSERT INTO scraper_templates 
(id, name, description, category, selectors, example_url) 
VALUES 
('my-template', 'My Template', 'Description', 'Custom', 
 '{"field": "selector"}', 'https://example.com');
```

### Add New Category

Just use a new category name - it will auto-group in the UI!

## 🎯 Benefits for Users

1. **No Technical Knowledge Required**
   - Click to select template
   - See example URLs
   - Pre-configured selectors

2. **Learn by Example**
   - 10 working templates
   - Common patterns demonstrated
   - Easy to modify

3. **Save Time**
   - No manual selector writing
   - Proven patterns
   - One-click start

4. **Build Confidence**
   - Start with working templates
   - Gradually customize
   - See immediate results

## 📈 Analytics

Templates track:
- **use_count** - How many times used
- **created_at** - When created
- **updated_at** - Last modification

Most popular templates appear first in the UI!

## 🔒 Security

- ✅ CORS enabled for browser access
- ✅ SQL injection protection (parameterized queries)
- ✅ Public/private template support
- ✅ User-specific templates (future)

## 🎉 Success!

Your users can now:
- ✅ Browse 10 professional templates
- ✅ Create custom templates easily
- ✅ Use templates with one click
- ✅ Learn from examples
- ✅ Get started without technical knowledge

**No more blank slate paralysis!** 🚀
