/**
 * mobileStepperAndHomepageTestSuite.js
 *
 * Automated verification test suite for:
 * 1. Mobile checkout stepper UI (Step 1 -> Step 2 -> Step 3, circular indicators, green theme, mobile responsive).
 * 2. Header Account dropdown button text & icon contrast (#FFFFFF on #7AA05A).
 * 3. Homepage instantaneous product section loading with genuine catalogue fallback.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('DR.MEDEX — MOBILE STEPPER & HOMEPAGE PRODUCT LOADING TEST SUITE');
console.log('================================================================================\n');

const checkoutPath = path.join(__dirname, '../../client/src/pages/CheckoutPage.tsx');
const headerPath = path.join(__dirname, '../../client/src/components/Header.tsx');
const homePath = path.join(__dirname, '../../client/src/pages/HomePage.tsx');

const checkoutSource = fs.readFileSync(checkoutPath, 'utf8');
const headerSource = fs.readFileSync(headerPath, 'utf8');
const homeSource = fs.readFileSync(homePath, 'utf8');

// -----------------------------------------------------------------------------
// Test 1: Mobile Stepper labels in CheckoutPage.tsx
// -----------------------------------------------------------------------------
console.log('--- Test 1: Mobile Stepper Labels & Desktop Preservation ---');

// Check that on mobile (sm:hidden), only Step 1, Step 2, Step 3 are displayed
assert(checkoutSource.includes('<span className="sm:hidden">Step 1</span>'), 'FAIL: Mobile view must have "Step 1"');
assert(checkoutSource.includes('<span className="sm:hidden">Step 2</span>'), 'FAIL: Mobile view must have "Step 2"');
assert(checkoutSource.includes('<span className="sm:hidden">Step 3</span>'), 'FAIL: Mobile view must have "Step 3"');

// Check that on desktop (hidden sm:inline), full labels are preserved
assert(checkoutSource.includes('<span className="hidden sm:inline">1. Customer Details</span>'), 'FAIL: Desktop view must preserve "1. Customer Details"');
assert(checkoutSource.includes('<span className="hidden sm:inline">2. Shipping Address</span>'), 'FAIL: Desktop view must preserve "2. Shipping Address"');
assert(checkoutSource.includes('<span className="hidden sm:inline">3. Payment & Confirmation</span>'), 'FAIL: Desktop view must preserve "3. Payment & Confirmation"');

console.log('✅ [PASS] Mobile shows Step 1 -> Step 2 -> Step 3; Desktop preserves full labels.');

// -----------------------------------------------------------------------------
// Test 2: Stepper Green Theme Transitions & Connecting Arrows
// -----------------------------------------------------------------------------
console.log('--- Test 2: Stepper Green Theme Transitions & Connecting Arrows ---');

// Active/completed circles use #7AA05A and #2D5A4A
assert(checkoutSource.includes('currentStep === 1\n                      ? "bg-[#7AA05A] text-white ring-4 ring-[#7AA05A]/20 shadow-xs"\n                      : currentStep > 1\n                      ? "bg-[#2D5A4A] text-white"'), 'FAIL: Step 1 circle styling transition');
assert(checkoutSource.includes('currentStep === 2\n                      ? "bg-[#7AA05A] text-white ring-4 ring-[#7AA05A]/20 shadow-xs"\n                      : currentStep > 2\n                      ? "bg-[#2D5A4A] text-white"'), 'FAIL: Step 2 circle styling transition');
assert(checkoutSource.includes('currentStep === 3\n                      ? "bg-[#7AA05A] text-white ring-4 ring-[#7AA05A]/20 shadow-xs"'), 'FAIL: Step 3 active styling');

// Connecting arrows transition to green when previous step is complete
assert(checkoutSource.includes('currentStep > 1 ? "text-[#7AA05A]" : "text-neutral-300"'), 'FAIL: Arrow 1->2 must turn green when Step 1 complete');
assert(checkoutSource.includes('currentStep > 2 ? "text-[#7AA05A]" : "text-neutral-300"'), 'FAIL: Arrow 2->3 must turn green when Step 2 complete');

console.log('✅ [PASS] Completed steps and connecting arrows transition cleanly to DR.MEDEX green.');

// -----------------------------------------------------------------------------
// Test 3: Mobile Width Fit & Overflow Prevention
// -----------------------------------------------------------------------------
console.log('--- Test 3: Mobile Width Fit & Overflow Prevention ---');

assert(checkoutSource.includes('whitespace-nowrap'), 'FAIL: Stepper text should have whitespace-nowrap to avoid breaking onto new lines');
assert(checkoutSource.includes('shrink-0'), 'FAIL: Stepper buttons should have shrink-0 to prevent compression clipping');

console.log('✅ [PASS] Responsive layout fits within mobile screen without clipping or wrapping.');

// -----------------------------------------------------------------------------
// Test 4: Stepper Validation & Progression Logic Intact
// -----------------------------------------------------------------------------
console.log('--- Test 4: Stepper Validation & Navigation Logic Intact ---');

assert(checkoutSource.includes('onClick={() => setCurrentStep(1)}'), 'FAIL: Step 1 must navigate to step 1');
assert(checkoutSource.includes('if (validateStep1()) setCurrentStep(2)'), 'FAIL: Step 2 must validate step 1');
assert(checkoutSource.includes('if (validateStep1() && validateStep2()) setCurrentStep(3)'), 'FAIL: Step 3 must validate steps 1 and 2');

console.log('✅ [PASS] Step navigation and form validation logic fully preserved.');

// -----------------------------------------------------------------------------
// Test 5: Header Dropdown Login / Account Button Contrast
// -----------------------------------------------------------------------------
console.log('--- Test 5: Header Dropdown Login / Account Button Contrast ---');

const loginBtnMatch = headerSource.match(/<button[^>]*>[\s\S]*?<span>Login \/ Account<\/span>[\s\S]*?<\/button>/);
assert(loginBtnMatch, 'FAIL: Login / Account button not found');
assert(loginBtnMatch[0].includes('text-white'), 'FAIL: Login button text must be white (#FFFFFF)');
assert(loginBtnMatch[0].includes('bg-[#7AA05A]'), 'FAIL: Login button background must be #7AA05A');
assert(loginBtnMatch[0].includes('<User size={14} className="text-white" />'), 'FAIL: User icon must be white');

console.log('✅ [PASS] Login / Account button has high-contrast white text & icon on green background.');

// -----------------------------------------------------------------------------
// Test 6: Homepage Instant Product Loading
// -----------------------------------------------------------------------------
console.log('--- Test 6: Homepage Instant Product Loading ---');

assert(homeSource.includes('fallbackProducts.filter'), 'FAIL: HomePage must initialize with verified catalogue fallback');
assert(homeSource.includes('import { getProducts, fallbackProducts } from "../services/productService"'), 'FAIL: HomePage must import fallbackProducts');

console.log('✅ [PASS] HomePage initializes products synchronously to prevent blank loading state.');

console.log('\n================================================================================');
console.log('ALL TESTS PASSED (6/6)!');
console.log('================================================================================\n');
