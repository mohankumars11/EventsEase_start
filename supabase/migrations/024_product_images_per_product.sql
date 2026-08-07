-- ============================================================
-- Migration 024: per-product photography.  GENERATED FILE.
--
-- Produced by scripts/resolve-product-images.mjs on 2026-08-07 from pexels.
-- Do not hand-edit: re-run the script instead.
--
-- Replaces the category-wide image_url assignments made by migrations 017
-- and 021, under which every birthday cake shared one photograph. Each
-- statement below targets a single product id, and no two products in the
-- same category were given the same photo.
--
-- 61 products:
--     61  Cakes
--
-- image_source stays 'stock' — these are licensed lookalikes, and the UI
-- labels them "Representative image". An admin uploading a real photo via
-- the Catalog tab flips the row to 'actual'. See migration 023.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;

-- Cakes / Photo Cake — A4 Photo Cake (1kg)
--   query: edible photo print cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36568408/pexels-photo-36568408.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicious layer cake displayed in a cozy studio setup with artistic lighting.',
  image_credit     = 'Photo by cnrdmroglu on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '0862a17a-dba8-4953-ba37-29f5137395bd';

-- Cakes / Independence Day — Ashoka Chakra Photo Cake (1kg)
--   query: edible photo print cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10513305/pexels-photo-10513305.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant array of pastries with floral decorations displayed in a Melbourne bakery case.',
  image_credit     = 'Photo by Mavluda Tashbaeva on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '61365235-4a43-43e8-b2b0-5f70505b1d75';

-- Cakes / Baby Shower — Baby Shower Cake — It's a Boy (1kg)
--   query: Baby Shower Cake — It's a Boy dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6461823/pexels-photo-6461823.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Festive gender reveal cake with pink and blue icing for a special celebration.',
  image_credit     = 'Photo by Tima Miroshnichenko on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '508ec726-d20a-43c5-89a7-00741093070a';

-- Cakes / Baby Shower — Baby Shower Cake — It's a Girl (1kg)
--   query: Baby Shower Cake — It's a Girl dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11102539/pexels-photo-11102539.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A gender reveal cake with baby decor and pink and blue cupcakes on a stand, perfect for celebrations.',
  image_credit     = 'Photo by Akshay Bineesh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f3d5acc4-5ce2-4ae9-9f13-e0194ecf5866';

-- Cakes / Birthday — Barbie Theme Cake (1.5kg)
--   query: pink fondant doll birthday cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10949653/pexels-photo-10949653.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming mermaid themed birthday cake setup with pastel decorations and toy figures.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f2bcccb4-6ec8-4092-adcf-4c570c96c628';

-- Cakes / Birthday — Black Forest Birthday Cake (1kg)
--   query: Black Forest Birthday Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8802102/pexels-photo-8802102.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicious Black Forest cake topped with whipped cream and cherries on a cake stand.',
  image_credit     = 'Photo by Сослан on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4d99e71a-7ba1-49c9-837a-5e919762ccf9';

-- Cakes / Farewell — Bon Voyage Cake (1kg)
--   query: Bon Voyage Cake Farewell dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12927170/pexels-photo-12927170.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant display of assorted colorful cakes and desserts, perfect for celebrations.',
  image_credit     = 'Photo by Engin Akyurt on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7a227108-937c-47d1-98e2-cc936592fa34';

-- Cakes — Butterscotch Cake (1kg)
--   query: Butterscotch Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5060454/pexels-photo-5060454.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Rich vanilla ice cream topped with caramel sauce and crunchy nuts.',
  image_credit     = 'Photo by ROMAN ODINTSOV on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8b5e4a88-a299-42f6-86fa-c58f219b0459';

-- Cakes / Kids & Theme — Car Racing Theme Cake (1kg)
--   query: race track birthday cake for kids dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/27175436/pexels-photo-27175436.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant car-themed birthday table with cupcakes, candy, and cake for two-year-old celebration.',
  image_credit     = 'Photo by Helena Lopes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd7b966cb-876e-4478-98fc-a6844b1b156a';

