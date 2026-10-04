# Sambramo Partner Native (Expo)

Initial native foundation for the parallel React Native + Expo migration. This app is deliberately isolated from the existing React/Vite/Capacitor client and uses a separate Android application ID for side-by-side testing.

## Local setup

1. Install Node.js 20+ and a compatible package manager.
2. From this directory run `npm install`.
3. Configure Supabase using Expo public environment variables only after the audited auth/session adapter is added. Never put a service-role key in the app.
4. Run `npm run start` and open with Expo Go or a development build.

## Current scaffold

- Expo Router navigation shell
- Five partner destinations: Home, Jobs, Pricing, Calendar, More
- Royal Amethyst visual tokens and first-pass mobile layouts
- Static sample data only; no Supabase writes or production operations are wired yet

## Migration safety

Do not alter existing Supabase schemas or production data to support this scaffold. Before wiring each screen, map it to the existing API/RPC, RLS policy, entity IDs, status lifecycle, and acceptance tests. Keep the existing partner app available until parity and device testing are signed off.
