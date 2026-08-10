-- ============================================================
-- Migration 028: per-product photography (batch 3).  GENERATED FILE.
--
-- Produced by scripts/resolve-product-images.mjs on 2026-08-07 from pexels.
-- Do not hand-edit: re-run the script instead.
--
-- Replaces the category-wide image_url assignments made by migrations 017
-- and 021, under which every birthday cake shared one photograph. Each
-- statement below targets a single product id, and no two products in the
-- same category were given the same photo.
--
-- 99 products:
--      1  Gifts
--     11  Hampers
--     56  Party Essentials
--     31  Pooja & Essentials
--
-- image_source stays 'stock' — these are licensed lookalikes, and the UI
-- labels them "Representative image". An admin uploading a real photo via
-- the Catalog tab flips the row to 'actual'. See migration 023.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;


-- Party Essentials / Baby Shower — Baby Shower Balloon Arch Kit
--   query: Baby Shower Balloon Arch Kit party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12114825/pexels-photo-12114825.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Chic baby shower decor featuring teddy bears, balloons, and sweet treats in an indoor setting.',
  image_credit     = 'Photo by Jonathan Nenemann on Pexels',
  image_source     = 'stock',

  image_updated_at = now()
WHERE id = '46442bb0-f965-45d2-8f8c-3e274079bd09';

-- Party Essentials / Baby Shower — Baby Shower Party Favors (Set of 20)
--   query: Baby Shower Party Favors decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1682454/pexels-photo-1682454.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delightful baby shower setup with pastel gift boxes, treats, and floral accent in a whimsical cloud setting.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7fbf36ee-e374-4b84-9736-042fa8ad3742';

-- Party Essentials / Baby Shower — Baby Shower Photo Backdrop
--   query: Baby Shower Photo Backdrop party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35204084/pexels-photo-35204084.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming outdoor baby shower setting with pastel balloons and a poolside backdrop in São Paulo.',
  image_credit     = 'Photo by Laura Oliveira on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cb01b9e5-f840-47dd-b519-ede1dea58a4e';

-- Party Essentials / Baby Shower — Baby Shower Tableware Set
--   query: Baby Shower Tableware Set party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11282246/pexels-photo-11282246.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful pink-themed event setup with balloons and decorated tables.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2a5413da-e741-4397-983e-66cf197ef2ab';

-- Party Essentials — Balloon Bunch (20pc, assorted)
--   query: Balloon Bunch party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/28173091/pexels-photo-28173091.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Pastel balloons cluster, suspended outdoors, evoking festive vibes.',
  image_credit     = 'Photo by Jonathan Cooper on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b9dc2141-ee5a-4bfc-9244-269d55e89ce1';

-- Party Essentials / Balloon Decor — Balloon Weight & Ribbon Kit
--   query: Balloon Weight & Ribbon Kit Decor party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6229135/pexels-photo-6229135.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Floating red heart-themed balloons set against a vibrant blue sky with wispy clouds.',
  image_credit     = 'Photo by Mohan Nannapaneni on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2f766542-7f10-4ee0-b450-25202e01f991';

-- Party Essentials — Birthday Banner (Customisable)
--   query: Birthday Banner party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7099956/pexels-photo-7099956.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Festive birthday scene with cake, cupcakes, gifts, and decorations against red wall.',
  image_credit     = 'Photo by Vlada Karpovich on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd88a888f-9c1f-4698-957d-76b6ef46e2df';

-- Party Essentials / Birthday — Birthday Party Hats (Pack of 10)
--   query: Birthday Party Hats decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7180255/pexels-photo-7180255.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Three colorful birthday party hats on a shelf, celebrating a festive occasion.',
  image_credit     = 'Photo by Pavel Danilyuk on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a66bd101-a756-4096-978e-a1e74b7742c8';

-- Party Essentials / Birthday — Birthday Photo Booth Props Kit
--   query: Birthday Photo Booth Props Kit party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7867284/pexels-photo-7867284.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Elderly man in a suit celebrating his birthday with festive props and a red backdrop.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7d3aaa61-2ae4-4c58-93c4-740739ae6658';

-- Party Essentials / Birthday — Birthday Table Centerpiece Kit
--   query: Birthday Table Centerpiece Kit party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32370538/pexels-photo-32370538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Festive kids party setup featuring colorful balloons and glassware, captured with a Canon EOS R5 camera.',
  image_credit     = 'Photo by Jonathan Borba on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '379f6f4b-77b6-4e40-8fef-61bd8befb925';

