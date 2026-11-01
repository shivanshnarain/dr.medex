import { ResolvedLocationData } from "../components/SmartLocationPrompt";

/**
 * In-memory Session Controller for DR.MEDEX Buy Now & Location Permission
 * 
 * CORE ARCHITECTURAL INVARIANTS:
 * 1. Resets naturally on every fresh page load (in-memory variable, strictly NO localStorage / sessionStorage persistence).
 * 2. On 1st Buy Now click of the page load -> triggers custom DR.MEDEX Location modal.
 * 3. On 2nd+ Buy Now click in the same page load -> skips custom modal, proceeds directly to checkout.
 * 4. After page reload (F5 / Cmd+R / browser reload) -> resets to false, so next Buy Now click displays modal again.
 * 5. Debounces rapid multiple clicks to prevent duplicate navigation, race conditions, or duplicate modal mounting.
 */

// In-memory per-page-load state
let isLocationPopupHandledThisPageLoad = false;
let cachedDetectedLocation: ResolvedLocationData | null = null;
let isRapidClickLocked = false;
let lockTimeout: any = null;

export const buyNowLocationController = {
  /**
   * Has the custom location modal been handled in this page load?
   */
  isHandled(): boolean {
    return isLocationPopupHandledThisPageLoad;
  },

  /**
   * Mark that the location modal has been handled (allowed, manual entry, or closed)
   */
  markHandled(): void {
    isLocationPopupHandledThisPageLoad = true;
  },

  /**
   * Get cached location detected during this page load
   */
  getCachedLocation(): ResolvedLocationData | null {
    return cachedDetectedLocation;
  },

  /**
   * Cache location detected during this page load
   */
  setCachedLocation(location: ResolvedLocationData | null): void {
    cachedDetectedLocation = location;
  },

  /**
   * Reset in-memory state (resets on page reload, or test execution)
   */
  resetState(): void {
    isLocationPopupHandledThisPageLoad = false;
    cachedDetectedLocation = null;
    isRapidClickLocked = false;
    if (lockTimeout) {
      clearTimeout(lockTimeout);
      lockTimeout = null;
    }
  },

  /**
   * Acquire a debounce lock to prevent duplicate rapid clicks
   * Returns true if lock was acquired, false if already locked
   */
  acquireLock(): boolean {
    if (isRapidClickLocked) return false;
    isRapidClickLocked = true;
    if (lockTimeout) clearTimeout(lockTimeout);
    lockTimeout = setTimeout(() => {
      isRapidClickLocked = false;
    }, 1200);
    return true;
  },

  /**
   * Release the debounce lock
   */
  releaseLock(): void {
    isRapidClickLocked = false;
    if (lockTimeout) {
      clearTimeout(lockTimeout);
      lockTimeout = null;
    }
  }
};

