// =====================================================
// ADMIN DASHBOARD COMPREHENSIVE TEST SCRIPT
// =====================================================
// Run this in browser console to test all functions
// Open http://localhost:5174/admin and paste this
// =====================================================

console.clear();
console.log('🧪 ADMIN DASHBOARD TEST SUITE v1.0');
console.log('=====================================\n');

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, status, details = '') {
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const message = `${emoji} ${name}`;
  console.log(message + (details ? ` - ${details}` : ''));
  
  if (status === 'pass') testResults.passed.push(name);
  else if (status === 'fail') testResults.failed.push(name);
  else testResults.warnings.push(name);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkElement(selector, name) {
  const el = document.querySelector(selector);
  if (el) {
    logTest(`Element exists: ${name}`, 'pass', selector);
    return true;
  } else {
    logTest(`Element missing: ${name}`, 'fail', selector);
    return false;
  }
}

// =====================================================
// TEST 1: PAGE STRUCTURE
// =====================================================

console.log('\n📋 TEST 1: PAGE STRUCTURE');
console.log('─────────────────────────');

checkElement('[role="tablist"]', 'Tab navigation');
checkElement('button[value="overview"]', 'Overview tab');
checkElement('button[value="partners"]', 'Partners tab');
checkElement('button[value="pending"]', 'Pending tab');
checkElement('button[value="users"]', 'Users tab');
checkElement('button[value="new-users"]', 'New Users tab');
checkElement('button[value="banned"]', 'Banned tab');
checkElement('button[value="offers"]', 'Offers tab');
checkElement('button[value="moderation"]', 'Moderation tab');
checkElement('button[value="financial"]', 'Financial tab');
checkElement('button[value="analytics"]', 'Analytics tab');
checkElement('button[value="health"]', 'Health tab');
checkElement('button[value="audit"]', 'Audit tab');
checkElement('button[value="config"]', 'Config tab');

// =====================================================
// TEST 2: OVERVIEW TAB
// =====================================================

console.log('\n📊 TEST 2: OVERVIEW TAB');
console.log('───────────────────────');

// Click Overview tab
const overviewTab = document.querySelector('button[value="overview"]');
if (overviewTab) {
  overviewTab.click();
  await wait(500);
  
  checkElement('[data-testid="stats-card"]', 'Stats cards') || 
  checkElement('div.grid', 'Stats grid');
  
  logTest('Overview tab clickable', 'pass');
} else {
  logTest('Overview tab', 'fail', 'Not found');
}

// =====================================================
// TEST 3: PARTNERS TAB
// =====================================================

console.log('\n🏢 TEST 3: PARTNERS TAB');
console.log('──────────────────────');

const partnersTab = document.querySelector('button[value="partners"]');
if (partnersTab) {
  partnersTab.click();
  await wait(500);
  
  // Check for table
  const hasTable = checkElement('table', 'Partners table');
  
  // Check for search
  const searchInput = document.querySelector('input[placeholder*="Search"]') || 
                      document.querySelector('input[type="search"]');
  if (searchInput) {
    logTest('Search input', 'pass');
  } else {
    logTest('Search input', 'warn', 'Not found');
  }
  
  // Check for checkboxes (bulk selection)
  const checkboxes = document.querySelectorAll('button[role="checkbox"]');
  if (checkboxes.length > 0) {
    logTest('Bulk selection checkboxes', 'pass', `Found ${checkboxes.length}`);
  } else {
    logTest('Bulk selection checkboxes', 'warn', 'Not found');
  }
  
  // Check for BulkActions component
  const bulkActions = document.querySelector('[data-testid="bulk-actions"]');
  if (bulkActions) {
    logTest('BulkActions component', 'pass');
  } else {
    logTest('BulkActions component', 'warn', 'May appear after selection');
  }
  
  // Check for Add Partner button
  const addButton = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent.includes('Add Partner')
  );
  if (addButton) {
    logTest('Add Partner button', 'pass');
  } else {
    logTest('Add Partner button', 'fail');
  }
  
} else {
  logTest('Partners tab', 'fail');
}

// =====================================================
// TEST 4: USERS TAB
// =====================================================

console.log('\n👥 TEST 4: USERS TAB');
console.log('────────────────────');

const usersTab = document.querySelector('button[value="users"]');
if (usersTab) {
  usersTab.click();
  await wait(500);
  
  checkElement('table', 'Users table');
  
  const searchInput = document.querySelector('input[placeholder*="Search"]');
  if (searchInput) {
    logTest('User search', 'pass');
  } else {
    logTest('User search', 'warn');
  }
  
  // Check if bulk selection exists
  const checkboxes = document.querySelectorAll('button[role="checkbox"]');
  if (checkboxes.length > 0) {
    logTest('Bulk selection (users)', 'pass');
  } else {
    logTest('Bulk selection (users)', 'warn', 'Consider adding');
  }
} else {
  logTest('Users tab', 'fail');
}

