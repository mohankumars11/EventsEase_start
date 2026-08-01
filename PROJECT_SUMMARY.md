# EventsEase — Project Summary

> India's Event Services Marketplace  
> Connects customers with verified local event vendors (like Zomato for events)

---

## What Was Built

### Architecture
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend/Auth:** Supabase (PostgreSQL + Auth)
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Animations:** CSS + IntersectionObserver (no external animation library)
- **Deployment-ready:** Vite build, PWA manifest included

---

## Project Structure

```
c:\EventsEase\
├── src/
│   ├── App.jsx                          # Root router + protected routes
│   ├── index.css                        # Tailwind + animation utilities
│   ├── main.jsx                         # React entry point
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx               # Glassmorphic sticky nav + Google Sign-In
│   │   │   └── Footer.jsx               # Multi-column footer
│   │   ├── customer/
│   │   │   ├── CustomerLayout.jsx
│   │   │   ├── FestivalBanner.jsx
│   │   │   ├── StarRating.jsx
│   │   │   └── VendorCard.jsx
│   │   └── ui/
│   │       ├── GoogleSignInButton.jsx   # Official Google-branded OAuth button
│   │       └── ProfileDropdown.jsx      # Avatar dropdown (name/email/sign-out)
│   │
│   ├── context/
│   │   ├── AuthContext.jsx              # Auth state + signInWithGoogle()
│   │   └── CartContext.jsx              # Cart state management
│   │
│   ├── data/
│   │   ├── festivals.js                 # 8 Indian festivals with foods/rituals/menus
│   │   └── eventServicesData.js         # Event service categories and details
│   │
│   ├── hooks/
│   │   └── useScrollReveal.js           # IntersectionObserver scroll animations
│   │
│   ├── lib/
│   │   └── supabase.js                  # Supabase client initialization
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx              # Full marketing landing page (11 sections)
│   │   ├── FestivalDetailPage.jsx       # Per-festival detail (foods/rituals/booking)
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx            # Login + Google Sign-In
│   │   │   └── SignupPage.jsx           # Signup + role selection + Google Sign-In
│   │   ├── customer/
│   │   │   ├── CustomerHome.jsx         # Customer dashboard home
│   │   │   ├── BrowseVendors.jsx        # Browse & filter vendors
│   │   │   ├── VendorProfile.jsx        # Individual vendor profile page
│   │   │   ├── RequestQuote.jsx         # Quote request form
│   │   │   ├── MyBookings.jsx           # Customer bookings list
│   │   │   ├── EventServices.jsx        # Services for a specific event
│   │   │   └── Cart.jsx                 # Cart & checkout
│   │   ├── dashboard/
│   │   │   ├── CustomerDashboard.jsx
│   │   │   ├── VendorDashboard.jsx      # Vendor orders/leads/stats
│   │   │   └── AdminDashboard.jsx       # Admin panel
│   │   └── vendor/
│   │       └── VendorSubscription.jsx   # Vendor subscription plans
│   │
│   └── utils/
│       └── format.js                    # Currency/date formatting helpers
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql       # Users, profiles, vendors, bookings tables
│       ├── 002_rating_trigger.sql       # Auto-update vendor ratings
│       └── 003_subscriptions_and_cart.sql
│
├── public/
│   ├── favicon.svg
│   └── manifest.json                    # PWA manifest
│
├── .env.example                         # Environment variable template
├── .env                                 # Your actual keys (not committed to git)
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── SETUP.md
└── preview.html                         # Standalone single-file demo SPA
```

---

## Landing Page — 11 Sections

| # | Section | Description |
|---|---------|-------------|
| 1 | **Hero** | Animated gradient + blob background, search bar (event type / city / date), floating emoji decorations, trust badges |
| 2 | **Trusted-by strip** | City logos in pill chips |
| 3 | **Category Bento Grid** | Asymmetric layout — Birthday (large), Baby Shower, Naming Ceremony, Anniversary, Housewarming, Get-Together — each with vendor count, hover lift |
| 4 | **Stats Strip** | Animated count-up: 10,000+ Vendors, 50,000+ Celebrations, 150+ Cities, 4.9★ Rating |
| 5 | **Featured Providers** | Horizontally scrollable cards — 6 placeholder vendors with gradient images, verified badge, rating, price, location |
| 6 | **Festival Foods & Rituals** | 8 festival cards linking to detail pages — hover reveals foods/rituals preview |
| 7 | **How It Works** | Tab toggle: Customer flow (Browse → Compare → Book) / Vendor flow (List → Get Leads → Grow) |
| 8 | **Testimonials** | Auto-advancing carousel (4s), prev/next + dot indicators, 4 realistic testimonials |
| 9 | **Why Choose Us** | 4 trust cards: Verified Vendors, Secure Payments, 24/7 Support, Quality Guaranteed |
| 10 | **Dual CTA** | Split banner: customers left (amber), vendors right (dark) |
| 11 | **FAQ Accordion** | 6 questions, smooth expand/collapse |

---

## Festival Foods & Rituals Feature

Eight Indian festivals with complete data:

