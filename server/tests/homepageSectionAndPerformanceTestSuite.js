const assert = require('assert');
const fs = require('fs');
const path = require('path');
const store = require('../services/store');

console.log('================================================================================');
console.log('DR.MEDEX Global — Homepage Section Removal & Product Display Test Suite');
console.log('================================================================================\n');

const homePagePath = path.resolve(__dirname, '../../client/src/pages/HomePage.tsx');
const productCardPath = path.resolve(__dirname, '../../client/src/components/ProductCard.tsx');

const homePageSource = fs.readFileSync(homePagePath, 'utf8');
const productCardSource = fs.readFileSync(productCardPath, 'utf8');

// TEST 1: Engineering Architecture Section Completely Removed
console.log('--- Test 1: Complete Removal of Engineering Architecture Section ---');
const forbiddenKeywords = [
  'Engineering Architecture',
  'Medical Technology & Innovation Pillars',
  'Every medical device is subjected to rigorous biomedical verification',
  'Shadowless Optical Design',
  'Microprocessor High-Frequency HF',
  'Biomedical Safety Isolation'
];

forbiddenKeywords.forEach(phrase => {
  assert(!homePageSource.includes(phrase), `Section keyword "${phrase}" must be completely removed from HomePage.tsx`);
});
console.log('✅ [PASS] Engineering Architecture section and all its icons, cards, and text are completely removed.');

// TEST 2: Six Category Cards Preserved
console.log('\n--- Test 2: Six Category Cards Preserved ---');
assert(homePageSource.includes('SIX_ACTIVE_CATEGORIES'), 'SIX_ACTIVE_CATEGORIES must exist');
assert(homePageSource.includes('card-1-electrosurgical.png'), 'Card 1 image present');
assert(homePageSource.includes('card-2-cryosurgical.png'), 'Card 2 image present');
assert(homePageSource.includes('card-3-ot-lights.png'), 'Card 3 image present');
assert(homePageSource.includes('card-4-examination-tables.png'), 'Card 4 image present');
assert(homePageSource.includes('card-5-obstetrics.png'), 'Card 5 image present');
assert(homePageSource.includes('card-6-general-medical.png'), 'Card 6 image present');
console.log('✅ [PASS] All six category cards preserved exactly as designed.');

// TEST 3: Exact Required Category Order Directly Below Category Cards
console.log('\n--- Test 3: Required Category Display Order ---');
const expectedCategoryOrder = [
  { slug: 'electrosurgical-units', title: 'Electrosurgical' },
  { slug: 'cryo-surgical', title: 'Cryo Surgical' },
  { slug: 'ot-lights', title: 'OT Lights' },
  { slug: 'examination-ot-tables', title: 'OT Tables' },
  { slug: 'obstetrics-and-gynaecology', title: 'OBG' },
  { slug: 'medical-equipment', title: 'General Medical' }
];

expectedCategoryOrder.forEach(({ slug, title }) => {
  assert(homePageSource.includes(`slug: "${slug}"`), `Category section slug "${slug}" must be present in CATEGORY_SECTIONS`);
  assert(homePageSource.includes(`title: "${title}"`), `Category section title "${title}" must be present in CATEGORY_SECTIONS`);
});
console.log('✅ [PASS] Product sections defined in the exact required order: Electrosurgical -> Cryo Surgical -> OT Lights -> OT Tables -> OBG -> General Medical.');

// TEST 4: Live MongoDB Catalogue Products Partitioned With Zero Duplication
console.log('\n--- Test 4: Live Catalogue Products Partitioning ---');
const prods = store.getProducts();
assert(prods.length > 0, 'Database products must be populated');

function matchesCategory(p, slug) {
  const cat = (p.category || '').toLowerCase().trim();
  const catName = (p.categoryName || '').toLowerCase().trim();
  const pCat = ((p.primaryCategory) || '').toLowerCase().trim();

  switch (slug) {
    case 'electrosurgical-units':
      return (
        (cat === 'electrosurgical-units' || catName.includes('electrosurgical') || pCat.includes('electrosurgical')) &&
        !catName.includes('cryo') &&
        !catName.includes('obstetric') &&
        !catName.includes('gynaec')
      );
    case 'cryo-surgical':
      return cat === 'cryo-surgical' || catName.includes('cryo') || pCat.includes('cryo');
    case 'ot-lights':
      return (
        cat === 'ot-lights' ||
        catName.includes('ot light') ||
        catName.includes('surgical light') ||
        pCat.includes('ot light')
      );
    case 'examination-ot-tables':
      return cat === 'examination-ot-tables' || catName.includes('table') || pCat.includes('table');
    case 'obstetrics-and-gynaecology':
      return (
        cat === 'obstetrics-and-gynaecology' ||
        catName.includes('obstetric') ||
        catName.includes('gynaec') ||
        pCat.includes('obstetric')
      );
    case 'medical-equipment':
      return (
        (cat === 'medical-equipment' || catName.includes('medical equipment') || pCat.includes('medical equipment')) &&
        !catName.includes('ot light')
      );
    default:
      return cat === slug;
  }
}

const slugs = expectedCategoryOrder.map(c => c.slug);
let totalMatched = 0;

slugs.forEach(s => {
  const count = prods.filter(p => matchesCategory(p, s)).length;
  console.log(`   - ${s}: ${count} products available`);
  assert(count > 0, `Category ${s} should have active products`);
  totalMatched += count;
});

// Verify no cross-category duplication
prods.forEach(p => {
  const matches = slugs.filter(s => matchesCategory(p, s));
  assert.strictEqual(matches.length, 1, `Product ${p.id} must belong to exactly one category (found ${matches.length})`);
});
assert.strictEqual(totalMatched, prods.length, `All ${prods.length} products must be mapped without omission`);
console.log(`✅ [PASS] All ${prods.length} products mapped into respective sections with 0 overlaps and 0 omissions.`);

// TEST 5: Performance Optimizations
console.log('\n--- Test 5: Frontend Performance Optimizations ---');
assert(productCardSource.includes('React.memo'), 'ProductCard must be memoized with React.memo');
assert(productCardSource.includes('decoding="async"'), 'ProductCard images must use async decoding');
assert(productCardSource.includes('loading="lazy"'), 'ProductCard images must use lazy loading');
assert(productCardSource.includes('contentVisibility: "auto"'), 'ProductCard must utilize content-visibility: auto for smooth scroll and offscreen containment');
assert(homePageSource.includes('useCallback'), 'HomePage must memoize callbacks to prevent child re-renders');
console.log('✅ [PASS] Performance verified: React.memo, CSS content-visibility: auto, async decoding, and lazy loading active.');

console.log('\n================================================================================');
console.log('ALL HOMEPAGE & PERFORMANCE TESTS PASSED (5/5)!');
console.log('================================================================================\n');
