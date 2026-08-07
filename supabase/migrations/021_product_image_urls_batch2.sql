-- ============================================================
-- Migration 021: Real product image URLs — batch 2 of 2.
--
-- Finishes what migration 017 started. That run covered Cakes, Gifts,
-- Flowers and Hampers and then hit its rate-limit budget, leaving Party
-- Essentials and Pooja & Essentials with no photography at all — 127
-- products across two whole categories rendering as blank tiles in the
-- shop. Its header said the rest would land in 019; 019 turned out to be
-- the shop growth engine, so this is that missing batch.
--
-- Also picks up the Independence Day rows added to the four original
-- categories after 017 ran.
--
-- Targets were read from the live database (image_url IS NULL) rather
-- than assumed, so every statement below matches rows that actually
-- needed a picture at the time this was generated.
--
-- Safe to re-run: every statement is an idempotent UPDATE.
-- Requires migration 016 (adds products.image_url) to have run first.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Flowers · Independence Day  (1 product)  photo: Annie Spratt
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8b3JhbmdlJTIwd2hpdGUlMjBncmVlbiUyMGZsb3dlcnMlMjBib3VxdWV0fGVufDB8Mnx8fDE3ODYxMTE4MTV8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Flowers' AND occasion = 'Independence Day';

-- Gifts · Independence Day  (3 products)  photo: Joydeep Sensarma
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1716655916973-b17cd88ff940?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwZmxhZyUyMHRyaWNvbG91ciUyMGdpZnQlMjBib3h8ZW58MHwyfHx8MTc4NjExMTgxNnww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Gifts' AND occasion = 'Independence Day';

-- Hampers · Independence Day  (3 products)  photo: flavour and spice
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1721814209518-cd82cb52d8c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwdHJpY29sb3VyJTIwZ2lmdCUyMGhhbXBlciUyMGJveHxlbnwwfDJ8fHwxNzg2MTExODE4fDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Hampers' AND occasion = 'Independence Day';

-- Party Essentials · (none)  (4 products)  photo: Shamblen Studios
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1698285439446-2ad560e31a17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8cGFydHklMjBzdXBwbGllcyUyMGJhbGxvb25zJTIwY29uZmV0dGklMjBjb2xvdXJmdWx8ZW58MHwyfHx8MTc4NjExMTgxOXww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion IS NULL;

-- Party Essentials · Anniversary  (4 products)  photo: Eyestetix Studio
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1634037227458-abdbf697806e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8YW5uaXZlcnNhcnklMjBwYXJ0eSUyMGRlY29yYXRpb24lMjBiYWxsb29ucyUyMHJvbWFudGljfGVufDB8Mnx8fDE3ODYxMTE4MjB8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Anniversary';

-- Party Essentials · Baby Shower  (6 products)  photo: Shamblen Studios
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1525268771113-32d9e9021a97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8YmFieSUyMHNob3dlciUyMGRlY29yYXRpb24lMjBwYXN0ZWwlMjBiYWxsb29uc3xlbnwwfDJ8fHwxNzg2MTExODIxfDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Baby Shower';

-- Party Essentials · Backdrop & Banners  (4 products)  photo: Suzette Jamy
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1549128778-8d08c2d71ada?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8cGFydHklMjBiYWNrZHJvcCUyMGJhbm5lciUyMGRlY29yYXRpb24lMjBidW50aW5nfGVufDB8Mnx8fDE3ODYxMTE4MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Backdrop & Banners';

-- Party Essentials · Balloon Decor  (6 products)  photo: Wolfgang H. Schirmer
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1656091794436-ed0c3928eca4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8YmFsbG9vbiUyMGFyY2glMjBkZWNvcmF0aW9uJTIwY29sb3VyZnVsJTIwcGFydHl8ZW58MHwyfHx8MTc4NjExMTgyM3ww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Balloon Decor';

-- Party Essentials · Birthday  (7 products)  photo: Eyestetix Studio
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1634037227458-abdbf697806e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8YmlydGhkYXklMjBwYXJ0eSUyMGJhbGxvb25zJTIwZGVjb3JhdGlvbiUyMGNvbG91cmZ1bHxlbnwwfDJ8fHwxNzg2MTExODI0fDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Birthday';

-- Party Essentials · Housewarming  (3 products)  photo: Stacy
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1766239303183-e5d29227f13c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aG91c2V3YXJtaW5nJTIwcGFydHklMjBkZWNvcmF0aW9uJTIwaG9tZXxlbnwwfDJ8fHwxNzg2MTExODI2fDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Housewarming';

-- Party Essentials · Independence Day  (4 products)  photo: Joydeep Sensarma
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1716655916973-b17cd88ff940?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwZmxhZyUyMHRyaWNvbG91ciUyMGRlY29yYXRpb258ZW58MHwyfHx8MTc4NjExMTgyN3ww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Independence Day';

-- Party Essentials · Tableware  (4 products)  photo: Flower Party
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1607537225580-0d7464059643?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8cGFydHklMjB0YWJsZXdhcmUlMjBwYXBlciUyMHBsYXRlcyUyMGN1cHN8ZW58MHwyfHx8MTc4NjExMTgyOHww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Tableware';

-- Party Essentials · Theme Party  (12 products)  photo: JACQUELINE BRANDWAYN
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1601520525445-1039c1fa232b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8dGhlbWUlMjBwYXJ0eSUyMGRlY29yYXRpb24lMjBwcm9wcyUyMGNvbG91cmZ1bHxlbnwwfDJ8fHwxNzg2MTExODI5fDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Theme Party';

