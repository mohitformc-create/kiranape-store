/**
 * Floating Toast & Connection Status Notification Utility
 */

export function showStoreServerToast(
  message = 'Connecting to store server... please wait 10 seconds.'
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('kiranape_toast', {
        detail: { message },
      })
    );
  } catch (e) {
    console.warn('Toast dispatch error:', e);
  }
}