-- Cakes / Birthday — Cartoon Theme Cake (1kg)
--   query: colourful character fondant birthday cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10336820/pexels-photo-10336820.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful superhero cake featuring a fondant Superman figurine on top, perfect for themed parties.',
  image_credit     = 'Photo by Helena Lopes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3476936f-5e7a-464c-9312-4200dd679c66';

-- Cakes / Wedding — Chocolate Ganache Wedding Cake (2kg)
--   query: Chocolate Ganache Wedding Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18613266/pexels-photo-18613266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Indulge in a delicious chocolate cake topped with fresh berries, perfect for celebrations.',
  image_credit     = 'Photo by Anete Lusina on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '966ef82d-5847-4c66-ae42-228417d14f62';

-- Cakes / Valentine — Chocolate Love Cake (1kg)
--   query: Chocolate Love Cake Valentine dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31629972/pexels-photo-31629972.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A pink cake with ''Love'' icing, perfect for romantic occasions. Captured in bright sunlight.',
  image_credit     = 'Photo by Frank Schrader on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '30ae8efb-4adf-4a1b-bf0c-e518c8cb899f';

-- Cakes / Birthday — Chocolate Overload Birthday Cake (1kg)
--   query: Chocolate Overload Birthday Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12616001/pexels-photo-12616001.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a decorated chocolate cake for a 5th birthday celebration.',
  image_credit     = 'Photo by Atlantic Ambience on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6d8180a1-2dfb-485d-8e8b-614fbb23b2ab';

-- Cakes — Chocolate Truffle Cake (1kg)
--   query: Chocolate Truffle Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37382219/pexels-photo-37382219.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a chocolate cake topped with vibrant strawberries and chocolate truffles.',
  image_credit     = 'Photo by basunga visual on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '81c4cb06-be95-4d7e-8a88-804e8203b7fd';

-- Cakes / Photo Cake — Collage Photo Cake (1.5kg)
--   query: edible photo print cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/33731580/pexels-photo-33731580.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Artfully arranged chocolate dessert garnished with fresh strawberries and edible flowers, captured indoors.',
  image_credit     = 'Photo by Eden FC on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7edb9c94-25ed-4b1b-b37f-c98ae391b490';

-- Cakes / Anniversary — Couple Photo Cake (1kg)
--   query: edible photo print cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11112058/pexels-photo-11112058.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicious chocolate cake topped with pretzels, blueberries, and candy bars for a stunning dessert presentation.',
  image_credit     = 'Photo by Daka on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4d38d927-b174-468b-b480-5c70ddd0105c';

-- Cakes — Cupcake Box (Set of 6)
--   query: Cupcake Box cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/3983704/pexels-photo-3983704.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Crop person in black glove decorating cream top of cupcakes with cocktail cherries packing sweets in white box',
  image_credit     = 'Photo by Gustavo Fring on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5eddc042-0e7b-45bd-8b71-1c84531078cd';

-- Cakes / Kids & Theme — Dinosaur Theme Cake (1kg)
--   query: green jungle dinosaur birthday cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38283435/pexels-photo-38283435.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming green dinosaur cake with a chocolate dessert, topped with a cherry. Perfect for a child''s birthday celebration.',
  image_credit     = 'Photo by Rüveyda Akkaya on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '062c8883-1974-4676-b954-9e2e738f4ddd';

-- Cakes / Eggless — Eggless Black Forest Cake (1kg)
--   query: Eggless Black Forest Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/2147868/pexels-photo-2147868.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a slice of Black Forest cake with cream, cherry, and chocolate on a woven background.',
  image_credit     = 'Photo by Quang Nguyen Vinh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9b41ef93-9093-45cd-b770-f7bc2a91a975';

