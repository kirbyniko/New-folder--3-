-- Scraper Templates Table
CREATE TABLE IF NOT EXISTS scraper_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url_pattern TEXT,
  selectors TEXT, -- JSON string of field selectors
  example_url TEXT,
  requires_javascript INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_public INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0
);

-- Insert starter templates
INSERT INTO scraper_templates (id, name, description, category, url_pattern, selectors, example_url, requires_javascript) VALUES
('news-article', 'News Article', 'Extract title, author, date, and content from news articles', 'News', '.*', 
'{"title": "h1, .article-title, .headline", "author": ".author, .byline, [itemprop=\"author\"]", "date": ".published-date, time, .date", "content": ".article-body, .content, article p"}',
'https://example.com/news/article', 0),

('product-listing', 'E-commerce Product', 'Scrape product name, price, description, and images', 'E-commerce', '.*product.*',
'{"name": "h1, .product-name, .product-title", "price": ".price, .product-price, [itemprop=\"price\"]", "description": ".description, .product-description", "images": "img.product-image, .gallery img", "rating": ".rating, .stars", "reviews": ".review-count"}',
'https://example.com/product/123', 0),

('job-posting', 'Job Posting', 'Extract job title, company, salary, and requirements', 'Jobs', '.*job.*|.*career.*',
'{"title": "h1, .job-title", "company": ".company-name, .employer", "location": ".location, .job-location", "salary": ".salary, .pay", "description": ".job-description, .description", "requirements": ".requirements, .qualifications"}',
'https://example.com/jobs/123', 0),

('real-estate', 'Real Estate Listing', 'Scrape property details, price, and features', 'Real Estate', '.*property.*|.*listing.*',
'{"title": "h1, .property-title", "price": ".price, .property-price", "address": ".address, .location", "bedrooms": ".beds, .bedrooms", "bathrooms": ".baths, .bathrooms", "sqft": ".sqft, .square-feet", "description": ".description, .property-description"}',
'https://example.com/listing/123', 0),

('event-listing', 'Event Details', 'Extract event name, date, location, and description', 'Events', '.*event.*',
'{"name": "h1, .event-title, .event-name", "date": ".event-date, time, .date", "time": ".event-time, .time", "location": ".venue, .location", "address": ".address", "description": ".description, .event-description", "price": ".price, .ticket-price"}',
'https://example.com/events/123', 0),

('government-meeting', 'Government Meeting', 'Scrape meeting agendas, dates, and participant info', 'Government', '.*agenda.*|.*meeting.*',
'{"title": "h1, .meeting-title", "date": ".meeting-date, time", "location": ".location, .venue", "committee": ".committee-name", "agenda_items": ".agenda-item, .item", "documents": "a[href$=\".pdf\"], .document-link"}',
'https://example.com/meetings/123', 0),

('social-profile', 'Social Media Profile', 'Extract profile information and posts', 'Social Media', '.*profile.*|.*user.*',
'{"name": "h1, .profile-name, .username", "bio": ".bio, .description", "followers": ".followers-count", "following": ".following-count", "posts": ".post, .tweet", "website": ".website, .link"}',
'https://example.com/profile/user', 1),

('restaurant-menu', 'Restaurant Menu', 'Scrape menu items, prices, and descriptions', 'Food', '.*menu.*|.*restaurant.*',
'{"restaurant": "h1, .restaurant-name", "items": ".menu-item, .dish", "prices": ".price, .cost", "descriptions": ".description, .dish-description", "categories": ".category, .section"}',
'https://example.com/restaurant/menu', 0),

('blog-post', 'Blog Post', 'Extract blog title, author, date, and content', 'Blog', '.*blog.*|.*post.*',
'{"title": "h1, .post-title, .entry-title", "author": ".author, .post-author", "date": ".post-date, time", "content": ".post-content, .entry-content, article", "tags": ".tag, .post-tag", "category": ".category"}',
'https://example.com/blog/post-title', 0),

('academic-paper', 'Academic Paper', 'Extract paper title, authors, abstract, and citations', 'Academic', '.*paper.*|.*article.*|.*doi.*',
'{"title": "h1, .paper-title, .article-title", "authors": ".author, .authors", "abstract": ".abstract", "doi": ".doi", "published": ".published-date", "journal": ".journal-name", "citations": ".citation"}',
'https://example.com/paper/123', 0);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_templates_category ON scraper_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON scraper_templates(name);
