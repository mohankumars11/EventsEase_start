// Payment provider abstraction (see blueprint section 34).
// Swapping to a real gateway later means implementing this same
// shape (e.g. via a Supabase Edge Function for order creation and
// signature verification) — no call-site changes needed.
//
// export interface PaymentProvider {
//   createOrder({ amount, currency, receipt }): Promise<{ orderId }>
//   initiatePayment({ orderId, amount, method }): Promise<{ paymentRef, status }>
//   verifyPayment({ orderId, paymentRef }): Promise<{ verified }>
//   handleFailure({ orderId, reason }): Promise<void>
//   refund({ paymentRef, amount }): Promise<{ refundId }>
// }