-- Cakes / Eggless — Eggless Butterscotch Cake (1kg)
--   query: Eggless Butterscotch Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35035889/pexels-photo-35035889.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Indulgent dessert with layers of cream, caramel, and crunchy nuts, perfect for festive occasions.',
  image_credit     = 'Photo by Rodrigo Menezes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cd60178b-2886-4d4c-a117-13aea356182c';

-- Cakes / Eggless — Eggless Chocolate Truffle Cake (1kg)
--   query: Eggless Chocolate Truffle Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/17822813/pexels-photo-17822813.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Top-down view of a chocolate and strawberry dessert surrounded by Christmas decorations.',
  image_credit     = 'Photo by Denner Trindade on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5248eb2e-ffb3-4946-af95-a3c5e1cdf356';

-- Cakes / Eggless — Eggless Fresh Fruit Cake (1kg)
--   query: Eggless Fresh Fruit Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18613262/pexels-photo-18613262.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Hand placing fresh berries on a chocolate-covered cake, creating a delicious dessert.',
  image_credit     = 'Photo by Anete Lusina on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '60d64c87-896a-4c99-a3bb-42226fef579b';

-- Cakes / Eggless — Eggless Red Velvet Cake (1kg)
--   query: Eggless Red Velvet Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12364900/pexels-photo-12364900.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Tempting red velvet layered pastries arranged neatly on a glass platter, perfect for dessert lovers.',
  image_credit     = 'Photo by Xuân Thống Trần on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a629d6fb-48fa-4b2c-9b65-42f4647b3dd3';

-- Cakes / Eggless — Eggless Vanilla Cake (1kg)
--   query: Eggless Vanilla Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/2144112/pexels-photo-2144112.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Indulge in this mouthwatering slice of strawberry cream cake, perfect for dessert lovers.',
  image_credit     = 'Photo by Quang Nguyen Vinh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b12bf086-6b97-4e08-881a-19631196803e';

-- Cakes / Farewell — Farewell Message Cake (1kg)
--   query: Farewell Message Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31999343/pexels-photo-31999343.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant and colorful Mother''s Day cake adorned with flowers and butterflies, lit by a single candle.',
  image_credit     = 'Photo by Busenur Demirkan on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4ac55689-fef9-4e6e-9da1-46ab3a62005a';

-- Cakes / Wedding — Floral Wedding Cake (2kg)
--   query: Floral Wedding Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30233124/pexels-photo-30233124.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful white cake topped with flowers perfect for weddings and celebrations.',
  image_credit     = 'Photo by Bruno Mattos on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cab78c41-a79e-45e9-9174-1985cbfbe162';

-- Cakes / Birthday — Fondant Birthday Cake (1kg)
--   query: Fondant Birthday Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/2337829/pexels-photo-2337829.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully decorated dessert table featuring a floral themed cake and assorted sweets.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '68cdfa49-c47f-4ce1-b36e-4c805e324302';

-- Cakes / Kids & Theme — Football Theme Cake (1kg)
--   query: football pitch birthday cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9189206/pexels-photo-9189206.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Playful soccer-themed birthday table setup with a football cake centerpiece.',
  image_credit     = 'Photo by Helena Lopes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '424aabf9-87b5-4bfa-967a-213f4d6cf7f6';

-- Cakes / Anniversary — Golden Anniversary Cake (1kg)
--   query: gold leaf anniversary cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32570489/pexels-photo-32570489.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A delicious cake for a 95th birthday, adorned with strawberries and chocolate drizzle.',
  image_credit     = 'Photo by Ahimsa -  OM on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '09ba7973-f18c-4769-9d38-cd67f238cf9b';

-- Cakes / Congratulations — Graduation Cap Cake (1kg)
--   query: Graduation Cap Cake Congratulations dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7723809/pexels-photo-7723809.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Graduation celebration scene with diploma, congrats card, and cupcake decoration.',
  image_credit     = 'Photo by Tara Winstead on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2fdf7695-a2b5-4d21-aa68-1d7c14717161';