// =====================================================
// TEST 5: CONFIG TAB
// =====================================================

console.log('\n⚙️ TEST 5: CONFIG TAB');
console.log('────────────────────');

const configTab = document.querySelector('button[value="config"]');
if (configTab) {
  configTab.click();
  await wait(500);
  
  // Check for SystemConfiguration tabs
  const configTabs = document.querySelectorAll('button[value="points"]') ||
                     document.querySelectorAll('[role="tab"]');
  
  if (configTabs.length > 0) {
    logTest('Configuration tabs', 'pass', `Found ${configTabs.length} tabs`);
  } else {
    logTest('Configuration tabs', 'warn');
  }
  
  // Check for input fields
  const inputs = document.querySelectorAll('input[type="number"]');
  if (inputs.length > 0) {
    logTest('Config input fields', 'pass', `Found ${inputs.length} fields`);
  } else {
    logTest('Config input fields', 'fail');
  }
  
  // Check for Save button
  const saveButton = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent.includes('Save')
  );
  if (saveButton) {
    logTest('Save Configuration button', 'pass');
    
    // Check if disabled (no changes)
    if (saveButton.disabled) {
      logTest('Save button state', 'pass', 'Correctly disabled when no changes');
    }
  } else {
    logTest('Save Configuration button', 'fail');
  }
} else {
  logTest('Config tab', 'fail');
}

// =====================================================
// TEST 6: OFFERS TAB
// =====================================================

console.log('\n🍽️ TEST 6: OFFERS TAB');
console.log('────────────────────');

const offersTab = document.querySelector('button[value="offers"]');
if (offersTab) {
  offersTab.click();
  await wait(500);
  
  checkElement('table', 'Offers table');
  
  // Check for bulk operations
  const checkboxes = document.querySelectorAll('button[role="checkbox"]');
  if (checkboxes.length > 0) {
    logTest('Bulk selection (offers)', 'pass');
  } else {
    logTest('Bulk selection (offers)', 'warn', 'Consider adding for mass pause/resume');
  }
} else {
  logTest('Offers tab', 'fail');
}

// =====================================================
// TEST 7: PENDING PARTNERS TAB
// =====================================================

console.log('\n⏳ TEST 7: PENDING PARTNERS TAB');
console.log('──────────────────────────────');

const pendingTab = document.querySelector('button[value="pending"]');
if (pendingTab) {
  pendingTab.click();
  await wait(500);
  
  checkElement('table', 'Pending partners table');
  
  // Check for action buttons
  const approveButtons = Array.from(document.querySelectorAll('button')).filter(
    btn => btn.textContent.includes('Approve')
  );
  const rejectButtons = Array.from(document.querySelectorAll('button')).filter(
    btn => btn.textContent.includes('Reject')
  );
  
  if (approveButtons.length > 0) {
    logTest('Approve buttons', 'pass', `Found ${approveButtons.length}`);
  }
  if (rejectButtons.length > 0) {
    logTest('Reject buttons', 'pass', `Found ${rejectButtons.length}`);
  }
} else {
  logTest('Pending tab', 'fail');
}

// =====================================================
// TEST 8: ANALYTICS TAB
// =====================================================

console.log('\n📈 TEST 8: ANALYTICS TAB');
console.log('───────────────────────');

const analyticsTab = document.querySelector('button[value="analytics"]');
if (analyticsTab) {
  analyticsTab.click();
  await wait(500);
  
  // Check for charts/graphs
  const charts = document.querySelectorAll('svg') || 
                 document.querySelectorAll('canvas');
  if (charts.length > 0) {
    logTest('Analytics charts', 'pass', `Found ${charts.length} charts`);
  } else {
    logTest('Analytics charts', 'warn', 'No charts detected');
  }
} else {
  logTest('Analytics tab', 'fail');
}

// =====================================================
// TEST SUMMARY
// =====================================================

console.log('\n');
console.log('=====================================');
console.log('🏁 TEST SUMMARY');
console.log('=====================================');
console.log(`✅ Passed: ${testResults.passed.length}`);
console.log(`❌ Failed: ${testResults.failed.length}`);
console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
console.log('');

if (testResults.failed.length > 0) {
  console.log('❌ FAILED TESTS:');
  testResults.failed.forEach(t => console.log(`  - ${t}`));
  console.log('');
}

if (testResults.warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  testResults.warnings.forEach(t => console.log(`  - ${t}`));
  console.log('');
}

const totalTests = testResults.passed.length + testResults.failed.length + testResults.warnings.length;
const successRate = ((testResults.passed.length / totalTests) * 100).toFixed(1);

console.log(`Success Rate: ${successRate}%`);
console.log('=====================================\n');

// Export results
window.adminTestResults = testResults;
console.log('💾 Results saved to window.adminTestResults');
console.log('Run: copy(JSON.stringify(window.adminTestResults, null, 2))');
console.log('to copy results to clipboard');
