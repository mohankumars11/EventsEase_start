package com.sambramo.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * The app shell, and the one thing it has to do that a browser does for
 * free: hand a UPI link to a UPI app.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS FILE STOPPED BEING EMPTY
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay's checkout works by handing the operating system a link —
 * `upi://pay?...`, or an `intent://` URL naming PhonePe or GPay — and
 * letting Android open the right app. Chrome does that automatically.
 *
 * A WebView does not. It receives the URL, has no idea what `upi:` means,
 * and drops it. Nothing throws, nothing is logged, and the tap simply
 * does nothing — which is what "UPI is not visible in the APK" turned
 * out to be, while the identical checkout worked in the phone's browser
 * and took a real rupee.
 *
 * `shouldOverrideUrlLoading` is where a WebView is asked "do you want
 * this, or shall I?". Everything Capacitor already handles is passed
 * straight through to its own client; only the schemes a WebView cannot
 * possibly serve are turned into a real Android Intent.
 *
 * ── This is half of the fix ─────────────────────────────────────────
 * The other half is the `<queries>` block in AndroidManifest.xml. Since
 * Android 11 an app cannot even SEE which other apps are installed
 * unless it declares what it is looking for, so without it Razorpay's
 * check for "is there a UPI app on this phone" comes back empty and it
 * never offers the option in the first place. Neither half works alone.
 */
public class MainActivity extends BridgeActivity {

  /** Schemes a WebView can never render, and Android always can. */
  private static boolean isAppLink(String scheme) {
    if (scheme == null) return false;
    switch (scheme) {
      case "upi":          // the UPI standard itself
      case "intent":       // Android's own app-launch form, used by Razorpay
      case "tez":          // Google Pay
      case "phonepe":
      case "paytmmp":
      case "bhim":
      case "credpay":
        return true;
      default:
        return false;
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    /* Capacitor's own client, extended rather than replaced.
     *
     * Replacing it outright would break the bridge: Capacitor routes its
     * asset loading and its plugin calls through this same class, so a
     * bare WebViewClient here would leave the app unable to load itself.
     * Only the app-link schemes are intercepted; everything else falls
     * through to `super`. */
    getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        if (!isAppLink(url.getScheme())) {
          return super.shouldOverrideUrlLoading(view, request);
        }

        try {
          Intent intent = "intent".equals(url.getScheme())
            ? Intent.parseUri(url.toString(), Intent.URI_INTENT_SCHEME)
            : new Intent(Intent.ACTION_VIEW, url);

          // The WebView is not an activity stack Android can return to.
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          startActivity(intent);
          return true;
        } catch (Exception e) {
          /* No app for it, or a malformed link. Swallowed on purpose:
           * throwing here would crash the app mid-payment, and the
           * customer still has UPI QR, cards and netbanking in the sheet
           * behind this. A failed hand-off must cost one tap, not the
           * booking. */
          return true;
        }
      }
    });
  }
}
