// TypeScript types for the generalized scraper platform

export interface ScraperConfig {
  name: string;
  description?: string;
  jurisdiction?: string;
  stateCode?: string;
  level?: 'state' | 'local' | 'federal';
  baseUrl: string;
  startUrl: string;
  requiresPuppeteer?: boolean;
  active?: boolean;
  metadata?: Record<string, any>;
  navigationSteps?: NavigationStep[];
  pageStructures?: PageStructure[];
  conditions?: ScraperCondition[];
}

export interface NavigationStep {
  stepOrder: number;
  stepType: 'click' | 'input' | 'select' | 'wait' | 'scroll';
  selector?: string;
  xpath?: string;
  actionValue?: string;
  waitForSelector?: string;
  waitTime?: number;
  comment?: string;
  isRequired?: boolean;
}

export interface PageStructure {
  pageType: 'list' | 'detail' | 'calendar' | 'custom';
  pageName: string;
  containerSelector?: string;
  itemSelector?: string;
  hasPagination?: boolean;
  nextButtonSelector?: string;
  prevButtonSelector?: string;
  comment?: string;
  fields?: ScraperField[];
}

export interface ScraperField {
  fieldName: string;
  fieldType: 'text' | 'date' | 'url' | 'html' | 'attribute' | 'number';
  fieldOrder?: number;
  isRequired?: boolean;
  defaultValue?: string;
  validationRegex?: string;
  transformation?: 'trim' | 'lowercase' | 'uppercase' | 'parse_date' | 'extract_number';
  comment?: string;
  selectorSteps?: FieldSelectorStep[];
}

export interface FieldSelectorStep {
  stepOrder: number;
  actionType: 'click' | 'hover' | 'wait' | 'extract';
  selector?: string;
  xpath?: string;
  attributeName?: string;
  waitAfter?: number;
  comment?: string;
}

export interface ScraperCondition {
  conditionName: string;
  conditionType: 'element_exists' | 'url_contains' | 'text_contains';
  selector?: string;
  expectedValue?: string;
  actionOnTrue?: 'skip' | 'use_alternative' | 'stop';
  actionOnFalse?: 'skip' | 'use_alternative' | 'stop';
  alternativeSelector?: string;
  comment?: string;
}

export interface ScraperRun {
  id: number;
  scraperId: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'partial';
  itemsFound: number;
  itemsSaved: number;
  errorMessage?: string;
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

export interface ScrapedData {
  id: number;
  scraperId: number;
  scraperRunId?: number;
  data: Record<string, any>;
  sourceUrl?: string;
  scrapedAt: Date;
  fingerprint: string;
  metadata?: Record<string, any>;
}

// Database models
export interface Scraper {
  id: number;
  name: string;
  description?: string;
  jurisdiction?: string;
  stateCode?: string;
  level?: string;
  baseUrl: string;
  startUrl: string;
  requiresPuppeteer: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
