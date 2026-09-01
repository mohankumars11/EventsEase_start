package com.sambramo.app;

import com.getcapacitor.BridgeActivity;

/**
 * Deliberately empty.
 *
 * A WebViewClient override lived here briefly, to catch `upi://` links
 * and hand them to a UPI app. It broke the build, and reading
 * Capacitor's own source showed it was never needed: `Bridge.launchIntent`
 * already fires an ACTION_VIEW intent for any URL whose scheme and host
 * are not the app's own, which is exactly what a `upi://pay?…` link is.
 *
 * What was actually missing is in AndroidManifest.xml. Since Android 11
 * `startActivity` cannot resolve — and Razorpay cannot even detect — an
 * app this one has not declared it is looking for. The <queries> block
 * is the fix; this file is not.
 */
public class MainActivity extends BridgeActivity {}
