package com.sambramo.app;

import android.os.Bundle;
import android.os.SystemClock;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;

/**
 * The app shell, and the postbox for Razorpay's answer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IMPLEMENTS A PAYMENT LISTENER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay's Android SDK reports the outcome of a payment to the
 * ACTIVITY that opened it, not to whoever called it. That is not a
 * quirk — the customer has been in PhonePe or GPay in the meantime, and
 * the activity result is the only thing Android guarantees survives it.
 *
 * So the listener lives here, and hands the result to RazorpayNative,
 * which is holding the JavaScript call that is waiting for it.
 *
 * ── An earlier attempt in this file, and why it is gone ─────────────
 * A WebViewClient override once sat here to catch `upi://` links. It was
 * never needed: Capacitor's own Bridge.launchIntent already fires an
 * ACTION_VIEW intent for any scheme that is not the app's own. The
 * WebView was not failing to hand the link over — checkout.js was
 * declining to offer UPI at all, which is what the native SDK fixes.
 */
public class MainActivity extends BridgeActivity implements PaymentResultWithDataListener {

  /**
   * The longest the native splash may be held open past the point Android
   * is ready to draw the activity.
   *
   * ══════════════════════════════════════════════════════════════════════
   * WHY THIS IS A DEADLINE AND NOT A CONDITION
   * ══════════════════════════════════════════════════════════════════════
   *
   * The usual shape of setKeepOnScreenCondition is "hold until the content
   * is ready" — a flag the WebView flips once it has painted. That is the
   * documented pattern and it is the wrong one here.
   *
   * Capacitor owns the WebViewClient. Reading "has the WebView painted"
   * means replacing or wrapping it, and a wrapper that misses a callback —
   * a load that errors, a redirect, an OAuth return through the intent
   * filter — leaves the flag false forever. The condition then never goes
   * false, the splash never leaves, and the app is a purple rectangle that
   * cannot be tapped, backed out of, or usefully reported. On a phone held
   * by a master with a job waiting, that is the worst failure this file
   * could contain.
   *
   * A monotonic deadline cannot do that. SystemClock.uptimeMillis() always
   * advances, so the condition always goes false, and the worst case is
   * 700ms of brand rather than an app that will not open.
   *
   * ── And it is not needed for continuity ─────────────────────────────
   * The reason people wait for the WebView is to avoid a flash between the
   * native splash and the web content. There is nothing to avoid: the
   * splash window, the post-splash window background, the Capacitor WebView
   * background and the React overlay are all #2A085C. Any gap is a purple
   * rectangle followed by a purple rectangle.
   *
   * So this buys exactly one thing — the 900ms animated icon getting to
   * finish rather than being cut short on a warm start — and it buys it
   * with no way to hang.
   */
  private static final long SPLASH_CEILING_MS = 700L;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Before super.onCreate and before registerPlugin. installSplashScreen
    // calls setTheme(postSplashScreenTheme), and a theme swapped after
    // BridgeActivity has inflated its content view is a theme applied to
    // nothing.
    SplashScreen splash = SplashScreen.installSplashScreen(this);
    final long deadline = SystemClock.uptimeMillis() + SPLASH_CEILING_MS;
    splash.setKeepOnScreenCondition(() -> SystemClock.uptimeMillis() < deadline);

    // Deliberately no setOnExitAnimationListener. That callback is handed a
    // SplashScreenViewProvider and the splash stays on screen until
    // provider.remove() is called — so any throw before that line freezes
    // the app behind a splash with no timer to recover it. The crossfade it
    // would buy is already free from the React overlay's opacity
    // transition, over a ground that is the same colour either way.

    // Registered BEFORE super.onCreate: Capacitor builds the bridge
    // there, and a plugin registered afterwards is not in it.
    registerPlugin(RazorpayNative.class);
    super.onCreate(savedInstanceState);
  }

  @Override
  public void onPaymentSuccess(String razorpayPaymentId, PaymentData data) {
    RazorpayNative.onSuccess(
      razorpayPaymentId,
      data == null ? null : data.getOrderId(),
      data == null ? null : data.getSignature()
    );
  }

  @Override
  public void onPaymentError(int code, String description, PaymentData data) {
    RazorpayNative.onError(code, description);
  }
}