-- Cakes / Valentine — Heart Red Velvet Valentine Cake (1kg)
--   query: Heart Red Velvet Valentine Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9395562/pexels-photo-9395562.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant still life featuring red velvet cake and a doughnut on a table with heart decorations.',
  image_credit     = 'Photo by Lucas Andrade on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a8c64068-19cb-46cf-a7b3-41f1a1c2e144';

-- Cakes / Anniversary — Heart-Shaped Anniversary Cake (1kg)
--   query: heart shaped red velvet cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/4161504/pexels-photo-4161504.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delightful heart-shaped desserts with smiley faces, perfect for Valentine''s Day celebrations.',
  image_credit     = 'Photo by Lucian Pirvu on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'dfc0ff6e-7929-4b74-b75d-758c75e0dcc4';

-- Cakes / Independence Day — Independence Day Cupcakes (Box of 6)
--   query: Independence Day Cupcakes cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8202997/pexels-photo-8202997.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two friends savoring cupcakes with Independence Day decorations at home.',
  image_credit     = 'Photo by Polina Tankilevitch on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6c8722f8-38a6-464d-8df0-cd3ebc2f8bf6';

-- Cakes / Kids & Theme — Minion Theme Cake (1kg)
--   query: yellow fondant character cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12689068/pexels-photo-12689068.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant Spider-Man themed dessert table with cakes and sweets in comic style decor.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3651f8ec-af8e-41fe-b6b4-f3d59e9cc616';

-- Cakes / Farewell — Miss You Already Cake (1kg)
--   query: Miss You Already Cake Farewell dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7471081/pexels-photo-7471081.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Flatlay of a delicious cake with ''I Love You'' letters and fresh strawberries on a pink background.',
  image_credit     = 'Photo by alleksana on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '189bfc62-10a0-44c6-96fe-ccd93cdfbfe3';

-- Cakes / Wedding — Naked Wedding Cake (1.5kg)
--   query: semi frosted naked cake with berries dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8199265/pexels-photo-8199265.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a strawberry cake adorned with chocolate-dipped strawberries and flowers.',
  image_credit     = 'Photo by FATMA AKGÜN on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f22469d9-883b-49f5-bacb-94ed8a9e9df8';

-- Cakes / Congratulations — New Job Congrats Cake (1kg)
--   query: New Job Congrats Cake Congratulations dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14968375/pexels-photo-14968375.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful celebration cake with fun text on pink background; perfect for joyous occasions.',
  image_credit     = 'Photo by Carlie Wright on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f220ae12-b5b2-42d8-9b3c-aa6eaebb2f49';

-- Cakes / Birthday — Number Shaped Cake (0.5kg)
--   query: number shaped birthday cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10885107/pexels-photo-10885107.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully decorated cake with a golden number five candle lit on top, perfect for a fifth birthday celebration.',
  image_credit     = 'Photo by Sunj Rbt on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cfcff365-7ae4-432b-bc10-d8906b0367eb';

-- Cakes — Photo Cake (1kg)
--   query: edible photo print cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13914951/pexels-photo-13914951.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up shot of various cakes in a bakery display case, showcasing different flavors and designs.',
  image_credit     = 'Photo by Sarah Films on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a2330adf-e924-4b74-91cb-0cf493bd2f96';

-- Cakes / Photo Cake — Photo Cupcakes (Box of 6)
--   query: Photo Cupcakes Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7454368/pexels-photo-7454368.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicious cupcakes with green frosting on a glass stand surrounded by flowers.',
  image_credit     = 'Photo by Son Tung Tran on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e878ebcc-4c03-4176-9572-ac9974a2378b';

