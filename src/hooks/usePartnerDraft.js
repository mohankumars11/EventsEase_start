/**
 * usePartnerDraft — Draft store for resuming in-progress onboarding
 *
 * Stores baseline inputs and other progress in localStorage per listing_id.
 * Auto-saves on change and restores on reopen.
 */

const DRAFT_KEY_PREFIX = 'partner_draft:'

export function usePartnerDraft(listingId = null) {
  const key = listingId ? `${DRAFT_KEY_PREFIX}${listingId}` : null

  const saveDraft = (data) => {
    if (!key) return
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save draft:', e)
    }
  }

  const loadDraft = () => {
    if (!key) return null
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    } catch (e) {
      console.warn('Failed to load draft:', e)
      return null
    }
  }

  const clearDraft = () => {
    if (!key) return
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('Failed to clear draft:', e)
    }
  }

  return { saveDraft, loadDraft, clearDraft }
}
