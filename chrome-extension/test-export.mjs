// Test JSON export conversion
const state = {
  metadata: {
    jurisdiction: 'Honolulu',
    stateCode: 'HI',
    level: 'local',
    baseUrl: 'https://www.honolulu.gov',
    startUrl: 'https://www.honolulu.gov/clerk/clk-council-calendar/',
    requiresPuppeteer: false,
    notes: 'Test scraper'
  },
  calendarStructure: {
    'event-container': [{
      selector: '.calendar-events',
      xpath: null
    }],
    'event-item': [{
      selector: '.event-item',
      xpath: null
    }],
    'next-button': [{
      selector: '.next-month-btn',
      xpath: null,
      comment: 'Navigate to next month'
    }],
    'prev-button': [{
      selector: '.prev-month-btn',
      xpath: null
    }]
  },
  eventFields: {
    'event-name': [
      {
        selector: '.event-card',
        actionType: 'click',
        comment: 'Click event card to open modal'
      },
      {
        selector: '.modal-title h2',
        actionType: 'extract',
        comment: 'Extract title from modal'
      }
    ],
    'event-date': [
      {
        selector: '.event-date',
        actionType: 'extract',
        comment: 'Extract date from event card'
      }
    ],
    'event-time': [
      {
        selector: '.event-time',
        actionType: 'extract'
      }
    ],
    'event-url': [
      {
        selector: '.event-card a',
        actionType: 'extract',
        attribute: 'href',
        comment: 'Link to event details'
      }
    ]
  },
  detailsPage: {
    'details-description': [
      {
        selector: '.event-description',
        actionType: 'extract',
        comment: 'Full description'
      }
    ]
  }
};

function generateJSON() {
  // Convert extension state to platform JSON format
  const config = {
    name: `${state.metadata.jurisdiction || 'Unknown'} ${state.metadata.level || 'Local'} Calendar`,
    description: `Legislative calendar scraper for ${state.metadata.jurisdiction || 'Unknown'}`,
    jurisdiction: state.metadata.jurisdiction,
    stateCode: state.metadata.stateCode,
    level: state.metadata.level,
    baseUrl: state.metadata.baseUrl,
    startUrl: state.metadata.startUrl || state.metadata.baseUrl,
    requiresPuppeteer: state.metadata.requiresPuppeteer === true || state.metadata.requiresPuppeteer === 'yes',
    active: true,
    metadata: {
      notes: state.metadata.notes || undefined,
      createdWith: 'Chrome Extension Scraper Builder'
    },
    pageStructures: [],
    navigationSteps: []
  };

  // Add navigation steps for calendar pagination
  let navStepOrder = 1;
  if (state.calendarStructure['next-button'] && Array.isArray(state.calendarStructure['next-button']) && state.calendarStructure['next-button'].length > 0) {
    state.calendarStructure['next-button'].forEach((step, idx) => {
      config.navigationSteps.push({
        stepOrder: navStepOrder++,
        stepType: 'click',
        selector: step.selector,
        xpath: step.xpath || undefined,
        comment: step.comment || `Next month button - step ${idx + 1}`
      });
    });
  }

  // Create calendar page structure
  const calendarPage = {
    pageType: 'calendar',
    pageName: 'Calendar View',
    hasPagination: !!(state.calendarStructure['next-button'] || state.calendarStructure['prev-button']),
    fields: []
  };

  // Add container/item selectors if present
  if (state.calendarStructure['event-container'] && Array.isArray(state.calendarStructure['event-container']) && state.calendarStructure['event-container'].length > 0) {
    calendarPage.containerSelector = state.calendarStructure['event-container'][0].selector;
  }
  if (state.calendarStructure['event-item'] && Array.isArray(state.calendarStructure['event-item']) && state.calendarStructure['event-item'].length > 0) {
    calendarPage.itemSelector = state.calendarStructure['event-item'][0].selector;
  }
  if (state.calendarStructure['next-button'] && Array.isArray(state.calendarStructure['next-button']) && state.calendarStructure['next-button'].length > 0) {
    calendarPage.nextButtonSelector = state.calendarStructure['next-button'][0].selector;
  }
  if (state.calendarStructure['prev-button'] && Array.isArray(state.calendarStructure['prev-button']) && state.calendarStructure['prev-button'].length > 0) {
    calendarPage.prevButtonSelector = state.calendarStructure['prev-button'][0].selector;
  }

  // Convert event fields
  let fieldOrder = 1;
  Object.entries(state.eventFields).forEach(([key, steps]) => {
    if (!Array.isArray(steps) || steps.length === 0) return;
    
    const fieldName = key.replace('event-', '').replace(/-/g, '_');
    const field = {
      fieldName: fieldName,
      fieldType: inferFieldType(fieldName),
      fieldOrder: fieldOrder++,
      isRequired: ['name', 'date', 'title'].includes(fieldName),
      transformation: fieldName.includes('date') ? 'parse_date' : (fieldName.includes('name') || fieldName.includes('title') ? 'trim' : undefined),
      comment: `${fieldName} field`,
      selectorSteps: steps.map((step, idx) => ({
        stepOrder: idx + 1,
        actionType: step.actionType || 'extract',
        selector: step.selector,
        xpath: step.xpath || undefined,
        attributeName: step.attribute || undefined,
        waitAfter: step.actionType === 'click' ? 500 : undefined,
        comment: step.comment || undefined
      }))
    };
    calendarPage.fields.push(field);
  });

  config.pageStructures.push(calendarPage);

  // Create detail page structure if there are detail page fields
  const detailFields = [];
  let detailFieldOrder = 1;
  Object.entries(state.detailsPage || {}).forEach(([key, steps]) => {
    if (!Array.isArray(steps) || steps.length === 0) return;
    
    const fieldName = key.replace('details-', '').replace(/-/g, '_');
    const field = {
      fieldName: fieldName,
      fieldType: inferFieldType(fieldName),
      fieldOrder: detailFieldOrder++,
      isRequired: false,
      comment: `${fieldName} from detail page`,
      selectorSteps: steps.map((step, idx) => ({
        stepOrder: idx + 1,
        actionType: step.actionType || 'extract',
        selector: step.selector,
        xpath: step.xpath || undefined,
        attributeName: step.attribute || undefined,
        waitAfter: step.actionType === 'click' ? 500 : undefined,
        comment: step.comment || undefined
      }))
    };
    detailFields.push(field);
  });

  if (detailFields.length > 0) {
    config.pageStructures.push({
      pageType: 'detail',
      pageName: 'Event Detail Page',
      fields: detailFields
    });
  }

  return config;
}

// Infer field type from field name
function inferFieldType(fieldName) {
  if (fieldName.includes('date')) return 'date';
  if (fieldName.includes('url') || fieldName.includes('link')) return 'url';
  if (fieldName.includes('html') || fieldName.includes('description')) return 'html';
  if (fieldName.includes('number') || fieldName.includes('count')) return 'number';
  return 'text';
}

// Test
console.log('🧪 Testing JSON export conversion...\n');
const result = generateJSON();
console.log(JSON.stringify(result, null, 2));
console.log('\n✅ Export test complete!');
console.log(`\n📊 Summary:`);
console.log(`- Name: ${result.name}`);
console.log(`- Jurisdiction: ${result.jurisdiction}`);
console.log(`- Page Structures: ${result.pageStructures.length}`);
console.log(`- Navigation Steps: ${result.navigationSteps.length}`);
console.log(`- Total Fields: ${result.pageStructures.reduce((sum, ps) => sum + ps.fields.length, 0)}`);
