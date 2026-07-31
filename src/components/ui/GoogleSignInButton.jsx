/**
 * GoogleSignInButton
 *
 * A pixel-accurate recreation of Google's official sign-in button.
 *
 * IMPORTANT: Requires Google OAuth to be enabled in your Supabase dashboard:
 *   1. Go to Authentication → Providers → Google
 *   2. Enter your Google Client ID and Secret from Google Cloud Console
 *   3. Add the Supabase callback URL as an authorized redirect URI in GCP
 *
 * Props:
 *   onClick   — async handler (usually `signInWithGoogle` from useAuth)
 *   label     — button text (default: "Continue with Google")
 *   disabled  — disable the button
 *   loading   — show a loading spinner instead of the Google icon
 *   fullWidth — make the button full-width (default true)
 */
export default function GoogleSignInButton({
  onClick,
  label = 'Continue with Google',
  disabled = false,
  loading = false,
  fullWidth = true,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: fullWidth ? '100%' : 'auto',
        height: '44px',
        padding: '0 16px',
        backgroundColor: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: '22px',
        fontFamily: "'Inter', 'Roboto', 'Google Sans', system-ui, sans-serif",
        fontSize: '14px',
        fontWeight: '500',
        color: '#3c4043',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.7 : 1,
        transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = '#f8f9fa'
          e.currentTarget.style.borderColor = '#c0c4c9'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(60,64,67,0.15), 0 1px 2px rgba(60,64,67,0.10)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff'
        e.currentTarget.style.borderColor = '#dadce0'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66,133,244,0.25)'
        e.currentTarget.style.borderColor = '#4285f4'
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = '#dadce0'
      }}
      aria-label={label}
    >
      {/* Icon area */}
      <span
        style={{
          width: '20px',
          height: '20px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          /* Spinner */
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            style={{ animation: 'spin 0.8s linear infinite' }}
          >
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <circle cx="9" cy="9" r="7" stroke="#dadce0" strokeWidth="2.5" />
            <path d="M9 2a7 7 0 0 1 7 7" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          /* Official Google "G" multi-color logo */
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
            />
            <path
              fill="#34A853"
              d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
            />
            <path
              fill="#FBBC05"
              d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
            />
            <path
              fill="#EA4335"
              d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
            />
          </svg>
        )}
      </span>

      {/* Label */}
      <span>{loading ? 'Signing in…' : label}</span>
    </button>
  )
}
