package com.sambramo.app;

import android.os.Bundle;

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


  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Before super.onCreate and before registerPlugin. installSplashScreen
    // calls setTheme(postSplashScreenTheme), and a theme swapped after
    // BridgeActivity has inflated its content view is a theme applied to
    // nothing.
    SplashScreen.installSplashScreen(this);

    /* Installed, and then left alone. No setKeepOnScreenCondition.
     *
     * Holding the system splash open only earns something when there is
     * something on it to look at, and there is not: the icon slot is filled
     * with splash_icon_blank, so this window is a flat amethyst rectangle
     * and nothing else. Every millisecond it is held is a millisecond the
     * real launch screen is not showing, which is the opposite of what was
     * asked for. Unheld, it lasts exactly as long as the cold start needs.
     *
     * Also deliberately no setOnExitAnimationListener. That callback is
     * handed a SplashScreenViewProvider and the splash stays up until
     * provider.remove() is called, so any throw before that line freezes
     * the app behind a splash with nothing to recover it. The crossfade it
     * would buy is free anyway from the React overlay opacity transition,
     * over a ground that is the same colour either way. */

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
