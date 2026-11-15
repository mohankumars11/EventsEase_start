/** Are notifications already allowed? The phone's own answer first, then the browser's. */
export async function alertsGranted() {
  try {
    if (window.Capacitor) { const { PushNotifications } = await import('@capacitor/push-notifications'); return (await PushNotifications.checkPermissions()).receive === 'granted' }
  } catch { /* plugin missing */ }
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}
