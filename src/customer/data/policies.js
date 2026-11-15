/**
 * Sambramo's customer policies — Terms of Use, Cancellation & Refunds,
 * Privacy, and what masters may and may not supply.
 *
 * DRAFTED 28 Oct 2026 for launch. Not legal advice: these must be reviewed
 * by a lawyer practising consumer and IT law in India before go-live, and
 * the Grievance Officer's name and contact (Consumer Protection
 * (E-Commerce) Rules, 2020, rule 4(5)) must be filled in where marked.
 *
 * The app shows a short summary first and the full text a tap away — the
 * full text is never hidden (the 2020 Rules require refund and
 * cancellation terms to be displayed clearly before purchase).
 *
 * POLICY_VERSION is what a customer agrees to when they verify their OTP;
 * the acceptance is recorded with this version (lib/consent.js). Change
 * the version whenever the substance changes, so the record shows exactly
 * what each customer accepted.
 */
export const POLICY_VERSION = '2026-10-28'
export const GRIEVANCE = { name: '[Grievance Officer — name to be filled before launch]', email: 'grievance@sambramo.com', phone: '[number]', hours: 'Mon–Sat, 10 am – 6 pm' }
export const SUPPORT = { email: 'help@sambramo.com', whatsapp: '[support WhatsApp number]' }

/* The cancellation ladder — the one table every screen quotes. */
export const LADDER = [
  { when: 'Before a master accepts', refund: 'Nothing paid yet', credit: null, note: 'You pay only after a master accepts — withdraw a request free, any time.' },
  { when: 'Within 15 minutes of paying', refund: 'Full refund', credit: null, note: 'Only if the event is at least 72 hours away.' },
  { when: 'More than 15 days before the event', refund: '50% refund', credit: 'or 90% as Sambramo credit', note: '' },
  { when: '7 to 15 days before', refund: '25% refund', credit: 'or 50% as Sambramo credit', note: '' },
  { when: 'Less than 7 days before', refund: 'No refund', credit: 'or 20% as Sambramo credit', note: 'The master has turned other work away for your date.' },
  { when: 'Within 48 hours of the event, or after it starts', refund: 'No refund', credit: null, note: '' },
]