-- Party Essentials / Tableware — Cake Stand (Decorative, Reusable)
--   query: Cake Stand Tableware party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37042839/pexels-photo-37042839.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Elegant cakes and floral arrangement on wooden background create a festive ambiance.',
  image_credit     = 'Photo by Nadin Sh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6c1ce37a-5440-4429-adb7-610914e40db5';

-- Party Essentials / Balloon Decor — Chrome Balloon Set (Metallic, 20pc)
--   query: Chrome Balloon Set Decor party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14457430/pexels-photo-14457430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful birthday celebration setup with pink and silver balloons, floral arrangements, and a stylish cake display.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '16175bb5-54f5-46c7-9dcd-f7b7434f965a';

-- Party Essentials / Birthday — Confetti Balloon Set (Clear, 5pc)
--   query: Confetti Balloon Set Birthday party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30692825/pexels-photo-30692825.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Group celebrating a birthday with cake, balloons, and confetti indoors.',
  image_credit     = 'Photo by Jonathan Valdes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4a7c07b6-4cc4-45f1-8434-b09a478dec9c';

-- Party Essentials / Backdrop & Banners — Customisable Photo Backdrop (Any Text)
--   query: Customisable Photo Backdrop & Banners party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38786129/pexels-photo-38786129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Boy celebrating 11th birthday with balloons and a festive banner backdrop.',
  image_credit     = 'Photo by azra melek on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '135c0196-51f2-4514-a06a-288c1bb97494';

-- Party Essentials / Theme Party — Dinosaur Theme Party Set
--   query: green jungle dinosaur birthday cake party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/25559074/pexels-photo-25559074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful dinosaur-themed birthday cake and table setup with decorations for a children''s party.',
  image_credit     = 'Photo by David Escala de Almeida on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a67ffc78-70e7-400e-a8ff-f306d6ec2943';

-- Party Essentials / Tableware — Disposable Cutlery Set (Party Pack)
--   query: Disposable Cutlery Set Tableware party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7394268/pexels-photo-7394268.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful party table setup with polka dot cups and balloons, perfect for celebrations.',
  image_credit     = 'Photo by locrifa on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f034b622-0c1e-49c8-be1a-8ea0d5604dbd';

-- Party Essentials — Disposable Party Plates & Cups
--   query: Disposable Party Plates & Cups decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8014820/pexels-photo-8014820.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful cupcakes and balloons create a cheerful party atmosphere.',
  image_credit     = 'Photo by Cup of  Couple on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bec7e4a4-09fb-4b25-9add-b34c130f44e4';

-- Party Essentials / Wedding & Engagement — Engagement Decoration Kit
--   query: Engagement Decoration Kit Wedding & party celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/15662086/pexels-photo-15662086.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Silver balloon letters spelling ''love'' on a light background, perfect for party decor.',
  image_credit     = 'Photo by José  Gutiérrez on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '48292a40-19e6-41ff-b7d6-5d97e8adc1e9';

-- Party Essentials / Backdrop & Banners — Fairy Light Curtain Backdrop
--   query: Fairy Light Curtain Backdrop & Banners party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/631497/pexels-photo-631497.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A cheerful Happy Birthday banner in gold letters hangs on black and white chevron curtains.',
  image_credit     = 'Photo by Elizabeth on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1cface69-847e-4586-85e1-cc2becf99305';

-- Party Essentials / Farewell — Farewell Party Decoration Kit
--   query: Farewell Party Decoration Kit celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8127310/pexels-photo-8127310.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful confetti surrounds a goodbye school message, celebrating graduation.',
  image_credit     = 'Photo by olia danilevich on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ddd075f5-2f15-4bda-8ca3-815e45115b84';

-- Party Essentials / Backdrop & Banners — Floral Backdrop Panel
--   query: Floral Backdrop Panel & Banners party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14515158/pexels-photo-14515158.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully decorated birthday setup with a white cake, balloons, and floral arrangements indoors.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2dc29340-6a0c-4467-9634-c91d7739d313';

-- Party Essentials / Baby Shower — Gender Reveal Balloon (Pop Confetti)
--   query: Gender Reveal Balloon Baby Shower party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6463598/pexels-photo-6463598.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A group celebrates a gender reveal party indoors with balloons and decorations.',
  image_credit     = 'Photo by Tima Miroshnichenko on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd98ab195-2348-4c60-9669-6f863441420a';