-- Cakes / Kids & Theme — Pinata Cake — Kids Surprise (1.5kg)
--   query: Pinata Cake — Kids Surprise & Theme dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32277511/pexels-photo-32277511.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Cute baby reaching for cake in a colorful candy-themed setting, perfect for celebrations.',
  image_credit     = 'Photo by Krishna Kids  Photography on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '911da8df-07e8-4f4f-a58d-a74e06a57cb7';

-- Cakes — Pineapple Cake (1kg)
--   query: Pineapple Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13963474/pexels-photo-13963474.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a frosted pineapple almond cake on a stand, perfect for dessert lovers.',
  image_credit     = 'Photo by Jorge Zaldívar Marroquín on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9eaca8ac-11d6-4455-85be-45de837475ae';

-- Cakes / Kids & Theme — Princess Castle Cake (1.5kg)
--   query: three tier castle shaped fondant cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12919163/pexels-photo-12919163.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a beautifully decorated three-tier wedding cake featuring intricate icing and pastel rose embellishments.',
  image_credit     = 'Photo by Rene Terp on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '64bb04b7-ec33-4be1-bbf1-84b80c166060';

-- Cakes / Congratulations — Promotion Celebration Cake (1kg)
--   query: Promotion Celebration Cake Congratulations dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30877409/pexels-photo-30877409.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant red velvet cake with cream frosting and colorful candles, perfect for a birthday celebration.',
  image_credit     = 'Photo by Israyosoy S. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '81e0dcad-a9de-4648-9d14-8668034360dd';

-- Cakes / Birthday — Pull-Me-Up Surprise Cake (1kg)
--   query: Pull-Me-Up Surprise Cake Birthday dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/137485/pexels-photo-137485.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a birthday cake with lit candles and smoke, celebrating indoors with joy.',
  image_credit     = 'Photo by Matthias Zomer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '98e423d4-fdde-4e94-9e0c-6ad5cf62891d';

-- Cakes / Birthday — Rainbow Layer Cake (1kg)
--   query: Rainbow Layer Cake Birthday dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/248475/pexels-photo-248475.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant rainbow cake with a Malaysian flag, perfect for celebrations and parties.',
  image_credit     = 'Photo by Pok Rie on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1334e009-a8ed-45ed-bb0a-b317f4aaafea';

-- Cakes — Red Velvet Cake (1kg)
--   query: Red Velvet Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5112676/pexels-photo-5112676.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicious red velvet cake slice with cream cheese frosting and fresh berries on top.',
  image_credit     = 'Photo by Shameel mukkath on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c4a9e2c4-ce17-4f67-8a71-1e76ac10060b';

-- Cakes / Wedding — Red Velvet Wedding Cake (2kg)
--   query: Red Velvet Wedding Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/33339344/pexels-photo-33339344.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Appetizing red velvet cake topped with cream swirls, perfect for celebrations.',
  image_credit     = 'Photo by Trishik Bose on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2e0f33b0-d113-4314-bd4c-940b3b975e01';

-- Cakes / Anniversary — Rose Anniversary Cake (1kg)
--   query: Rose Anniversary Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/433527/pexels-photo-433527.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully decorated pink cake with curly candles and a floral bouquet, perfect for romantic celebrations.',
  image_credit     = 'Photo by Jill Wellington on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '51406be9-dc3a-4a48-9088-cdaa812a1bba';

-- Cakes / Valentine — Rose Theme Valentine Cake (1kg)
--   query: Rose Theme Valentine Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31328163/pexels-photo-31328163.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Romantic white cake with ''I Love You'' message, surrounded by red rose petals and candles. Ideal for Valentine''s Day.',
  image_credit     = 'Photo by Beyza Yalçın on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7ec184db-f6bc-495c-a874-7c75361368f6';

-- Cakes / Anniversary — Silver Jubilee Cake (1kg)
--   query: silver anniversary cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/17109131/pexels-photo-17109131.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully decorated white cake surrounded by lush greenery and white floral arrangements on a wooden table.',
  image_credit     = 'Photo by Matheus Bertelli on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6a202632-05ed-40ae-9b64-4980ca9877be';

