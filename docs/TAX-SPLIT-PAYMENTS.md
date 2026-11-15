# Tax on split payments — token, balance, refunds

For: Mohan and Sambramo's CA. Written 1 Nov 2026, when the app started letting
a customer block a date with a 10% token and pay the rest later. This is the
design the app follows; every rate below changes by notification, so the CA
should confirm them before the first live invoice.

## Who is supplying what

| Money | Supplier | Recipient | GST |
|---|---|---|---|
| The partner's price (food, décor, photos…) | The partner | The customer | The partner's rate for that service (event management 18%; outdoor catering usually 5% without ITC — confirm per trade) — only if the partner is GST-registered |
| Sambramo's margin (list price − partner price) | Sambramo | The customer | 18% (platform service) |

Sambramo is an **e-commerce operator** (ECO). Event services are not among the
s.9(5) services where the ECO pays the partner's GST itself, so the partner
stays the supplier of the service; Sambramo collects TCS and deducts TDS at
payout (below).

## Each payment is a tax event

For services, GST falls due on the **earlier of invoice or payment received**
— so a token is taxed when it is paid, not when the event happens.

| Customer pays | Document the customer must get | GST |
|---|---|---|
| **Token** (10%) or **advance** | **Receipt voucher** (CGST Rule 50) for that amount, from each partner, plus Sambramo's for its fee share | Due on the amount received, that month |
| **Balance** (up to 7 days before) | Another receipt voucher for the balance | Due on the balance, that month |
| **Event delivered** | **Tax invoice** for the full price, adjusting every receipt voucher already issued | Only the difference, if any |
| **Cancelled — refund** | **Refund voucher** (Rule 51), quoting the receipt voucher's number and date | The refunded GST is reversed |

So a token + balance booking produces two receipt vouchers and one final
invoice per partner. If a payment covers several masters, each partner's share
gets its own voucher, because each partner is a separate supplier.

## At payout to the partner (out of escrow, after the event)

| Deduction | Rate today | Law | Applies to |
|---|---|---|---|
| **TCS** | 0.5% of net taxable value (0.25% CGST + 0.25% SGST, or 0.5% IGST) | CGST s.52; rate from 10 Jul 2024 | GST-registered partners; filed in GSTR-8, credited to their cash ledger |
| **TDS** | 0.1% of gross | IT s.194-O, now **s.393(1) of the Income-tax Act 2025** from 1 Apr 2026 | All partners, **except** an individual/HUF with a PAN under ₹5 lakh a year |

Both are deducted once, at payout — not on the token and again on the balance
— and shown as separate lines on the partner's earnings statement
(`src/config/legal.js → TAX`, corrected to these rates on 1 Nov 2026).

## What the customer pays tax on

Nothing extra. GST is inside the price they see (the CCPA dark-pattern rules
forbid revealing GST or fees only at checkout), and income tax does not
apply to paying for an event. A business customer who gives its GSTIN at
checkout can claim input credit where the law allows (not on outdoor catering,
which is blocked under s.17(5)).

## What the app does now, and what is still to build

Done (1 Nov):
- Token, advance or full at the first payment; the balance from My Bookings.
- TCS/TDS rates corrected.

To build before the first live invoice:
1. A receipt-voucher series per supplier (Sambramo + each GST-registered partner): number, date, amount, tax split, place of supply. One per payment per partner.
2. The final tax invoice at delivery, adjusting the receipt vouchers.
3. Refund vouchers on every cancellation refund.
4. Each partner's GSTIN and registration status in onboarding (unregistered partners issue no GST documents; Sambramo still issues its own).
5. GSTR-8 (TCS) and the s.393(1) TDS return from the payout ledger.

## Questions for the CA

1. Are partners' listed prices GST-inclusive? Prices are shown to customers as final.
2. Sambramo's margin: a service to the customer (18% on our invoice) or a commission from the partner?
3. Outdoor catering through Sambramo: 5% without ITC, or 18% when bundled with a venue?
4. Does Sambramo need its own GST registration in every state where events happen, or one, given place of supply is the event's location?

## Sources

- [GST TCS at 0.5% from 10 Jul 2024 (Notification 15/2024)](https://taxgarden.in/blog/gst-on-ecommerce-operators-tcs-section-52-india-2026)
- [CBIC FAQs on TCS](https://www.gstcouncil.gov.in/sites/default/files/2024-02/faqs_tcs.pdf)
- [194-O as s.393(1) under the Income-tax Act 2025](https://blog.tdsman.com/2026/05/tds-on-e-commerce-transactions-section-3931-194o/)
- [194-O at 0.1% from 1 Oct 2024](https://taxguru.in/income-tax/section-194-o-amendment-lower-tds-rate-e-commerce-payments.html)
- [GST Council flyer: advances for future supply](https://gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/51_GST_Flyer_Chapter6.pdf)
- [Receipt and refund vouchers (Rules 50 and 51)](https://www.mastersindia.co/gst/receipt-refund-voucher-to-be-issued-for-advance-payment/)
- [GST on event management, 18%](https://legaldev.in/blog/gst-event-management)
- [GST on catering, 2026](https://disytax.com/gst-for-catering-business/)