-- Party Essentials / Balloon Decor — Giant Balloon (36 inch, Round)
--   query: Giant Balloon Decor party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7328587/pexels-photo-7328587.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming indoor birthday party decor featuring balloons, a teepee tent, and a decorated dining table in a cozy apartment.',
  image_credit     = 'Photo by PNW Production on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd3fc2430-b133-4f40-933b-9db03cbdaaa5';

-- Party Essentials / Housewarming — Griha Pravesh Décor Kit
--   query: Griha Pravesh Décor Kit Housewarming party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37815970/pexels-photo-37815970.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Photography studio setup with lighting equipment and colorful party decorations.',
  image_credit     = 'Photo by Esase on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3b7fab93-2eab-45bd-802a-902daef61cc6';

-- Party Essentials / Birthday — Happy Birthday Foil Balloon Set
--   query: Happy Birthday Foil Balloon Set party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/3905846/pexels-photo-3905846.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Bright and colorful foil balloons spelling out the word ''Happy'' on a white background.',
  image_credit     = 'Photo by Polina Tankilevitch on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5698e6c7-9618-4609-9b7a-fc24838b604c';

-- Party Essentials / Balloon Decor — Helium Balloon Bouquet (Ready-to-Pickup)
--   query: Helium Balloon Bouquet Decor party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/3394219/pexels-photo-3394219.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Gold and pink balloons forming a decorative bouquet against a textured white wall.',
  image_credit     = 'Photo by Inga Seliverstova on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '04e833d4-1533-40f0-a70d-2338e28ec5fb';

-- Party Essentials / Housewarming — Housewarming Toran & Rangoli Kit
--   query: Housewarming Toran & Rangoli Kit party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8887068/pexels-photo-8887068.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful Indian festival setup with flowers, sweets, traditional decorations, and hands adorned with bangles.',
  image_credit     = 'Photo by Lara Jameson on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ba079974-e54d-4c19-b25f-65241875ecba';

-- Party Essentials / Independence Day — Independence Day Banner (Customisable)
--   query: Independence Day Banner party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8805994/pexels-photo-8805994.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A senior woman decorates indoors with American flags for a patriotic holiday.',
  image_credit     = 'Photo by Mike Jones on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9e934cfe-a63b-4906-9965-094c0e85ca2a';

-- Party Essentials / Baby Shower — Its a Boy/Girl Banner Set
--   query: Its a Boy/Girl Banner Set Baby Shower party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9215243/pexels-photo-9215243.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Heart-shaped ''It''s a Boy'' sequined decor with cookies for a gender reveal party. Ideal for celebrations.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '169efe3f-c812-4644-b17f-c54698afffdb';

-- Party Essentials / Theme Party — Jungle Animal Balloon Set
--   query: Jungle Animal Balloon Set Theme Party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/2337838/pexels-photo-2337838.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Whimsical jungle-themed dessert table for a birthday, featuring plush animals and green decorations.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9e44a73e-19af-4414-b821-a08c67868d82';

-- Party Essentials / Theme Party — Jungle Safari Theme Decoration Kit
--   query: Jungle Safari Theme Decoration Kit Party celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14160871/pexels-photo-14160871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant safari-themed birthday setup with cake, decorations, and gifts indoors.',
  image_credit     = 'Photo by Hannia Torres on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8c41abff-8749-4f9a-bc35-3d1930c0eda5';

-- Party Essentials / Birthday — LED Fairy Lights (Birthday Decor)
--   query: LED Fairy Lights Birthday party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/20016135/pexels-photo-20016135.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Elegant 15th birthday cake display with floral decor and colorful sweets under warm lighting.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '957f33a9-978b-4d68-9bd5-080a09f9e2f9';

-- Party Essentials / Anniversary — LED Number Lights (Anniversary Years)
--   query: LED Number Lights Anniversary party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10336805/pexels-photo-10336805.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant celebration setup with balloons, number 10, and superhero-themed cupcakes.',
  image_credit     = 'Photo by Helena Lopes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e3108b66-337b-4998-9f89-1bda5e851a12';

-- Party Essentials / Independence Day — National Flag (Table-top, Set of 5)
--   query: National Flag Independence Day party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/17999918/pexels-photo-17999918.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Line of Indian flags waving against a clear sky, symbolizing patriotism.',
  image_credit     = 'Photo by Kaustav Das on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ad351004-ba4f-4cc4-a54a-15cad3e397db';