-- Cakes / Kids & Theme — Spiderman Theme Cake (1kg)
--   query: red and blue superhero fondant cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10336823/pexels-photo-10336823.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful superhero-themed cake with cityscape design and comic book elements, perfect for parties.',
  image_credit     = 'Photo by Helena Lopes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9c84dfd4-844c-4fd2-a2f1-41d8e1bf1279';

-- Cakes / Baby Shower — Stork Delivery Cake (1kg)
--   query: Stork Delivery Cake Baby Shower dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6932339/pexels-photo-6932339.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a whimsical stork carrying a baby figurine on a cake top, ideal for baby showers.',
  image_credit     = 'Photo by Mateus Gomes on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '41b9fef4-b0a5-42f5-9ada-c491b22121ad';

-- Cakes / Congratulations — Success Star Cake (1kg)
--   query: Success Star Cake Congratulations dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11794094/pexels-photo-11794094.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a vibrant birthday cake with star decorations being placed in a box.',
  image_credit     = 'Photo by Afif Ramdhasuma on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c2d17829-5fbc-43d2-9a22-f277845b324a';

-- Cakes / Baby Shower — Teddy Bear Baby Cake (1kg)
--   query: Teddy Bear Baby Cake Shower dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29964261/pexels-photo-29964261.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delightful baby shower cake with teddy bear toppers and elegant decoration for a baby boy theme.',
  image_credit     = 'Photo by Larissa Teixeira Fotografia on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5dd49b43-cd7f-4ab4-b403-28621a99b891';

-- Cakes / Wedding — Three-Tier Wedding Cake (3kg)
--   query: three tier white wedding cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38598633/pexels-photo-38598633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully decorated three-tier wedding cake adorned with elegant roses set outdoors.',
  image_credit     = 'Photo by tommy picone on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a754b446-ba40-4364-864a-e502d4599b22';

-- Cakes / Independence Day — Tiranga Fondant Cake (1.5kg)
--   query: Tiranga Fondant Cake Independence Day dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32916206/pexels-photo-32916206.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Row of neatly arranged colorful layered cakes with orange triangular toppings on a white platter.',
  image_credit     = 'Photo by lee c on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '53c98bdc-65d0-4300-83f0-e9006963d79b';

-- Cakes / Independence Day — Tricolor Theme Cake (1kg)
--   query: Tricolor Theme Cake Independence Day dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7221003/pexels-photo-7221003.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Celebrate Canada Day with a delicious assortment of themed desserts perfect for any gathering.',
  image_credit     = 'Photo by Cedric Fauntleroy on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '901848cb-8113-477d-b970-c4d4ddcc8f5a';

-- Cakes / Kids & Theme — Unicorn Theme Cake (1kg)
--   query: pastel unicorn cake with gold horn dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1857157/pexels-photo-1857157.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant unicorn-themed birthday party setup with cakes, cupcakes, and decorations.',
  image_credit     = 'Photo by Silvia Trigo on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8d2c3058-5c0b-42ea-9cec-4a1692d0ecb7';

-- Cakes / Birthday — Vanilla Sponge Birthday Cake (1kg)
--   query: Vanilla Sponge Birthday Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8015236/pexels-photo-8015236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a white frosted cake topped with vibrant red currants.',
  image_credit     = 'Photo by Cup of  Couple on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3f40081d-0cc0-4121-b2f1-7d674bd56844';

-- Cakes / Wedding — White Fondant Wedding Cake (2kg)
--   query: White Fondant Wedding Cake dessert food photography
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/19063533/pexels-photo-19063533.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A sophisticated two-tier white wedding cake adorned with floral details, perfect for romantic celebrations.',
  image_credit     = 'Photo by Jonathan Borba on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd99434fc-59b8-4fd4-87fd-8e499869c875';

COMMIT;