export const POLICIES = {
  cancellation: {
    title: 'Cancellation & refunds',
    short: 'Cancellation',
    summary: [
      'Sending a request is free. You pay only after a master accepts it, and you can withdraw it any time before.',
      'After acceptance, what comes back depends on how far away your event is — choose Sambramo credit and more comes back.',
      'If a master cancels or does not turn up, you get everything back.',
      'Refunds reach your original payment method in 5–7 working days after approval; credit is instant.',
    ],
    sections: [
      { h: '1. How cancellation works', p: [
        'You can cancel any booking from My Bookings → the booking → Cancel. The time you tap Cancel is the time we use. Each master on your plan is a separate booking and is cancelled separately.',
        'What is refunded depends on when you cancel compared with the start of your event (date and time on the booking), as below. Amounts are calculated on the amount you have actually paid for that booking (advance or full).',
      ], table: true },
      { h: '2. What is never refundable', p: [
        'The platform/convenience fee and payment-gateway charges, once a master has accepted.',
        'Anything a master has bought or made specifically for you and has told you about before you paid — for example a custom cake, printed invitations, personalised gifts, flowers ordered for your décor, a venue’s non-refundable deposit. The master’s listing or quote shows this as “made to order”.',
        'Bookings cancelled within 48 hours of the event, or after the event has started.',
      ] },
      { h: '3. Rescheduling instead of cancelling', p: [
        'You may move a booking to a new date once, free, if you ask at least 7 days before the original date and the master accepts the new date. If the master cannot do the new date, the request is treated as a cancellation at the time you asked.',
        'Asked less than 7 days before, a new date is up to the master and may carry their re-booking charge.',
      ] },
      { h: '4. If the master cancels or does not turn up', p: [
        'You get a 100% refund of what you paid for that booking, and we will try to find you another verified master for the same date. If we find one at a higher price you may take it or decline it.',
        'A no-show must be reported in the app (Help → This booking) within 2 hours of the booked start time. We check it against the master’s check-in, location and messages before approving.',
      ] },
      { h: '5. If something goes wrong on the day', p: [
        'Tell us within 24 hours of the end of the event, in the app, with photographs or video where possible. We review the booking record, messages, check-in times, the brief you gave and the master’s account, and may give a partial refund or credit if the service clearly fell short of what was booked.',
        'Dissatisfaction with matters of taste where the service was delivered as listed and briefed (a photographic style, a menu’s seasoning, a song choice) is not a ground for a refund. Choosing “No preference” on a question means any reasonable choice by the master is accepted.',
      ] },
      { h: '6. When no refund is due because of the customer', p: [
        'No refund is due where the service could not be delivered because of the customer or the venue: a wrong or incomplete address, no access to the venue at the booked time, no power or water where the booking said there would be, missing permissions or licences the customer was responsible for, the customer or their guests refusing the service, abusive or unsafe conduct towards the master, or a guest count or requirement far beyond what was booked.',
        'Extra hours, extra guests or extra items asked for on the day are charged at the master’s listed rates.',
      ] },
      { h: '7. Events cancelled by circumstances', p: [
        'If an event cannot take place because of a government order, a natural disaster or a similar event outside anyone’s control, the amount paid becomes Sambramo credit, valid for 12 months, less anything the master had already spent specifically for you. Cash refunds in such cases are at Sambramo’s discretion.',
      ] },
      { h: '8. How and when money comes back', p: [
        'Approved refunds are initiated within 3 working days and reach the original payment method (UPI, card, net banking, wallet) in 5–7 working days, depending on your bank. Sambramo credit is added to your account at once and can be used on any booking for 12 months.',
        'Offers and vouchers used on a booking are not refunded as cash. Where a booking paid partly with a voucher is refunded, only the money you paid is returned, and the voucher is restored only if it is still within its validity.',
      ] },
      { h: '9. Records we rely on', p: [
        'Every decision on a cancellation or refund is made on the booking record: the time of the request, when the master accepted, what was briefed, payments, check-in and check-out, messages in the app, and photos shared by either side. Please keep conversations about a booking inside the app — we cannot take into account arrangements made outside it.',
      ] },
    ],
  },

  terms: {
    title: 'Terms of use',
    short: 'Terms',
    summary: [
      'Sambramo is a marketplace: independent, verified masters provide the services; we connect you, take payment and hold it safely.',
      'By verifying your OTP you agree to these terms and to the cancellation, privacy and master-supply policies.',
      'Keep bookings, messages and payments inside the app — that is how we can protect you.',
    ],
    sections: [
      { h: '1. Who we are and what we do', p: [
        'Sambramo (“we”, “us”) runs an online marketplace for celebrations and events. Service providers listed on Sambramo (“masters”) are independent businesses and professionals. Each booking is a contract between you and the master; Sambramo is an intermediary that lists the master’s offer, takes your payment, holds it, and releases it to the master as described in the cancellation policy and our agreement with masters.',
        'We verify the identity and documents a master submits before their listing goes live. We do not employ masters and do not guarantee a particular result, but we do stand behind the refund rules in our cancellation policy.',
      ] },
      { h: '2. Your account', p: [
        'You sign in with a one-time password sent to your email (and, later, your phone). By entering the OTP you confirm that you are at least 18 years old, that the details you give are true, and that you accept these terms and the policies linked to them. We record the time, the policy version and the device of your acceptance.',
        'You are responsible for activity on your account. Tell us at once if you think someone else has used it.',
      ] },
      { h: '3. Prices, bookings and payment', p: [
        'Prices shown are the master’s prices for what you selected, including the platform’s fee and any applicable taxes unless shown otherwise. Your price is calculated from your answers (hours, guests, quantities); the exact total is confirmed before you pay.',
        'An instant booking is confirmed when payment succeeds. A quote request becomes a booking only when the master accepts and you pay. Some masters take an advance and the balance before the event; the amounts are shown before you pay.',
        'Payments are processed by Razorpay. Sambramo never stores your card details.',
      ] },
      { h: '4. Your responsibilities as the host', p: [
        'Give accurate event details: date, time, address, guest count, venue rules and access, power and water where needed. Arrange any permissions, licences or permits the event requires (for example police permission for processions or loudspeakers, a temporary liquor licence where alcohol is served, venue permissions).',
        'Treat masters and their staff with respect and keep them safe while they work. Masters may stop work if they are threatened or the site is unsafe.',
      ] },
      { h: '5. Things Sambramo does not allow', p: [
        'Masters on Sambramo do not sell or supply alcohol, tobacco, firecrackers that need a licence, or anything illegal. See “What masters supply” for details.',
        'Do not take a booking off the platform to avoid fees, post false reviews, misuse offers (for example multiple accounts for a first-booking offer) or abuse refunds. We may cancel offers, recover benefits and suspend accounts that do.',
      ] },
      { h: '6. Prices, offers, vouchers and referrals', p: [
        'The price shown for a booking is the Sambramo price: it includes the master’s charges and Sambramo’s service, and no booking fee is added at checkout.',
        'Offers have their own conditions (percentage, maximum discount, validity, first booking only where stated). One offer per booking; offers cannot be combined, exchanged for cash or transferred, and may be changed or withdrawn for future use. An offer never takes a booking below the master’s own price; the exact saving is shown before you pay.',
        'Referrals: your friend must sign up with your code before their first booking. Your reward (25% off your next event up to ₹2,500, and 5% off a later event up to ₹1,000) unlocks only when your friend has booked, paid for and completed an event AND you have booked, paid for and completed at least one event of your own. Rewards are not given for self-referrals, duplicate accounts, or cancelled or refunded bookings.',
        'If a booking paid with an offer is cancelled, the refund is calculated on the amount you actually paid and the offer is not reissued.',
      ] },
      { h: '7. Invitations and RSVP', p: [
        'When you add guests to an invitation you confirm that you have their permission to share their name and phone number with Sambramo for that invitation. Guests’ answers and travel details are visible to you as the host. Do not use invitations to send unsolicited or promotional messages.',
      ] },
      { h: '8. Reviews and content', p: [
        'Reviews must be honest and about a booking you made. Photos you share are used to resolve that booking and, if you allow it, to show the master’s work.',
      ] },
      { h: '9. Liability', p: [
        'Sambramo’s responsibility for a booking is limited to the amount you paid through Sambramo for that booking. We are not responsible for losses caused by the master’s acts beyond our refund obligations, by the venue, by guests, or by events outside our control. Nothing here limits rights you have under the Consumer Protection Act, 2019.',
      ] },
      { h: '10. Complaints and grievances', p: [
        `Raise any issue in the app (Help) or write to ${SUPPORT.email}. We acknowledge complaints within 48 hours and aim to resolve them within one month, as the Consumer Protection (E-Commerce) Rules, 2020 require.`,
        `Grievance Officer: ${GRIEVANCE.name}, ${GRIEVANCE.email}, ${GRIEVANCE.phone} (${GRIEVANCE.hours}).`,
      ] },
      { h: '11. Law and courts', p: [
        'These terms are governed by the laws of India. Courts at Bengaluru, Karnataka have jurisdiction, without affecting your right to approach a consumer commission.',
        'We may update these terms; the version you agreed to is recorded, and we will ask you to accept material changes.',
      ] },
    ],
  },

  privacy: {
    title: 'Privacy',
    short: 'Privacy',
    summary: [
      'We collect what a booking needs: your contact, your event details, your location (to find masters near you) and payment status.',
      'Masters see only what they need for your booking. We never sell your data.',
      'You can ask us to delete your account and data at any time.',
    ],
    sections: [
      { h: 'What we collect', p: [
        'Account: name, email, phone. Event: occasion, date, time, venue, guest count, your answers to service questions. Location: your area or GPS position while choosing masters, only with your permission. Payments: status and amount (card and UPI details stay with Razorpay). Invitations: your guests’ names, phone numbers and replies. Device: app version and basic technical data to keep the app working and secure.',
      ] },
      { h: 'How we use it', p: [
        'To show and book masters, to process payments and refunds, to send you updates about your bookings and invitations, to prevent fraud and misuse of offers, and to keep records of bookings and consents as the law requires.',
      ] },
      { h: 'Who sees it', p: [
        'The masters you book see your name, event details, address and phone for that booking. Guests see only the invitation you send them. Service providers who run the app for us (hosting, payments, messaging) process data under contract. We share data with authorities only when the law requires it.',
      ] },
      { h: 'Your choices', p: [
        'You can switch off notifications and location in Settings, ask for a copy of your data, correct it, or ask us to delete your account. Booking and payment records we must keep by law are kept for the period the law sets, then deleted. This policy is written to follow the Digital Personal Data Protection Act, 2023.',
      ] },
    ],
  },

  supply: {
    title: 'What masters supply',
    short: 'Supply rules',
    summary: [
      'No alcohol is sold or supplied through Sambramo.',
      'Cocktail parties are welcome: masters bring mocktail bars, bartending skills, glassware and service.',
      'If you serve alcohol you arrange it yourself, with the licence your state requires.',
    ],
    sections: [
      { h: 'Alcohol at your event', p: [
        'Sambramo and its masters do not sell, buy on your behalf, or supply alcohol. Bar and beverage masters provide mocktails, soft drinks, ice, glassware, bar set-up and trained staff.',
        'Serving alcohol at a private event is regulated by each state. In Karnataka, for example, serving alcohol at a party or event outside a licensed venue needs a temporary (occasional) licence from the Excise Department; several states and union territories prohibit alcohol altogether (including Gujarat, Bihar, Nagaland, Mizoram and Lakshadweep). If you choose to serve alcohol, you are responsible for buying it legally, getting any licence, and serving it only to adults.',
        'Masters may refuse to serve alcohol, and may stop service to anyone who is underage or intoxicated.',
      ] },
      { h: 'Other restricted items', p: [
        'Firecrackers and pyrotechnics only where permitted and only by licensed operators; loudspeakers within the hours and limits local rules allow (generally not between 10 pm and 6 am); no wildlife, banned plastics or anything illegal.',
      ] },
    ],
  },
}
export const POLICY_LIST = ['cancellation', 'terms', 'privacy', 'supply']