-- Party Essentials — Party Popper Set (Pack of 6)
--   query: Party Popper Set decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6463614/pexels-photo-6463614.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A group of adults celebrating indoors with balloons and laughter, capturing a festive moment.',
  image_credit     = 'Photo by Tima Miroshnichenko on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '382149a3-83db-4469-b353-e6f1e0450822';

-- Party Essentials / Tableware — Party Streamers & Confetti Combo
--   query: Party Streamers & Confetti Combo Tableware decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/25956377/pexels-photo-25956377.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant paper streamers and confetti on a white background, perfect for festive occasions.',
  image_credit     = 'Photo by Ylanite Koppens on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '431c4f74-18ba-4c12-9c69-51209c1183c9';

-- Party Essentials / Theme Party — Princess Crown & Wand Set (Pack of 6)
--   query: Princess Crown & Wand Set Theme Party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/28883193/pexels-photo-28883193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Cute baby boy dressed as a prince celebrating his first birthday with a royal theme.',
  image_credit     = 'Photo by Alessandro Rodriguez on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9c16003a-1289-4423-958d-b53e0be343c1';

-- Party Essentials / Theme Party — Princess Theme Party Decoration Kit
--   query: Princess Theme Party Decoration Kit celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/34260120/pexels-photo-34260120.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming first birthday party setup with pink, gold, and white balloons, and a large decorative ONE sign.',
  image_credit     = 'Photo by Justin Agyarko on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '21f5b0d6-46d3-42ae-bd57-59d83e0c5f99';

-- Party Essentials / Farewell — Retirement Party Decor Set
--   query: Retirement Party Decor Set Farewell decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7810987/pexels-photo-7810987.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Happy senior man celebrates 60th birthday with balloons and decorations indoors.',
  image_credit     = 'Photo by Kampus Production on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '23276a78-f108-4463-9f30-36fab0c5225f';

-- Party Essentials / Wedding & Engagement — Sangeet Party Decor Kit
--   query: Sangeet Party Decor Kit Wedding & Engagement decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35508916/pexels-photo-35508916.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Joyful moment at an Indian wedding Haldi ceremony with vibrant flowers.',
  image_credit     = 'Photo by Aalap Creation on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd0649aea-3a6b-4b40-a899-1722be7a3590';

-- Party Essentials / Backdrop & Banners — Sequin Backdrop Curtain (Gold)
--   query: Sequin Backdrop Curtain & Banners party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6308423/pexels-photo-6308423.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant birthday decorations featuring pink banners and a sparkling foil curtain.',
  image_credit     = 'Photo by OWN FILTERS on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'dc0a1d29-57f6-41e6-b02d-da543362cb53';

-- Party Essentials / Balloon Decor — Star Foil Balloons (Set of 5)
--   query: Star Foil Balloons Balloon Decor party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/4315815/pexels-photo-4315815.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A woman holding star-shaped balloons with ''isolation'' and ''birthday'' on a pink background, reflecting modern social experiences.',
  image_credit     = 'Photo by Anna Shvets on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1906fbcb-5d17-4b06-8916-629ecd7f2af8';

-- Party Essentials / Theme Party — Superhero Cape & Mask (Set of 6)
--   query: Superhero Cape & Mask Theme Party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10336821/pexels-photo-10336821.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A smiling child at a colorful superhero themed birthday celebration with balloons and decorations.',
  image_credit     = 'Photo by Helena Lopes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ccc4f94b-0b81-4884-bc55-c93e22b7b932';

-- Party Essentials / Theme Party — Superhero Theme Party Kit
--   query: Superhero Theme Party Kit decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10951220/pexels-photo-10951220.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two-tier superhero themed birthday cake topped with a number four candle, perfect for children''s parties.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5c1823af-503c-4cf0-b50d-69185c903aab';

-- Party Essentials / Tableware — Themed Paper Napkins (Pack of 50)
--   query: Themed Paper Napkins Tableware party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14017541/pexels-photo-14017541.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful paper cups and confetti on white background create a festive party vibe.',
  image_credit     = 'Photo by Luis Quintero on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1d37017a-18ca-4f23-ad0b-caea535f4c9e';

-- Party Essentials / Independence Day — Tricolor Balloon Bunch (30pc)
--   query: Tricolor Balloon Bunch Independence Day party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8308229/pexels-photo-8308229.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Cluster of colorful balloons floating against a clear blue sky. Vibrant and uplifting.',
  image_credit     = 'Photo by Ondra Wiener on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '303d34d7-3e45-4270-b1bc-6dd42ebed22f';

