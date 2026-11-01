/**
 * greenActiveStateTestSuite.js
 *
 * Rigorous automated verification suite for DR.MEDEX Green Active/Selected State UI.
 * Verifies:
 * 1. Product category filters (All Electrosurgical & subcategories) do NOT have black selected backgrounds.
 * 2. Active filters use DR.MEDEX Light Moss Green (#7AA05A) and white/dark green contrast.
 * 3. Header dropdown "Login / Account" button uses light moss green (#7AA05A) background and dark green (#2D5A4A) text/icons.
 * 4. Account page tabs use #7AA05A active state.
 * 5. Sidebar and mobile category filter active states use #7AA05A.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('DR.MEDEX — GLOBAL GREEN ACTIVE/SELECTED STATE TEST SUITE');
console.log('================================================================================\n');

const shopPagePath = path.join(__dirname, '../../client/src/pages/ShopPage.tsx');
const headerPath = path.join(__dirname, '../../client/src/components/Header.tsx');
const accountPagePath = path.join(__dirname, '../../client/src/pages/AccountPage.tsx');
const quickViewPath = path.join(__dirname, '../../client/src/components/QuickViewModal.tsx');

const shopPageSource = fs.readFileSync(shopPagePath, 'utf8');
const headerSource = fs.readFileSync(headerPath, 'utf8');
const accountPageSource = fs.readFileSync(accountPagePath, 'utf8');
const quickViewSource = fs.readFileSync(quickViewPath, 'utf8');

// -----------------------------------------------------------------------------
// Test 1: Category filter pills ("All <Category>" and subcategories) in ShopPage.tsx
// -----------------------------------------------------------------------------
console.log('TEST 1: Category filter pills ("All <Category>" & subcategories) in ShopPage.tsx');

// Ensure "All <Category>" button does NOT use bg-[#111111] or bg-black when selected
assert(
  !shopPageSource.includes('!selectedSubcategory\n                  ? "bg-[#111111]') &&
  !shopPageSource.includes('!selectedSubcategory ? "bg-[#111111]'),
  'FAIL: "All <Category>" button must NOT use bg-[#111111]'
);

// Ensure it uses #7AA05A when selected
assert(
  shopPageSource.includes('!selectedSubcategory') &&
  shopPageSource.includes('bg-[#7AA05A] text-white'),
  'FAIL: "All <Category>" button must use bg-[#7AA05A] text-white when selected'
);

// Ensure subcategory buttons use bg-[#7AA05A] text-white when selected
assert(
  shopPageSource.includes('isSelected') &&
  shopPageSource.includes('bg-[#7AA05A] text-white hover:bg-[#688a4c]'),
  'FAIL: Subcategory filter buttons must use bg-[#7AA05A] text-white hover:bg-[#688a4c]'
);

// Ensure count badge is preserved with high-contrast styling
assert(
  shopPageSource.includes('!selectedSubcategory ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"'),
  'FAIL: Count badge on "All <Category>" must have bg-white/20 text-white when active'
);

console.log('✅ [PASS] Category filter pills use #7AA05A light moss green and no black backgrounds.\n');

// -----------------------------------------------------------------------------
// Test 2: Header dropdown "Login / Account" button in Header.tsx
// -----------------------------------------------------------------------------
console.log('TEST 2: Header dropdown "Login / Account" button in Header.tsx');

// Check that overflow menu Login / Account button uses #7AA05A background and #2D5A4A text
const loginButtonMatch = headerSource.match(/<button[^>]*>[^<]*<User[^>]*>[^<]*<span>Login \/ Account<\/span>[\s\S]*?<\/button>/) ||
  headerSource.match(/<button[^>]*>[\s\S]*?<span>Login \/ Account<\/span>[\s\S]*?<\/button>/);

assert(loginButtonMatch, 'FAIL: Could not locate "Login / Account" button in Header.tsx');
assert(
  loginButtonMatch[0].includes('bg-[#7AA05A]'),
  'FAIL: "Login / Account" button must use bg-[#7AA05A]'
);
assert(
  loginButtonMatch[0].includes('text-[#2D5A4A]'),
  'FAIL: "Login / Account" button must use text-[#2D5A4A]'
);
assert(
  !loginButtonMatch[0].includes('bg-[#111111]') && !loginButtonMatch[0].includes('bg-black'),
  'FAIL: "Login / Account" button must NOT use black background'
);

console.log('✅ [PASS] "Login / Account" button uses #7AA05A background and #2D5A4A dark green text.\n');

// -----------------------------------------------------------------------------
// Test 3: Header mega menu floating dropdown active subcategories
// -----------------------------------------------------------------------------
console.log('TEST 3: Floating mega menu subcategory active state in Header.tsx');

assert(
  headerSource.includes('isSubActive') &&
  headerSource.includes('bg-[#7AA05A] text-white'),
  'FAIL: Mega menu dropdown should highlight active subcategory with bg-[#7AA05A] text-white'
);

console.log('✅ [PASS] Floating mega menu highlights active subcategories in #7AA05A.\n');

// -----------------------------------------------------------------------------
// Test 4: Account Page Navigation Tabs in AccountPage.tsx
// -----------------------------------------------------------------------------
console.log('TEST 4: Account Page Navigation Tabs in AccountPage.tsx');

const accountTabs = ['orders', 'quotes', 'wishlist', 'addresses', 'profile', 'notifications'];
for (const tab of accountTabs) {
  assert(
    accountPageSource.includes(`activeTab === "${tab}" ? "bg-[#7AA05A] text-white"`),
    `FAIL: AccountPage tab "${tab}" must use bg-[#7AA05A] text-white when active`
  );
  assert(
    !accountPageSource.includes(`activeTab === "${tab}" ? "bg-[#111111] text-white"`),
    `FAIL: AccountPage tab "${tab}" must NOT use bg-[#111111] text-white`
  );
}

console.log('✅ [PASS] All 6 Account Page tabs use #7AA05A when active.\n');

// -----------------------------------------------------------------------------
// Test 5: Sidebar and Mobile Category / Rating Filters in ShopPage.tsx
// -----------------------------------------------------------------------------
console.log('TEST 5: Sidebar and Mobile Category / Rating Filters in ShopPage.tsx');

assert(
  shopPageSource.includes('selectedCategory === cat.slug\n                              ? "bg-[#7AA05A] text-white font-bold"'),
  'FAIL: Sidebar category filters must use bg-[#7AA05A] text-white when active'
);

assert(
  shopPageSource.includes('selectedRating === r\n                              ? "bg-[#7AA05A] border-[#7AA05A] text-white font-bold"'),
  'FAIL: Rating filter pills must use bg-[#7AA05A] when active'
);

assert(
  shopPageSource.includes('selectedCategory === cat.slug ? "bg-[#7AA05A] text-white font-bold" : "text-neutral-700 hover:bg-[#F7F7F7] hover:text-[#2D5A4A]"'),
  'FAIL: Mobile filter drawer must use bg-[#7AA05A] for active category'
);

console.log('✅ [PASS] Sidebar and mobile category & rating filters use #7AA05A when selected.\n');

// -----------------------------------------------------------------------------
// Test 6: QuickView modal Add to Cart button
// -----------------------------------------------------------------------------
console.log('TEST 6: QuickView modal Add to Cart button in QuickViewModal.tsx');

assert(
  quickViewSource.includes('bg-[#7AA05A] hover:bg-[#688a4c] text-white'),
  'FAIL: QuickView Add to Cart button must use bg-[#7AA05A] hover:bg-[#688a4c] text-white'
);

console.log('✅ [PASS] QuickView Add to Cart button uses #7AA05A.\n');

console.log('================================================================================');
console.log('ALL GREEN ACTIVE/SELECTED STATE TESTS PASSED (6/6)!');
console.log('================================================================================\n');