| Festival | Emoji | Season | Foods | Rituals |
|----------|-------|--------|-------|---------|
| **Diwali** | 🪔 | Oct–Nov | Gulab Jamun, Kaju Katli, Chakli, Namkeen, Kheer, Shankarpali, Murukku, Gujiya | Lakshmi Puja, Rangoli, Diya lighting, Crackers, Gift exchange |
| **Holi** | 🌈 | Feb–Mar | Gujiya, Thandai, Dahi Bhalla, Puran Poli, Papri Chaat, Malpua | Holika Dahan, Gulal play, Color shower, Community feast |
| **Navratri** | 🪇 | Sep–Oct | Sabudana Khichdi, Kuttu Ki Poori, Makhana Kheer, Singhara Halwa | Garba dance, Dandiya night, Kanya Puja, Fasting thali |
| **Ganesh Chaturthi** | 🐘 | Aug–Sep | Modak, Karanji, Puranpoli, Panchamrit, Shrikhand | Idol installation, Aarti, Prasad distribution, Visarjan |
| **Onam** | 🌺 | Aug–Sep | Sadya (26-dish feast), Payasam, Avial, Banana chips | Pookalam, Vallam Kali, Thiruvathira |
| **Eid** | 🌙 | Varies | Sheer Khurma, Biryani, Haleem, Kebabs, Phirni | Namaz, Zakat, Eid Milan, Seviyan cooking |
| **Christmas** | 🎄 | Dec | Plum Cake, Gingerbread, Rum Balls, Chicken Roast, Star Cookies | Midnight Mass, Tree decoration, Carol singing, Gift exchange |
| **Pongal / Sankranti** | ☀️ | Jan | Pongal, Til Ladoo, Til Chikki, Khichdi, Gajak | Kite flying, Bonfire, Cow puja, Surya worship |

Each festival includes:
- **Foods** — name, category, description, price range, customization options
- **Rituals** — name, timing, description, items needed
- **Menu packages** — 2 tiers (traditional + gourmet), with pricing per head
- **Customization options** — dietary preferences, regional styles, live counters
- **Services** — decorator, caterer, photographer, etc.

### Festival Detail Page (`/festivals/:id`)
1. Emotional hero (festival gradient + tagline + hook quote)
2. Food cards grid (hover reveals customization options)
3. Rituals timeline
4. Menu packages (highlighted "most popular")
5. Customization checklist
6. Required services chips
7. Emotional CTA banner

---

## Authentication

### Email/Password
- Sign up with role selection: **Customer** or **Vendor**
- Login redirects by role → Customer Dashboard / Vendor Dashboard / Admin Dashboard

### Google Sign-In
- Button uses official Google multi-color G logo and correct branding
- Calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Available on: Navbar, Login page, Signup page

#### To activate Google Sign-In (manual setup required):
1. Go to **Supabase Dashboard → Authentication → Providers → Google → Enable**
2. Get **Client ID** and **Client Secret** from [console.cloud.google.com](https://console.cloud.google.com)
3. Add `https://your-project-ref.supabase.co/auth/v1/callback` as authorized redirect URI in Google Cloud

---

## Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/signup` | Signup | Public |
| `/festivals/:id` | Festival Detail | Public |
| `/dashboard/customer` | Customer Home | Customer only |
| `/dashboard/customer/browse` | Browse Vendors | Customer only |
| `/dashboard/customer/vendors/:id` | Vendor Profile | Customer only |
| `/dashboard/customer/vendors/:id/quote` | Request Quote | Customer only |
| `/dashboard/customer/bookings` | My Bookings | Customer only |
| `/dashboard/customer/events/:id` | Event Services | Customer only |
| `/dashboard/customer/cart` | Cart | Customer only |
| `/dashboard/vendor` | Vendor Dashboard | Vendor only |
| `/dashboard/admin` | Admin Dashboard | Admin only |

---

## Custom Tailwind Colors

```js
marigold-500  →  #f59e0b  (amber gold — primary CTA color)
crimson-600   →  #c0392b  (rose red — accent)
cream         →  #FFF8F0  (warm off-white — page backgrounds)
```

## CSS Animation Utilities

| Class | Effect |
|-------|--------|
| `.reveal` | Fade-up on scroll (via IntersectionObserver) |
| `.reveal-delay-1/2/3/4` | Staggered reveal delays |
| `.gradient-text` | Amber→crimson gradient text |
| `.shimmer-text` | Animated shimmer on text |
| `.float` | Gentle floating bob animation |
| `.blob` | Organic morphing shape animation |
| `.card-hover` | Lift + glow on hover |
| `.glass-nav` | Frosted glass background |

---

## Supabase Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (name, phone, role, city) |
| `vendors` | Vendor business info + subscription plan |
| `services` | Vendor service listings |
| `bookings` | Customer bookings |
| `reviews` | Ratings and reviews |
| `cart_items` | Cart state per user |
| `subscriptions` | Vendor subscription records |

---

## Environment Setup

Create `c:\EventsEase\.env` with:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values at: **Supabase Dashboard → Settings → API**

---

## Running Locally

```bash
# 1. Install Node.js from https://nodejs.org (LTS version)

# 2. Install dependencies
cd c:\EventsEase
npm install

# 3. Start dev server
npm run dev

# App runs at http://localhost:5173
```

---

## GitHub Repository

**[github.com/mohankumars11/EventsEase_start](https://github.com/mohankumars11/EventsEase_start)**

- 47 files pushed
- Branch: `main`
- Secrets excluded (`.env` is in `.gitignore`)

---

## Also Included — `preview.html`

A standalone single-file demo SPA (no React, no build step) that runs directly in a browser via Python HTTP server:

```bash
python -m http.server 8080
# Open http://localhost:8080/preview.html
```

Features working in preview.html:
- 6 event type cards (Birthday, Baby Shower, Naming, Anniversary, Housewarming, Get-Together)
- Dynamic event services page (changes hero/content per event)
- 23 clickable service rows with detail modals (Add to Cart / Book Now)
- Vendor registration page
- Review modal with star rating
- Cart functionality
- Admin dashboard with pagination
- All dead links fixed via `planEvent()` routing

---

*Generated by Claude Code — EventsEase project*