-- Party Essentials / Independence Day — Tricolor Buntings & Streamers
--   query: Tricolor Buntings & Streamers Independence Day party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10897109/pexels-photo-10897109.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Photo of blue and white streamers crisscrossing a clear blue sky.',
  image_credit     = 'Photo by Alexey Demidov on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ced4562f-fdd5-4c1b-9c79-49ee85cd12da';

-- Party Essentials / Theme Party — Unicorn Photo Backdrop
--   query: pastel unicorn cake with gold horn party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8384968/pexels-photo-8384968.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Cute young girl holding a colorful unicorn balloon beside a dreamcatcher on wooden backdrop.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'fb3a5838-8b5f-400a-bfd9-e497ef2ccebe';

-- Party Essentials / Theme Party — Unicorn Theme Balloon Garland
--   query: pastel unicorn cake with gold horn party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/15065486/pexels-photo-15065486.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant rainbow cake with sprinkles and decorations for a birthday party.',
  image_credit     = 'Photo by Luke Seago on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e79f100d-a7d8-46d6-af5c-3a3db776db81';

-- Party Essentials / Wedding & Engagement — Wedding Welcome Signage
--   query: Wedding Welcome Signage & Engagement party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14365407/pexels-photo-14365407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Wooden welcome sign adorned with pink roses for a wedding celebration.',
  image_credit     = 'Photo by Masood Aslami on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '54bbb7be-08b6-4bcd-86ff-a5ca37dddf06';

-- Party Essentials / Housewarming — Welcome Home Balloon Set
--   query: Welcome Home Balloon Set Housewarming party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10024302/pexels-photo-10024302.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two women hanging decorations in a sunny front yard for a festive occasion.',
  image_credit     = 'Photo by Ron Lach on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bf8d6002-be53-488b-b5c4-5b97e026d875';

-- Pooja & Essentials — Agarbatti (Incense Sticks)
--   query: Agarbatti indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7351728/pexels-photo-7351728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a person lighting incense sticks on a decorated tray for a traditional Indian ritual.',
  image_credit     = 'Photo by Vivaan Rupani on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '35b9bda6-d340-49a7-8d0f-aace7430ffdf';

-- Pooja & Essentials / Griha Pravesh — Ashtamangal Kit (Housewarming)
--   query: Ashtamangal Kit Griha Pravesh indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37531057/pexels-photo-37531057.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a conch shell and brass bell used in Indian rituals, surrounded by marigold petals.',
  image_credit     = 'Photo by yashwant kashyap on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5e9e2450-0198-4d64-9834-ff27d85e4da8';

-- Pooja & Essentials / Small Functions — Ayush Homam Kit (Birthday Pooja)
--   query: Ayush Homam Kit Small Functions indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35171273/pexels-photo-35171273.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up of a Hindu ceremony with a ritual fire, leaves, and offerings.',
  image_credit     = 'Photo by Mahjabin Tasnim Munia on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '22a21c8e-8e22-48e9-92a0-034b3c5ffa1d';

-- Pooja & Essentials / Small Functions — Baby Shower (Godh Bharai) Pooja Thali
--   query: Baby Shower Pooja Thali Small Functions indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37116934/pexels-photo-37116934.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A detailed setup for a traditional Ganesh puja featuring marigold garlands, fruits, and copper utensils.',
  image_credit     = 'Photo by Vijay Krishnawat on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ffe16f4c-7502-46cd-a0af-8a4ee1d00401';

-- Pooja & Essentials / Satyanarayan Pooja — Banana Leaves (Set of 5, Pooja)
--   query: Banana Leaves Satyanarayan Pooja indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36608903/pexels-photo-36608903.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant setup for a Hindu ritual with traditional brass items, fruits, and decorative elements.',
  image_credit     = 'Photo by Thilina Alagiyawanna on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8dfc0863-93e0-4c70-b90b-b0e2134f7d84';

-- Pooja & Essentials — Chandan (Sandalwood Paste)
--   query: Chandan indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819204/pexels-photo-8819204.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A hand performing a ritual with a brass lamp and incense burner, symbolizing spirituality.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c1b5252a-84ba-466b-a295-4268e8549113';