-- Party Essentials · Wedding & Engagement  (4 products)  photo: Hyma Chadalawada
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1599335972861-b17756cf8141?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8d2VkZGluZyUyMGVuZ2FnZW1lbnQlMjBzdGFnZSUyMGRlY29yYXRpb24lMjBmbG93ZXJzfGVufDB8Mnx8fDE3ODYxMTE4MzF8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Wedding & Engagement';

-- Pooja & Essentials · (none)  (15 products)  photo: engin akyurt
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1642582431503-5276a6b9798d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwcHVqYSUyMHNhbWFncmklMjBicmFzcyUyMHRoYWxpJTIwaXRlbXN8ZW58MHwyfHx8MTc4NjExMTgzMnww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion IS NULL;

-- Pooja & Essentials · Janmashtami  (3 products)  photo: Dev Singh
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1661306921487-aeb679988aaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8a3Jpc2huYSUyMGphbm1hc2h0YW1pJTIwZGVjb3JhdGlvbiUyMGZsdXRlfGVufDB8Mnx8fDE3ODYxMTE4Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Janmashtami';

-- Pooja & Essentials · Navratri  (5 products)  photo: Vivek Doshi
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1632296521966-b19f0d728635?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8bmF2cmF0cmklMjBrYWxhc2glMjBnYXJiYSUyMGZlc3RpdmFsJTIwZGVjb3JhdGlvbnxlbnwwfDJ8fHwxNzg2MTExODM5fDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Navratri';

-- Pooja & Essentials · Regional & Other  (3 products)  photo: Mustafa akın
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1694443211728-d30bf177a481?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwYnJhc3MlMjBwdWphJTIwaXRlbXMlMjB0ZW1wbGUlMjBiZWxsfGVufDB8Mnx8fDE3ODYxMTE4NDB8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Regional & Other';

-- Pooja & Essentials · Satyanarayan Pooja  (4 products)  photo: Mr Catographer
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1780247585190-343fbb738c67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwcHVqYSUyMGthbGFzaCUyMGNvY29udXQlMjBtYW5nbyUyMGxlYXZlcyUyMHJpdHVhbHxlbnwwfDJ8fHwxNzg2MTExODQxfDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Satyanarayan Pooja';

-- Pooja & Essentials · Small Functions  (9 products)  photo: Sonal Gupta
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1666922387588-28b2b1d839e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwaG9tZSUyMHB1amElMjBjZXJlbW9ueSUyMGZsb3dlcnMlMjBsYW1wfGVufDB8Mnx8fDE3ODYxMTE4NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Small Functions';

-- Pooja & Essentials · Wedding Pooja  (4 products)  photo: Vivek Doshi
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1632296521966-b19f0d728635?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8aW5kaWFuJTIwd2VkZGluZyUyMHB1amElMjBoYWxkaSUyMGNlcmVtb255JTIwaXRlbXN8ZW58MHwyfHx8MTc4NjExMTg0M3ww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Wedding Pooja';

-- ── Second pass ────────────────────────────────────────────
-- These six returned nothing on the first run: the most specific subjects,
-- narrowed further by an orientation filter. Resolved by dropping the shape
-- constraint and falling back through plainer phrasings.

-- Cakes · Independence Day  (4 products)  query: "tricolour cake"  photo: Deva Williamson
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1552689486-f6773047d19f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8dHJpY29sb3VyJTIwY2FrZXxlbnwwfHx8fDE3ODYxMTE5NjB8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Cakes' AND occasion = 'Independence Day';

-- Party Essentials · Farewell  (2 products)  query: "farewell party decoration"  photo: Michael Dziedzic
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1659407490039-27cc03c0b4b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8ZmFyZXdlbGwlMjBwYXJ0eSUyMGRlY29yYXRpb258ZW58MHx8fHwxNzg2MTExOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Party Essentials' AND occasion = 'Farewell';

-- Pooja & Essentials · Daily Pooja  (8 products)  query: "puja thali"  photo: Zoshua Colah
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8cHVqYSUyMHRoYWxpfGVufDB8fHx8MTc4NjExMTk2Mnww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Daily Pooja';

-- Pooja & Essentials · Diwali  (9 products)  query: "diwali diya"  photo: Umesh Soni
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8ZGl3YWxpJTIwZGl5YXxlbnwwfHx8fDE3ODYxMTE5NjN8MA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Diwali';

-- Pooja & Essentials · Ganesh Chaturthi  (4 products)  query: "ganesha idol"  photo: Unfold Memory
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1598089842250-2805d8897364?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8Z2FuZXNoYSUyMGlkb2x8ZW58MHx8fHwxNzg2MTExOTY0fDA&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Ganesh Chaturthi';

-- Pooja & Essentials · Griha Pravesh  (3 products)  query: "kalash coconut mango leaves"  photo: Pranav Shirali
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1764304589223-30bfbfdaa9ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDE1MDA4fDB8MXxzZWFyY2h8MXx8a2FsYXNoJTIwY29jb251dCUyMG1hbmdvJTIwbGVhdmVzfGVufDB8fHx8MTc4NjExMTk2NXww&ixlib=rb-4.1.0&q=80&w=1080' WHERE category = 'Pooja & Essentials' AND occasion = 'Griha Pravesh';
