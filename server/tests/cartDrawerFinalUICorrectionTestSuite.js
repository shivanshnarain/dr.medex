const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log('DR.MEDEX Global — Equipment Cart Final UI Verification Suite');
console.log('==========================================================');

const cartDrawerPath = path.resolve(__dirname, '../../client/src/components/CartDrawer.tsx');
const cartDrawerSource = fs.readFileSync(cartDrawerPath, 'utf8');

// Test 1: Full Product Name without line clamping or truncation
console.log('\n--- Test 1: Complete Product Name Display ---');
assert(!cartDrawerSource.includes('line-clamp-2'), 'line-clamp-2 must be removed');
assert(!cartDrawerSource.includes('truncate'), 'truncate must not be applied to product title');
assert(cartDrawerSource.includes('break-words whitespace-normal'), 'break-words and whitespace-normal must be present for natural multi-line wrapping');
console.log('✅ [PASS] Complete product name wraps naturally without ellipsis or line-clamp.');

// Test 2: Clean standalone product image with NO borders, containers, or frames
console.log('\n--- Test 2: Clean Standalone Image with No Borders or Containers ---');
assert(cartDrawerSource.includes('rounded-xl border-0 shadow-none outline-none bg-transparent'), 'Image must have direct rounded corners with 0 border/shadow/outline');
assert(cartDrawerSource.includes('object-contain'), 'Original natural aspect ratio preserved via object-contain');
assert(!cartDrawerSource.includes('aspect-square'), 'No square image boxes or forced cropping');
console.log('✅ [PASS] Product image is clean standalone with natural aspect ratio and rounded corners directly on img.');

// Test 3: No per-unit price text
console.log('\n--- Test 3: Single Row Total Price Only ---');
assert(!cartDrawerSource.includes('each)'), 'Per-unit text "(... each)" must be removed completely');
assert(cartDrawerSource.includes('formatPrice(product.basePrice * quantity)'), 'Row total must calculate price * quantity');
console.log('✅ [PASS] Per-unit price text removed; single prominent row total displayed.');

// Test 4: Preserved controls & styling
console.log('\n--- Test 4: Preserved Cart Features ---');
assert(cartDrawerSource.includes('Math.min(50,'), 'Max quantity limit of 50 preserved');
assert(cartDrawerSource.includes('removeFromCart(product.id)'), 'Remove button preserved');
assert(cartDrawerSource.includes('border-dashed border-[#7AA05A]/40'), 'Green dashed separators preserved');
assert(cartDrawerSource.includes('handleApplyCoupon'), 'Coupon input and logic preserved');
console.log('✅ [PASS] Quantity stepper (max 50), remove button, dashed dividers, and coupons fully intact.');

console.log('\n==========================================================');
console.log('ALL FINAL UI CORRECTION TESTS PASSED!');
console.log('==========================================================\n');