-- Pooja & Essentials — Coconut (Pair)
--   query: Coconut indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13471281/pexels-photo-13471281.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant traditional Indian Kalash with floral decorations for ceremonial rituals on a decorated table.',
  image_credit     = 'Photo by star photography on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '29f37f72-3e1e-489f-8f27-24259b5c3923';

-- Pooja & Essentials / Daily Pooja — Cotton Wicks (Batti, Pack of 100)
--   query: Cotton Wicks Daily Pooja indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37116936/pexels-photo-37116936.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant Hindu worship setup for Ganesh Puja featuring offerings and decorative elements, symbolizing tradition and spirituality.',
  image_credit     = 'Photo by Vijay Krishnawat on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '983ba8de-c2ad-465c-8b82-9c0868b4bac6';

-- Pooja & Essentials / Daily Pooja — Daily Pooja Samagri Kit
--   query: Daily Pooja Samagri Kit indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14855916/pexels-photo-14855916.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a traditional Indian pooja thali with a copper pot and red decorations in Jaipur, India.',
  image_credit     = 'Photo by Vijay Krishnawat on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '882cec28-8e89-4c92-b287-79f3dbd9c60e';

-- Pooja & Essentials / Daily Pooja — Daily Puja Flowers (Loose, 250g)
--   query: Daily Puja Flowers Pooja indian ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8887078/pexels-photo-8887078.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant display of traditional Indian cultural items and floral garlands during a festive ceremony.',
  image_credit     = 'Photo by Lara Jameson on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '34bd44f1-62c2-4ba8-8bf4-752703e66db1';

-- Pooja & Essentials / Diwali — Diwali Aarti Thali Set (Decorated)
--   query: diwali diya lamps indian festival puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11092914/pexels-photo-11092914.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a ritual plate with lighted diyas for a traditional ceremony.',
  image_credit     = 'Photo by Prasanjeet Shyam on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5901a482-5605-493c-8548-7822828a6698';

-- Pooja & Essentials / Diwali — Diwali Puja Vidhi Kit (Complete)
--   query: diwali diya lamps indian festival puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/34644593/pexels-photo-34644593.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Brass diyas lit during Diwali, creating a warm and festive ambiance.',
  image_credit     = 'Photo by Suhas Hanjar on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2cc22a65-f83f-4165-b16e-8bb7628f843f';

-- Pooja & Essentials — Diya Set (Oil Lamps, 12pc)
--   query: Diya Set indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38920473/pexels-photo-38920473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up of a puja thali with a lit diya and rose petals, symbolizing a traditional Indian ceremony.',
  image_credit     = 'Photo by aksinfo7 universe on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '20ffac3e-d5ef-4b29-b7c3-05e97c6d28f7';

-- Pooja & Essentials / Navratri — Durga Idol (Small, Navratri)
--   query: Durga Idol Navratri indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29370139/pexels-photo-29370139.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful Durga idol with intricate ornaments and lion at a religious festival.',
  image_credit     = 'Photo by Trishik Bose on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2afa81cb-bfc1-4cb0-84ec-11259842bfba';

-- Pooja & Essentials / Ganesh Chaturthi — Durva Grass & Red Hibiscus Set
--   query: Durva Grass & Red Hibiscus Set Ganesh Chaturthi indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18658452/pexels-photo-18658452.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Decorated Ganesha idol adorned with garlands in a Bangalore temple setting, vibrant and spiritual.',
  image_credit     = 'Photo by Karthikeyan Anand on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b4e5b461-2a24-4238-a7ab-e7035eb10ad0';

-- Pooja & Essentials / Ganesh Chaturthi — Ganesh Chaturthi Pooja Samagri Kit
--   query: ganesh chaturthi idol decoration indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36559747/pexels-photo-36559747.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A colorful idol of Lord Ganesh displayed during Ganesh Chaturthi in Mumbai, India.',
  image_credit     = 'Photo by Sonika Agarwal on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '20f81d7f-61dd-448d-82da-c295b1c2400b';

-- Pooja & Essentials / Ganesh Chaturthi — Ganpati Decoration Mandap Kit
--   query: Ganpati Decoration Mandap Kit Ganesh Chaturthi indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36559752/pexels-photo-36559752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful Ganesh idol adorned with flowers during Ganesh Chaturthi festival in Mumbai, India.',
  image_credit     = 'Photo by Sonika Agarwal on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1e8bc682-82ff-4874-bf57-d3e70110088c';

