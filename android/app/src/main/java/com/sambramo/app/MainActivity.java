package com.sambramo.app;

import android.os.Bundle;

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
