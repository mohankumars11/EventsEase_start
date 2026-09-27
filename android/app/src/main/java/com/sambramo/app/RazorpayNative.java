package com.sambramo.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.razorpay.Checkout;

import org.json.JSONObject;

/**
 * Razorpay's own Android checkout, not the one in the WebView.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE JS CHECKOUT WAS NEVER GOING TO DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay's JS checkout offers UPI in Chrome and refuses to inside an
 * Android WebView. Measured on one account with one order: UPI first in
 * the browser, where a real rupee cleared; cards and netbanking only in
 * the APK.
 *
 * Two things were tried and neither was the answer. `<queries>` in the
 * manifest was necessary — without it the app cannot even see that a UPI
 * app exists — and not sufficient. Handing the sheet to the phone's
 * browser worked, and is not what a shop-bought app does: Zomato does not
 * bounce you into Chrome to pay.
 *
 * This is what they use. The native SDK owns the app-switch: it starts
 * PhonePe or GPay as a real Android activity and gets the result back
 * through the activity lifecycle, which is precisely the guarantee a
 * WebView cannot give and the reason checkout.js declines.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE AWKWARD PART, AND IT IS NOT AVOIDABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Razorpay reports the result to the ACTIVITY, not to whoever opened the
 * sheet — `onPaymentSuccess` and `onPaymentError` are callbacks on
 * MainActivity. So the call that is waiting for an answer has to be
 * reachable from there, and that is what `pending` is for.
 *
 * One at a time, deliberately: two payment sheets cannot be open at once
 * on a phone, so a second call while one is pending is a bug in the
 * caller rather than a case to support.
 */
@CapacitorPlugin(name = "RazorpayNative")
public class RazorpayNative extends Plugin {

  /** The call awaiting Razorpay's answer, or null. See the header. */
  private static PluginCall pending;

  @Override
  public void load() {
    // Warms the SDK so the first sheet is not the slow one.
    Checkout.preload(getContext().getApplicationContext());
  }

  @PluginMethod
  public void open(PluginCall call) {
    String keyId = call.getString("keyId");
    if (keyId == null || keyId.isEmpty()) {
      call.reject("keyId is required");
      return;
    }

    JSObject opts = call.getObject("options");
    if (opts == null) {
      call.reject("options are required");
      return;
    }

    try {
      Checkout checkout = new Checkout();
      checkout.setKeyID(keyId);

      // The call is held rather than resolved: the answer arrives on the
      // activity, seconds or minutes later, after another app has had
      // the foreground.
      call.setKeepAlive(true);
      pending = call;

      checkout.open(getActivity(), new JSONObject(opts.toString()));
    } catch (Exception e) {
      pending = null;
      call.reject("Could not open the payment sheet: " + e.getMessage());
    }
  }

  /* ── Called from MainActivity, which is where Razorpay answers ───── */

  static void onSuccess(String razorpayPaymentId, String orderId, String signature) {
    PluginCall call = pending;
    pending = null;
    if (call == null) return;

    JSObject res = new JSObject();
    res.put("ok", true);
    res.put("razorpay_payment_id", razorpayPaymentId);
    res.put("razorpay_order_id", orderId);
    res.put("razorpay_signature", signature);
    call.resolve(res);
  }

  static void onError(int code, String description) {
    PluginCall call = pending;
    pending = null;
    if (call == null) return;

    JSObject res = new JSObject();
    res.put("ok", false);
    /* Razorpay's own code for "the customer closed the sheet". A
       dismissal is not a failure and the UI must not paint it red. */
    res.put("dismissed", code == Checkout.PAYMENT_CANCELED);
    res.put("code", code);
    res.put("error", description == null ? "Payment did not go through" : description);
    call.resolve(res);
  }
}