-- Pooja & Essentials / Griha Pravesh — Griha Pravesh Coconut & Mango Leaves Kit
--   query: Griha Pravesh Coconut & Mango Leaves Kit indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14395447/pexels-photo-14395447.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant setup for a Hindu ritual showing fruits, flowers, and a coconut, alongside traditional attire.',
  image_credit     = 'Photo by BANU FILM  ADS on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a3656aa3-8e9d-4c8b-8583-373f8f0f24f9';

-- Pooja & Essentials / Griha Pravesh — Griha Pravesh Complete Pooja Kit
--   query: Griha Pravesh Complete Pooja Kit indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13772390/pexels-photo-13772390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Detailed puja thali featuring ritual items used in Indian ceremonies, displaying cultural richness.',
  image_credit     = 'Photo by star photography on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '059da8ec-3780-4e7d-8061-5f360c9ab3de';

-- Pooja & Essentials / Wedding Pooja — Haldi Ceremony Kit
--   query: haldi ceremony turmeric decoration indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31002035/pexels-photo-31002035.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Traditional Indian decorations at a Haldi ceremony featuring marigold flowers and ornate pots.',
  image_credit     = 'Photo by Naresh Babu on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4488f05f-6660-4e67-9dbf-99cf6526c997';

-- Pooja & Essentials / Daily Pooja — Incense Holder (Brass Agarbatti Stand)
--   query: Incense Holder Daily Pooja indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8818750/pexels-photo-8818750.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant depiction of a traditional Indian Diwali ritual with decorated lights and cultural symbols.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5024a6d1-3b9a-4edf-b8c8-ed595510d5ff';

-- Pooja & Essentials / Janmashtami — Janmashtami Jhula (Cradle) Decoration
--   query: Janmashtami Jhula Decoration indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29359312/pexels-photo-29359312.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'An array of items arranged for a traditional Indian religious ceremony, featuring colorful patterns and offerings.',
  image_credit     = 'Photo by Trishik Bose on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '47e0ad4c-b1c3-4401-8d43-e0d8d3793561';

-- Pooja & Essentials / Janmashtami — Janmashtami Pooja Samagri Kit
--   query: Janmashtami Pooja Samagri Kit indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8818668/pexels-photo-8818668.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant Diwali altar with golden plate of sweets and lighted candles, perfect for capturing the festive spirit.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '893c8eb9-6ca3-4b35-93e2-c266f8599ca8';

-- Pooja & Essentials — Kalash (Brass Pot with Coconut)
--   query: Kalash indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38109564/pexels-photo-38109564.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant Indian puja thali with flowers, mango, and copper kalash for traditional rituals.',
  image_credit     = 'Photo by aksinfo7 universe on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c85e3a81-444a-4c6c-b72e-d539bc50a824';

-- Pooja & Essentials / Regional & Other — Kalash Kalasam Decoration Set
--   query: Kalash Kalasam Decoration Set Regional & Other indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8887006/pexels-photo-8887006.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A woman in traditional attire participates in a colorful Indian cultural ceremony with flower garlands and offerings.',
  image_credit     = 'Photo by Lara Jameson on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '53da0f68-9811-44b5-86ce-03f16eafd79a';

-- Pooja & Essentials / Janmashtami — Krishna Idol Set (Janmashtami)
--   query: Krishna Idol Set Janmashtami indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31513880/pexels-photo-31513880.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant statues of Hindu deities adorned with flowers, depicting a traditional ritual setup.',
  image_credit     = 'Photo by VipinVihari  Murari Das on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c4b1b4e7-617d-429a-8976-2186ad1fd2b8';

-- Pooja & Essentials — Kumkum & Turmeric Combo
--   query: Kumkum & Turmeric Combo indian puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6359420/pexels-photo-6359420.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a traditional Indian ritual with hands preparing offerings, emphasizing cultural richness.',
  image_credit     = 'Photo by Guntaka Subbareddy on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e219a4b8-8f33-432a-9b05-179fc870ec2c';

-- Pooja & Essentials / Diwali — Lakshmi-Ganesh Idol Set (Diwali Pooja)
--   query: diwali diya lamps indian festival puja ritual brass
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32357382/pexels-photo-32357382.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a brass diya with yellow flowers during a festive occasion in India.',
  image_credit     = 'Photo by Suresh Photography on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '70e03283-b7b3-4945-8a4c-39116b840f44';

COMMIT;
