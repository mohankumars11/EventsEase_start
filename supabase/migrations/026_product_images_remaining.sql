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
-- 183 products:
--     57  Flowers
--     63  Gifts
--     59  Hampers
--      4  Party Essentials
--
-- image_source stays 'stock' — these are licensed lookalikes, and the UI
-- labels them "Representative image". An admin uploading a real photo via
-- the Catalog tab flips the row to 'actual'. See migration 023.
--
-- Run this in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================

BEGIN;


-- Flowers / Anniversary — Anniversary Orchid Arrangement
--   query: Anniversary Orchid Arrangement flower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12919506/pexels-photo-12919506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up of a beautiful pink rose bouquet with orchids on a rustic wooden table.',
  image_credit     = 'Photo by Rene Terp on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bdfc39ef-d3eb-4340-aa31-eef4c6f16c6d';

-- Flowers / Anniversary — Anniversary Red Rose Bouquet (25 stems)
--   query: Anniversary Red Rose Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11196806/pexels-photo-11196806.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a vivid red rose bouquet wrapped in orange paper with green leaves indoors.',
  image_credit     = 'Photo by Shameel mukkath on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '616b6acf-c776-4756-be7d-20f32a5edbe3';

-- Flowers / Baby Shower — Baby Shower Pastel Bouquet
--   query: Baby Shower Pastel Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8777997/pexels-photo-8777997.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicate pastel-colored baby''s breath flowers in a soft focus bouquet.',
  image_credit     = 'Photo by Nika Benedictova on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c33a3492-b6ed-4b13-a4d3-45ece06307d6';

-- Flowers / Birthday — Balloon & Flower Combo
--   query: Balloon & Flower Combo Birthday bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18004480/pexels-photo-18004480.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Young woman with balloons and floral bouquet celebrates indoors with a smile.',
  image_credit     = 'Photo by Roman Oleksiienko on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9617494e-f022-4dff-b35c-4c869502bf38';

-- Flowers / Birthday — Birthday Basket Arrangement
--   query: Birthday Basket Arrangement flower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29015813/pexels-photo-29015813.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful floral bouquet with pink roses and daisies inside a well-lit room.',
  image_credit     = 'Photo by Tuấn Kiệt Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8c805fbc-5afd-49b1-bf6f-68bfe65884d8';

-- Flowers / Birthday — Birthday Mixed Bouquet (20 stems)
--   query: Birthday Mixed Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31870262/pexels-photo-31870262.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming mixed flower bouquet featuring roses and carnations against a pink backdrop.',
  image_credit     = 'Photo by Samuel  Rodriguez on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1bcb6a13-8775-401b-bf1b-58fe3aaf1e24';

-- Flowers / Farewell — Bon Voyage Flower Box
--   query: Bon Voyage Flower Box Farewell bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18057437/pexels-photo-18057437.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming bouquet of pink roses in a decorative box, perfect for romantic gifts.',
  image_credit     = 'Photo by Vladimir Srajber on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '32a75e2b-a03d-4d2c-abbd-fbf23b4235c7';

-- Flowers / Wedding — Bridal Bouquet (White Roses)
--   query: Bridal Bouquet Wedding flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1808178/pexels-photo-1808178.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up of a stunning bridal bouquet featuring white and pink roses with mixed flowers.',
  image_credit     = 'Photo by Rodolfo Quirós on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'da26f6c1-404d-44ee-80c8-9e10c14521ca';

-- Flowers / Daily & Pooja — Carnation Bunch (10 stems)
--   query: Carnation Bunch Daily & Pooja flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7531290/pexels-photo-7531290.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up of a hand holding an elegant bouquet of pink and white carnations. Perfect for floral themes.',
  image_credit     = 'Photo by Merve on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7e399bdb-3e7a-475e-a73b-41d4d2e3cef3';

-- Flowers / Birthday — Chocolate & Flower Bouquet
--   query: Chocolate & Flower Bouquet Birthday arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1682474/pexels-photo-1682474.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautifully decorated cake with vibrant floral arrangements for a special occasion.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f2c79c61-8216-49de-b8e5-079600f32b3f';

-- Flowers / Congratulations — Congratulations Bouquet (Mixed Bright)
--   query: Congratulations Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38535703/pexels-photo-38535703.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Graduation cap with colorful flower bouquets and diploma on green grass.',
  image_credit     = 'Photo by Fatmanur  Üzüm on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f8374581-972f-44f8-9e8d-eec09790f376';

-- Flowers / Daily & Pooja — Daisy Bouquet (Cheerful)
--   query: Daisy Bouquet Daily & Pooja flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10583573/pexels-photo-10583573.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up shot of fresh white daisies with yellow centers, showcasing natural beauty.',
  image_credit     = 'Photo by Katrenur on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2ee7576a-37bf-4456-958d-6bfa7d0420e6';

-- Flowers / Festive — Diwali Marigold & Rose Torans (Pair)
--   query: diwali diya lamps indian festival flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29215357/pexels-photo-29215357.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful marigold flowers and decorative diyas create a warm festive ambiance for Diwali celebration.',
  image_credit     = 'Photo by Arindam Chowdhury on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5a6466f6-67d7-4112-aa8d-f29256347aba';

-- Flowers / Birthday — Exotic Lily Bouquet (10 stems)
--   query: Exotic Lily Bouquet Birthday flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/34524770/pexels-photo-34524770.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of elegant pink lilies in a decorative vase against a blurry background.',
  image_credit     = 'Photo by Sóc Năng Động on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '023899e5-94ec-4fd0-9961-ddce4df57a3e';

-- Flowers / Farewell — Farewell Bouquet (Mixed Elegant)
--   query: Farewell Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14838568/pexels-photo-14838568.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful red roses placed on a tombstone, symbolizing love and remembrance in a cemetery setting.',
  image_credit     = 'Photo by Ivan Cuesta on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '398ad58a-080f-42d3-8b66-70ed7a8d1569';

-- Flowers / Festive — Festive Flower Rangoli Kit
--   query: Festive Flower Rangoli Kit bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8818665/pexels-photo-8818665.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A hand crafting a vibrant floral rangoli with yellow and orange marigold petals for a festive celebration.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '36821bb7-8243-47e3-833b-2bf6ddbe00a3';

-- Flowers / Anniversary — Forever Love Bouquet (50 Roses)
--   query: Forever Love Bouquet Anniversary flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1467175/pexels-photo-1467175.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Golden wedding rings with a bouquet of white roses, perfect elegance.',
  image_credit     = 'Photo by Abet Llacer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7053520a-a7b7-4dc1-b03e-99148962f080';

-- Flowers / Daily & Pooja — Fresh Marigold Garland (Pair)
--   query: Fresh Marigold Garland Daily & Pooja flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31219858/pexels-photo-31219858.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant flower market in Bengaluru showcasing marigold garlands and local culture.',
  image_credit     = 'Photo by Suhas Hanjar on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1dd74213-f72e-4ec9-9da2-2c46d5950e27';

-- Flowers — Fresh Rose Bouquet (12 stems)
--   query: Fresh Rose Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14297662/pexels-photo-14297662.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A stunning bouquet of red and pink roses with hints of yellow, perfect for any occasion.',
  image_credit     = 'Photo by Soubhagya Maharana on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5c4622d9-966d-4e51-8e4e-23805a7e1dbc';

-- Flowers / Get Well — Fruit & Flower Basket
--   query: Fruit & Flower Basket Get Well bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37971783/pexels-photo-37971783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful composition of apples, grapes, and flowers in a rustic setting, perfect for autumn.',
  image_credit     = 'Photo by Matvei on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b09cf28b-748b-43e7-8dc6-5aa2243f92e3';

-- Flowers / Festive — Ganesh Chaturthi Flower Decoration Pack
--   query: ganesh chaturthi idol decoration flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29761478/pexels-photo-29761478.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful Ganesh idol adorned with flowers during Chaturthi festival in Mumbai.',
  image_credit     = 'Photo by Sonika Agarwal on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '47876819-edcd-4e7a-b79b-27daf4597208';

-- Flowers / Birthday — Gerbera Delight Bouquet
--   query: Gerbera Delight Bouquet Birthday flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/16180601/pexels-photo-16180601.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A colorful bouquet featuring a variety of spring flowers including gerbera, roses, and chrysanthemums.',
  image_credit     = 'Photo by Corneliu Stefan Esanu on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4e8d7454-596c-442f-8df5-9b5d015657f0';

-- Flowers / Get Well — Get Well Cheerful Bouquet
--   query: Get Well Cheerful Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30705600/pexels-photo-30705600.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Pink daisies in a glass vase with a ''Gute Besserung'' card on wooden table.',
  image_credit     = 'Photo by Katja B on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ea1975e8-fd02-4c3f-b53f-4d958ad5c09a';

-- Flowers / Get Well — Get Well Soon Plant Gift
--   query: Get Well Soon Plant Gift flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36508341/pexels-photo-36508341.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Bright yellow chrysanthemums blooming beautifully, wrapped in vibrant green paper.',
  image_credit     = 'Photo by Kally Dru on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8f4e68f8-fe8e-428e-8566-8400dc8a7f73';

-- Flowers / Congratulations — Graduation Flower Bouquet
--   query: Graduation Flower Bouquet Congratulations arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35817941/pexels-photo-35817941.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Graduate in cap and gown holding a white rose bouquet, symbolizing achievement and new beginnings.',
  image_credit     = 'Photo by Fenn on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'eeea321e-685f-4198-ae5a-f2d4418166cd';

-- Flowers / Congratulations — Grand Opening Flower Stand
--   query: Grand Opening Flower Stand Congratulations bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18928253/pexels-photo-18928253.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Man celebrating graduation with flowers and balloon outdoors in a park.',
  image_credit     = 'Photo by Ameer Ridz on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '0f675ce6-c4bc-4580-9660-aa520977bf88';

-- Flowers / Wedding — Groom Boutonniere & Bride Bouquet Combo
--   query: Groom Boutonniere & Bride Bouquet Combo Wedding flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/18183701/pexels-photo-18183701.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a bride and groom in elegant wedding attire, holding hands with vibrant bouquet.',
  image_credit     = 'Photo by Gustavo Henrique on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '0a0651a1-3c1e-4e5a-9479-604c5c43d95f';

-- Flowers / Valentine — Heart-Shaped Rose Arrangement
--   query: heart shaped red velvet cake flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5714434/pexels-photo-5714434.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A heart-shaped gift box filled with red roses, ideal for romantic occasions and celebrations.',
  image_credit     = 'Photo by Marcelo Joaquim on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a5bfef40-7960-4763-9fd4-d96c37425080';

-- Flowers / Housewarming — Housewarming Orchid Plant
--   query: Housewarming Orchid Plant flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30349394/pexels-photo-30349394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of white Phalaenopsis orchids with vibrant yellow centers in full bloom.',
  image_credit     = 'Photo by Tuấn Kiệt Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '22410a66-399b-427a-9b06-169d89a7d36a';

-- Flowers / Baby Shower — It's a Boy Flower Arrangement
--   query: It's a Boy Flower Arrangement Baby Shower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5266970/pexels-photo-5266970.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A stunning bridal bouquet featuring vivid blue roses and delicate white baby''s breath.',
  image_credit     = 'Photo by Marcelo Joaquim on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6af0d5d8-0511-4b50-a742-5616c07aa5d3';

-- Flowers / Baby Shower — It's a Girl Flower Arrangement
--   query: It's a Girl Flower Arrangement Baby Shower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32501412/pexels-photo-32501412.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A young girl poses beside a vibrant bouquet of pink flowers indoors.',
  image_credit     = 'Photo by Sóc Năng Động on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a5d136b8-3fb7-4c75-89f2-45ef9a7b73f8';

-- Flowers / Daily & Pooja — Jasmine Gajra (String)
--   query: Jasmine Gajra Daily & Pooja flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7138895/pexels-photo-7138895.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'From above of bouquet of fresh white jasmine flowers placed on wooden table in daylight',
  image_credit     = 'Photo by Julia Filirovska on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '29aad537-dff8-4eac-b2f8-7cb01f1691df';

-- Flowers / Daily & Pooja — Lotus Flowers (Pair, Pooja)
--   query: Lotus Flowers Daily & Pooja flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/2175754/pexels-photo-2175754.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A street vendor sells vibrant bouquets from a bicycle in an urban setting.',
  image_credit     = 'Photo by Quang Nguyen Vinh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cb44c755-81d2-4fe8-a4dd-cffbb53c2233';

-- Flowers / Housewarming — Lucky Bamboo Arrangement
--   query: Lucky Bamboo Arrangement Housewarming flower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/19894380/pexels-photo-19894380.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful flower arrangement with orange lilies and roses, perfect for banquet or event decor.',
  image_credit     = 'Photo by Jonathan Borba on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '155a3de4-b500-4d56-a4c6-6b239532da3d';

-- Flowers / Independence Day — Marigold & Tricolor Ribbon Bouquet
--   query: Marigold & Tricolor Ribbon Bouquet Independence Day flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819577/pexels-photo-8819577.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful wrapped presents on a tray adorned with lights and marigold flowers for Diwali celebration.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f818b315-bf3a-45f2-9406-362303f97668';

-- Flowers — Mixed Flower Basket
--   query: Mixed Flower Basket bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1858205/pexels-photo-1858205.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant bouquet of mixed flowers in a wicker basket, perfect for decoration.',
  image_credit     = 'Photo by Craig Adderley on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a1d40583-fa79-4c49-af8b-bba830250a2c';

-- Flowers / Daily & Pooja — Mixed Seasonal Flower Bunch
--   query: Mixed Seasonal Flower Bunch Daily & Pooja bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/17006300/pexels-photo-17006300.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of colorful flower bouquets showcasing roses and lotus at a market.',
  image_credit     = 'Photo by tu nguyen on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '23487436-992c-459e-a69f-cde2c0de3454';

-- Flowers / Housewarming — Money Plant in Ceramic Pot
--   query: Money Plant in Ceramic Pot Housewarming flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/23471277/pexels-photo-23471277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Fresh flowers in a white ceramic vase on a soft green background, ideal for decoration.',
  image_credit     = 'Photo by Eskoala A on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '91ebdb81-035e-4eb8-8beb-9a60c787a3e4';

-- Flowers / Festive — Navratri Flower Garland Set
--   query: Navratri Flower Garland Set Festive bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819317/pexels-photo-8819317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful Indian attire with marigolds and candle, capturing cultural celebration.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '79c65612-1bb6-49bd-8c95-06825718cfe1';

-- Flowers / Congratulations — New Job Success Bouquet
--   query: New Job Success Bouquet Congratulations flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35869236/pexels-photo-35869236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Smiling woman in white ao dai holding a bouquet with ''Happy Graduation'' sign.',
  image_credit     = 'Photo by Hồng Quang Official on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ffbd928d-d454-4f72-b8a3-c71081e11b34';

-- Flowers — Orchid Arrangement
--   query: Orchid Arrangement flower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12188478/pexels-photo-12188478.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Bunches of vibrant purple orchids displayed on a market stall with lush green leaves.',
  image_credit     = 'Photo by Markus Winkler on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3947c1e5-cd8b-4152-8aaa-75e9de644216';

-- Flowers / Sympathy — Peace Lily Plant (Sympathy Gift)
--   query: Peace Lily Plant Sympathy flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8963690/pexels-photo-8963690.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a person holding white lilies in a cemetery on a peaceful day.',
  image_credit     = 'Photo by Ivan S on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'edd0744a-2d49-4e09-bfbc-7996108fdfa2';

-- Flowers / Wedding — Rose Petal Bags (For Showering)
--   query: Rose Petal Bags Wedding flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30280732/pexels-photo-30280732.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'An elegant bouquet of pale white roses wrapped in a clear gift bag with a ribbon accent, perfect for celebrations.',
  image_credit     = 'Photo by rehman yousaf on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '497db205-2fc1-40df-91ea-91f7f4f648c0';

-- Flowers / Valentine — Single Rose Elegant Box
--   query: Single Rose Elegant Box Valentine flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13983705/pexels-photo-13983705.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Red rose on white surface with gift boxes, symbolizing love and romance. Perfect for Valentine''s Day.',
  image_credit     = 'Photo by Boris Hamer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7b8024db-306b-4c5f-8175-298f2a35879f';

-- Flowers / Daily & Pooja — Single Stem Rose (Daily Gifting)
--   query: Single Stem Rose Daily & Pooja flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1517358/pexels-photo-1517358.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of fresh pink roses in a glass vase against a light background.',
  image_credit     = 'Photo by Nubia Navarro (nubikini) on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '612c283a-5a35-4799-82e1-579e7e220dcc';

-- Flowers — Sunflower Bunch (10 stems)
--   query: Sunflower Bunch flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5656545/pexels-photo-5656545.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant sunflower bouquets arranged beautifully in a rustic setting, perfect for floral enthusiasts.',
  image_credit     = 'Photo by Shiebi AL on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '0c8cc37a-d254-454a-802c-002f18d4b876';

-- Flowers / Sympathy — Sympathy Standing Basket
--   query: Sympathy Standing Basket flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11193857/pexels-photo-11193857.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant bouquet of various blooming flowers showcasing colorful petals and lush greenery.',
  image_credit     = 'Photo by Jeffry Surianto on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5cb663d4-27f8-4adc-b24c-3be6ddbbdb11';

-- Flowers / Festive — Temple Flower Offering Basket
--   query: Temple Flower Offering Basket Festive bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38547540/pexels-photo-38547540.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant Thai floral arrangement featuring marigolds in a silver bowl at a traditional ceremony.',
  image_credit     = 'Photo by Zaonar Saizainalin on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2462ec99-f704-4442-b98d-c33ef86a4103';

-- Flowers / Anniversary — Tulip Bouquet (Imported, 15 stems)
--   query: Tulip Bouquet Anniversary flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7118701/pexels-photo-7118701.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant bouquet of pink, red, and purple tulips showcasing nature''s beauty indoors.',
  image_credit     = 'Photo by Anca on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '19975c48-b302-4c29-8f10-b8ba54c0dbc7';

-- Flowers / Valentine — Valentine Carnation Bouquet
--   query: Valentine Carnation Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/4219890/pexels-photo-4219890.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Top view of opened red envelope with beautiful red carnations against white background symbolizing congratulation concept',
  image_credit     = 'Photo by https://kaboompics.com/ on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6afe71dc-92ac-46a0-b82f-fce64d8c06f9';

-- Flowers / Valentine — Valentine Mixed Bouquet with Teddy
--   query: Valentine Mixed Bouquet with Teddy flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12486126/pexels-photo-12486126.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Bright red teddy bear and colorful flower bouquet, perfect for romance and celebration.',
  image_credit     = 'Photo by Narlin U. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '65d1ac13-94cc-47ef-a8f6-97b42fa91b9a';

-- Flowers / Valentine — Valentine Red Roses (50 stems)
--   query: Valentine Red Roses flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/196664/pexels-photo-196664.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A stunning close-up of red roses, perfect for romantic occasions and floral gift ideas.',
  image_credit     = 'Photo by picjumbo.com on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '28e3a630-9372-4437-bd54-ab9d658ccc27';

-- Flowers / Anniversary — Vase Arrangement (Mixed Premium)
--   query: Vase Arrangement Anniversary flower bouquet
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31043510/pexels-photo-31043510.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant arrangement of pastel roses in a decorative white vase, perfect for home decor.',
  image_credit     = 'Photo by The Bhullar on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b55c2f14-2a6b-4302-9abc-04d6584e58bf';

-- Flowers / Wedding — Wedding Car Decoration Flowers
--   query: Wedding Car Decoration Flowers flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29262698/pexels-photo-29262698.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Chic floral arrangement with a luxury blue car background, conveying elegance and style.',
  image_credit     = 'Photo by jian xiao on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ed3f3244-e48e-4a1f-aeb1-cda04df1c3a6';

-- Flowers / Wedding — Wedding Mandap Flower Décor Pack
--   query: Wedding Mandap Flower Décor Pack bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8887257/pexels-photo-8887257.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful flower garlands being held by a woman in an Indian market, showcasing vibrant cultural decor.',
  image_credit     = 'Photo by Lara Jameson on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd792ea00-f9b6-4b1c-bebe-7a26b9e20ff7';

-- Flowers / Sympathy — White Lily Sympathy Wreath
--   query: White Lily Sympathy Wreath flower bouquet arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8964078/pexels-photo-8964078.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A hand placing white lilies on a granite tombstone in an outdoor cemetery.',
  image_credit     = 'Photo by Ivan S on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'afaf0287-c045-4197-b2a0-ebaff9a225ef';

-- Flowers / Sympathy — White Rose Sympathy Bouquet
--   query: White Rose Sympathy Bouquet flower arrangement
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36756295/pexels-photo-36756295.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A bouquet of white roses in a vase indoors with soft natural light from church windows.',
  image_credit     = 'Photo by Jan van der Wolf on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '971b217f-b6b5-4033-ae15-6a5c669863cb';

-- Gifts / Anniversary — Anniversary Photo Collage Frame
--   query: Anniversary Photo Collage Frame gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13975271/pexels-photo-13975271.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two stylish gift boxes with red ribbons on a white indoor background, perfect for celebrations.',
  image_credit     = 'Photo by Boris Hamer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ffcdba64-4094-4ebf-b367-40471d8d024c';

-- Gifts / Baby Shower — Baby Photo Frame Set
--   query: Baby Photo Frame Set Shower gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/19163673/pexels-photo-19163673.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Adorable baby gift box featuring pink clothing, a puzzle book, and storage containers.',
  image_credit     = 'Photo by Adedayo Agboola on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8b824d68-3930-42f8-ad81-ab9a9080b24c';

-- Gifts / Baby Shower — Baby Welcome Gift Set
--   query: Baby Welcome Gift Set Shower box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29474411/pexels-photo-29474411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Adorable baby socks with bows in a Christmas-themed gift box surrounded by festive decor.',
  image_credit     = 'Photo by Namukolo Siyumbwa on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b63f7f74-a95c-489f-a9c6-8601eff98c65';

-- Gifts / Birthday — Birthday Gift Box (Chocolates + Card)
--   query: Birthday Gift Box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/17796/christmas-xmas-gifts-presents.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of vibrant gift boxes with ribbons, perfect for festive occasions.',
  image_credit     = 'Photo by Pixabay on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6d085ab9-8467-4449-977c-5f88e7650574';

-- Gifts / Birthday — Birthday Wish Jar
--   query: Birthday Wish Jar gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7358315/pexels-photo-7358315.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A person holds a gift box wrapped with an orange satin ribbon, showcasing a simple and elegant present.',
  image_credit     = 'Photo by KATRIN  BOLOVTSOVA on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7c378d0b-b6b0-4da2-abd9-dde11d96ae04';

-- Gifts / Birthday — Bluetooth Speaker (Portable)
--   query: Bluetooth Speaker Birthday gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1666070/pexels-photo-1666070.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two gift boxes with red ribbons on a vibrant red background.',
  image_credit     = 'Photo by George Dolgikh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a2c90cce-eba3-43a4-be20-9f7f63a5666b';

-- Gifts / Wedding — Brass Decorative Showpiece
--   query: Brass Decorative Showpiece Wedding gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/3873490/pexels-photo-3873490.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A collection of colorful gift boxes with floral patterns and ribbons, perfect for celebrations.',
  image_credit     = 'Photo by Magda Ehlers on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '09016a24-34ab-4aa6-b3bf-33677d1c6f4a';

-- Gifts / Diwali — Brass Diya Gift Set (Pair)
--   query: Brass Diya Gift Set Diwali box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/33360798/pexels-photo-33360798.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully lit traditional oil diya lamp casting warm glow in a dimly lit setting, symbolizing spirituality and tradition.',
  image_credit     = 'Photo by Manish M on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1abd37e4-ceff-4a93-a2d8-08eb825905ad';

-- Gifts — Coffee Mug (Custom Print)
--   query: Coffee Mug gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7488464/pexels-photo-7488464.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Porcelain cup with black beard and mustache near small cardboard box on bright yellow background',
  image_credit     = 'Photo by Karen Laårk Boshoff on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'fd9324fd-de4c-4885-8e3a-34e936786b18';

-- Gifts / Congratulations — Congratulations Gift Box
--   query: Congratulations Gift Box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7842614/pexels-photo-7842614.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Red-themed image of graduation gifts with a diploma and Class of 2021 card.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7b9d5fc7-4cc2-41ec-b067-f73b397d9ff3';

-- Gifts / Corporate — Corporate Diwali Hamper
--   query: diwali diya lamps indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819781/pexels-photo-8819781.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A cheerful man in traditional attire holds a tray with colorful gifts and flowers, perfect for Diwali.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b655db50-aa1b-4883-9dab-b82726b40ed5';

-- Gifts / Corporate — Corporate Gift Set (Pen + Diary)
--   query: Corporate Gift Set box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7984858/pexels-photo-7984858.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Top view of red gift boxes with black ribbons on a dark background.',
  image_credit     = 'Photo by Tamanna Rumee on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '82201f3c-a267-469b-a7c3-be4b13d130db';

-- Gifts / Valentine — Couple Keychain Set
--   query: Couple Keychain Set Valentine gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6478823/pexels-photo-6478823.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Heartfelt Valentine''s Day setup with gifts, cards, and decorations for love celebration.',
  image_credit     = 'Photo by alleksana on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '90d0bb99-cffb-4106-83ba-07f83cbe72fd';

-- Gifts / Anniversary — Couple Watch Set
--   query: Couple Watch Set Anniversary gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13975260/pexels-photo-13975260.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two beautifully wrapped gift boxes in red and white with satin ribbons on a white background.',
  image_credit     = 'Photo by Boris Hamer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ab5c4b3c-74d1-4d73-a370-ea4a55cb0f90';

-- Gifts / Wedding — Cushion Covers (Set of 5, Wedding Print)
--   query: Cushion Covers Wedding gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12303216/pexels-photo-12303216.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Pastel gift boxes and wedding rings elegantly arranged, perfect for celebrations.',
  image_credit     = 'Photo by Juliano Astc on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'facf0128-3344-4c41-a3d0-01bfc5eca9ce';

-- Gifts / Birthday — Custom Name Necklace
--   query: Custom Name Necklace Birthday gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7985010/pexels-photo-7985010.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Stylishly wrapped red and black gift boxes arranged in a flat lay on a wooden surface.',
  image_credit     = 'Photo by Tamanna Rumee on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7b4e6fb4-2b46-4edb-b882-c86e39108434';

-- Gifts / Corporate — Customised Coffee Table Book
--   query: Customised Coffee Table Book Corporate gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37326538/pexels-photo-37326538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Hands holding a Pergamon London gift box on a wooden table, creating an elegant unboxing theme.',
  image_credit     = 'Photo by Gül Işık on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '28c29abf-46f5-4beb-8aba-6cd8ed154874';

-- Gifts / Housewarming — Decorative Wall Clock
--   query: Decorative Wall Clock Housewarming gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7310135/pexels-photo-7310135.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Box opened to reveal HOME decoration amidst red packing material, labeled Special Delivery.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '7aab5f29-2250-408a-b1ed-d8e5a7c5bbc9';

-- Gifts / Rakhi — Designer Rakhi (Pack of 2)
--   query: rakhi thali indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819776/pexels-photo-8819776.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A man in traditional attire holding Diwali gifts with marigold flowers and festive lights.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3a0d0aee-57a3-4d5a-a97f-2d0e6268489e';

-- Gifts / Diwali — Diwali Puja Thali Gift Set
--   query: diwali diya lamps indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/3135229/pexels-photo-3135229.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant diyas arranged creatively for Diwali, creating a warm, festive ambiance.',
  image_credit     = 'Photo by Rahul Pandit on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '189e1c96-f4c5-461e-b881-ce9a9583dee8';

-- Gifts / Diwali — Diwali Sweets & Chocolate Hamper
--   query: diwali diya lamps indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10182772/pexels-photo-10182772.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Traditional Diwali diyas casting a warm glow, symbolizing the festival of lights and spiritual warmth.',
  image_credit     = 'Photo by Sayantan Das on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '520d37bd-cb31-4f09-bb4a-7b7cf45df538';

-- Gifts / Corporate — Executive Desk Organiser
--   query: Executive Desk Organiser Corporate gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6650013/pexels-photo-6650013.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a woman holding a gift box with ribbon in an office setting, with briefcases in the background.',
  image_credit     = 'Photo by cottonbro studio on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '28789c8d-affc-4e1b-959e-1e9585cfd83a';

-- Gifts / Farewell — Farewell Gift Hamper
--   query: Farewell Gift Hamper box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/20699855/pexels-photo-20699855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Luxurious gift basket with chocolates, sweets, and pralines, perfect for special occasions.',
  image_credit     = 'Photo by Yahya Gopalani on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5a9a0260-9d19-472b-ab8e-066a1cedab40';

-- Gifts / Farewell — Farewell Memory Book
--   query: Farewell Memory Book gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7763913/pexels-photo-7763913.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Red gift box and book "Your Mother''s Story" ideal for Mother''s Day gifting.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9f051108-c840-4356-a2b2-f7077a8aeb54';

-- Gifts / Get Well — Get Well Care Package
--   query: Get Well Care Package gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/19437857/pexels-photo-19437857.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautifully arranged skincare gift sets with elegant ribbon packaging, perfect for a special occasion.',
  image_credit     = 'Photo by Ruslan Alekso on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '691da766-4895-4802-80c4-16f62204c2f0';

-- Gifts / Get Well — Get Well Soon Balloon Bouquet
--   query: Get Well Soon Balloon Bouquet gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8104195/pexels-photo-8104195.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Children celebrating indoors with gifts, balloons, and party hats for a joyful birthday gathering.',
  image_credit     = 'Photo by Ivan S on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e03c182c-9f65-4d48-9e38-84d12e5b6433';

-- Gifts / Get Well — Get Well Soon Flower & Card Combo
--   query: Get Well Soon Flower & Card Combo gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7763917/pexels-photo-7763917.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautiful Mother''s Day card with floral design next to a pink gift box, perfect for gifting.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8d489b7d-1b61-4d4b-bbcf-05d093e7ba26';

-- Gifts — Greeting Card (Handmade)
--   query: Greeting Card gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/726228/pexels-photo-726228.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A joyful scene with a ''Merry Christmas'' card and a glittery gift box on red fabric.',
  image_credit     = 'Photo by freestocks.org on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '20f48fd7-1f1e-41f7-9a0f-23214c08e901';

-- Gifts / Housewarming — Housewarming Plant Gift Set
--   query: Housewarming Plant Gift Set box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36813411/pexels-photo-36813411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A joyful couple moving into their new home, carrying boxes and plants.',
  image_credit     = 'Photo by Vitaly Gariev on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd3845ee7-04d7-456a-a40a-a9be0ee46672';

-- Gifts / Independence Day — Independence Day Greeting Card
--   query: Independence Day Greeting Card gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/31884818/pexels-photo-31884818.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Brown gift box with a red rose and envelope on a vibrant red background, perfect for romantic celebrations',
  image_credit     = 'Photo by Olga Lazurenko on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '97c29900-a71d-4c13-859b-71435d0b0c4b';

-- Gifts / Rakhi — Kids Rakhi (Cartoon Character)
--   query: rakhi thali indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819451/pexels-photo-8819451.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant scene of people in traditional Indian attire exchanging gifts during a festive celebration, like Diwali.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f32e21e5-dabc-48e4-9764-930497fcb25b';

-- Gifts / Housewarming — Kitchen Essentials Gift Hamper
--   query: Kitchen Essentials Gift Hamper Housewarming box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5486778/pexels-photo-5486778.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A woman wrapping presents in a cozy kitchen with ribbon and paper around.',
  image_credit     = 'Photo by AI25.Studio  Studio on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '84a49ff3-7ade-468d-ba09-a871c2fd5cc2';

-- Gifts — Leather Wallet
--   query: Leather Wallet gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/15623361/pexels-photo-15623361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of Louis Vuitton wallets in signature packaging on a wooden shelf, showcasing elegant fashion design.',
  image_credit     = 'Photo by Xuân Thống Trần on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bae80707-9bc2-438c-b6b9-5770058e60d6';

-- Gifts / Baby Shower — New Mom Care Hamper
--   query: New Mom Care Hamper Baby Shower gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7802443/pexels-photo-7802443.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Smiling pregnant woman holding gifts at a cozy indoors baby shower.',
  image_credit     = 'Photo by Kampus Production on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6e8ac6c3-5192-4a82-909e-ae2656f8220d';

-- Gifts / Independence Day — Patriotic Photo Frame
--   query: Patriotic Photo Frame Independence Day gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8026745/pexels-photo-8026745.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Patriotic framed sign with ''Home of the Brave'' text and festive bows, perfect for home decor.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'deb46dd4-c209-45f2-9040-975be7367f04';

-- Gifts / Anniversary — Personalised Anniversary Album
--   query: Personalised Anniversary Album gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13977737/pexels-photo-13977737.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of beautifully wrapped gift boxes with a red rose, perfect for romantic occasions.',
  image_credit     = 'Photo by Boris Hamer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a2b1a420-71b3-41a6-b905-477407be2630';

-- Gifts / Baby Shower — Personalised Baby Blanket
--   query: Personalised Baby Blanket Shower gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13529390/pexels-photo-13529390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a beautifully wrapped gift with a yellow bow on a decorated table setting.',
  image_credit     = 'Photo by Ditta Alfianto on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '957386d3-3ac4-4d8f-90b8-6db4c578f6e5';

-- Gifts / Birthday — Personalised Birthday Mug
--   query: Personalised Birthday Mug gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11112057/pexels-photo-11112057.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up shot of a sophisticated gift box wrapped with a striking red ribbon bow, perfect for holiday gifting.',
  image_credit     = 'Photo by Daka on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8cc7f398-225f-4599-8a63-1fbc35856427';

-- Gifts / Wedding — Personalised Couple Photo Frame
--   query: edible photo print cake gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7561094/pexels-photo-7561094.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A person holding a stack of vibrant, wrapped gifts indoors, ready for a celebration.',
  image_credit     = 'Photo by Vlada Karpovich on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '0087ea17-0187-4e54-9a1a-2577a0cf0681';

-- Gifts / Valentine — Personalised Love Photo Frame
--   query: Personalised Love Photo Frame Valentine gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13983751/pexels-photo-13983751.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A white gift box with a red ribbon and a vibrant red rose, ideal for Valentine''s Day or special romantic occasions.',
  image_credit     = 'Photo by Boris Hamer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8d852688-1f53-46ad-9688-d1a7e752877d';

-- Gifts — Personalised Photo Frame
--   query: Personalised Photo Frame gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5872362/pexels-photo-5872362.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two black gift boxes with white ribbons on a beige background, perfect for celebrations.',
  image_credit     = 'Photo by Max Fischer on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '082d8d4f-6171-48f3-994b-2013f6a8adee';

-- Gifts / Birthday — Polaroid Photo Album
--   query: Polaroid Photo Album Birthday gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9853466/pexels-photo-9853466.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Hands arranging items in a cardboard box with a photo and scissors nearby.',
  image_credit     = 'Photo by Ron Lach on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '401a4925-b217-4470-af87-fb774646211c';

-- Gifts / Corporate — Premium Pen Gift Box
--   query: Premium Pen Gift Box Corporate present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7442198/pexels-photo-7442198.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'High angle of pile of modern pen drives against wooden box for gift on rough surface',
  image_credit     = 'Photo by Jonathan Borba on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd191b0f8-38df-49bd-8c59-1e302e5a72c5';

-- Gifts / Rakhi — Rakhi Gift Hamper for Brother
--   query: rakhi thali indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7685636/pexels-photo-7685636.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A colorful and ornate Indian puja thali set for Diwali rituals, depicting cultural tradition.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a31e36fc-f561-4460-8568-c693b7403522';

-- Gifts / Rakhi — Rakhi Thali Set (Pooja + Rakhi)
--   query: rakhi thali indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819111/pexels-photo-8819111.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A man in traditional attire holds gift boxes during a festive celebration indoors.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8f1525a2-c195-48cf-bfa7-ef1cb892db9c';

-- Gifts / Rakhi — Rakhi with Chocolate Box
--   query: rakhi thali indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819119/pexels-photo-8819119.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'An Indian woman in traditional attire holding a Diwali gift indoors, symbolizing culture and celebration.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c2d60842-e62d-4de1-9fd4-a46c450c0f6c';

-- Gifts / Valentine — Rose & Chocolate Combo
--   query: Rose & Chocolate Combo Valentine gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5404619/pexels-photo-5404619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Elegant bouquet of red roses with a gift box, perfect for special occasions.',
  image_credit     = 'Photo by Marcelo Joaquim on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '53dc158c-7dd4-43f3-8c8f-8157fcfa30c9';

-- Gifts / Anniversary — Rose Gold Jewellery Box
--   query: Rose Gold Jewellery Box Anniversary gift present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5194845/pexels-photo-5194845.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A pair of elegant wedding rings in a red velvet box surrounded by red rose petals, symbolizing romance and love.',
  image_credit     = 'Photo by HONG SON on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '47a7211e-e7a5-4c23-affe-c93bc3c4beae';

-- Gifts / Diwali — Scented Candle Diwali Gift Pack
--   query: diwali diya lamps indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8887279/pexels-photo-8887279.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Traditional oil lamps glow warmly on vibrant red and gold fabrics, creating a festive ambiance.',
  image_credit     = 'Photo by Lara Jameson on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '29f8b681-47c0-46a0-be17-508cc7ed01db';

-- Gifts — Scented Candle Set
--   query: Scented Candle Set gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10772319/pexels-photo-10772319.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Scented candles inspired by Canadian National Parks surrounded by lush leaves.',
  image_credit     = 'Photo by Ali Kazal on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '84dc96ad-5d80-4fb2-9ce7-caf39b639bd7';

-- Gifts / Wedding — Silver Coin (Wedding Blessing, 10g)
--   query: Silver Coin Wedding gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5737286/pexels-photo-5737286.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of gold wedding rings reflecting next to a blue gift box.',
  image_credit     = 'Photo by The Glorious  Studio on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5f857430-88a5-4907-9d95-61dab4b8b899';

-- Gifts / Wedding — Silver Plated Dinner Set
--   query: Silver Plated Dinner Set Wedding gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5469689/pexels-photo-5469689.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A delicate necklace in a gift box, perfect for holiday celebrations.',
  image_credit     = 'Photo by https://kaboompics.com/ on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '0f7d8b54-faea-4cf5-8a89-bad80716b08e';

-- Gifts / Rakhi — Silver Rakhi (Oxidised)
--   query: rakhi thali indian festival gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7686249/pexels-photo-7686249.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Intricate Indian tray featuring rakhi, spices, and decorative elements, symbolizing festive culture.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9c7f8cec-daa0-4f86-b283-e39f5812ea65';

-- Gifts / Congratulations — Success Trophy (Personalised)
--   query: Success Trophy Congratulations gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7842563/pexels-photo-7842563.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A high school graduation card and gift box with a red background, symbolizing celebration and achievement.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '4666c756-7c5f-45b1-97b5-747f7e75bdb8';

-- Gifts / Farewell — Travel Organiser Kit (Farewell Gift)
--   query: Travel Organiser Kit Farewell gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1780432/pexels-photo-1780432.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Woman holding a black gift box in a red top, showcasing elegance and surprise.',
  image_credit     = 'Photo by Ray Piedra on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b342e583-98fa-46d4-9ffb-899beedb6fe2';

-- Gifts / Independence Day — Tricolor Coffee Mug (Custom Print)
--   query: Tricolor Coffee Mug Independence Day gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7764039/pexels-photo-7764039.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful floral gift boxes and a ''Crazy Cat Mom'' mug set against a vibrant blue background, perfect for Mother''s Day.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1754c9d2-a3e6-4944-bc1d-0967aa9ad4a9';

-- Gifts / Valentine — Valentine Chocolate Gift Box
--   query: Valentine Chocolate Gift Box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11716935/pexels-photo-11716935.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant heart-shaped chocolates in a heart box on a pink background. Perfect for Valentine''s Day.',
  image_credit     = 'Photo by Towfiqu barbhuiya on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd6198a6f-ff20-4d9c-9c33-4bc71c809c8d';

-- Gifts / Valentine — Valentine Teddy Bear (Large)
--   query: Valentine Teddy Bear gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7984850/pexels-photo-7984850.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Overhead view of a pink gift box tied with ribbon on a vibrant red background.',
  image_credit     = 'Photo by Tamanna Rumee on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c4a13b7c-a410-45d8-bb29-5205c05bb142';

-- Gifts / Wedding — Wedding Gift Hamper (Dry Fruits + Sweets)
--   query: Wedding Gift Hamper box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/20699854/pexels-photo-20699854.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully arranged gift basket with chocolates and sweets, perfect for special occasions.',
  image_credit     = 'Photo by Yahya Gopalani on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '955fb961-215b-406f-b36c-19cd4a3364d9';

-- Gifts / Housewarming — Welcome Home Doormat & Diya Set
--   query: Welcome Home Doormat & Diya Set Housewarming gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8293695/pexels-photo-8293695.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A small wooden house model sits on a welcome mat among moving boxes, symbolizing a new home.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9d117b31-7b99-4519-874f-2b781248aafc';

-- Gifts / Anniversary — Wine Glass Set (Engraved, Pair)
--   query: Wine Glass Set Anniversary gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6699441/pexels-photo-6699441.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A romantic table setting with red roses, gift box, and red wine glasses, perfect for Valentine''s Day celebration.',
  image_credit     = 'Photo by Gustavo Fring on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2a7331ca-22b7-4896-85ee-97223cacaf35';

-- Gifts — Wireless Earbuds
--   query: Wireless Earbuds gift box present
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/1303087/pexels-photo-1303087.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A festive flat lay of various Christmas presents adorned with colorful ribbons on a wooden background.',
  image_credit     = 'Photo by George Dolgikh on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd17258d4-c393-4556-84af-9189ebe492cb';

-- Hampers / Anniversary — Anniversary Wine & Chocolate Hamper
--   query: Anniversary Wine & Chocolate Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5714455/pexels-photo-5714455.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Beautiful gift basket featuring flowers, teddy bear, and chocolates for a special occasion.',
  image_credit     = 'Photo by Marcelo Joaquim on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6cb431d9-af6d-4dfe-889c-7d6fdeda978a';

-- Hampers / Baby Shower — Baby Shower Gift Hamper
--   query: Baby Shower Gift Hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/29234756/pexels-photo-29234756.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Soft baby blanket with pastel pattern in a wicker basket. Ideal for nursery decor.',
  image_credit     = 'Photo by Melike  B on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bd1f6e67-db68-4fa7-a7a4-02d1f8b202f9';

-- Hampers — Baby Welcome Hamper
--   query: Baby Welcome Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38417159/pexels-photo-38417159.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Cute newborn baby sleeping in mint swaddle with teddy bear and flowers. Ideal for nursery decor.',
  image_credit     = 'Photo by Krishna Kids  Photography on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '19bee103-33af-4363-881f-bfbf4f21cea5';

-- Hampers / Chocolate — Belgian Chocolate Gift Box
--   query: Belgian Chocolate Gift Box hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/36688634/pexels-photo-36688634.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Decorative display of assorted Belgian chocolate eggs in a confectionary shop.',
  image_credit     = 'Photo by Jean-Paul Colemonts on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '25d69594-4066-4c07-8171-0887e8190ff1';

-- Hampers / Birthday — Birthday Spa & Relax Hamper
--   query: Birthday Spa & Relax Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/17555293/pexels-photo-17555293.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Elegant spa gift box featuring handmade ceramic cup, velvet mask, and scrunchie for relaxation and luxury.',
  image_credit     = 'Photo by Rahib Yaqubov on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '43f47e36-3129-43e7-b5cd-722178443628';

-- Hampers / Wedding — Bridal Shower Hamper
--   query: Bridal Shower Hamper Wedding gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/2449445/pexels-photo-2449445.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Flat lay of bridal shower decorations with creative signs and props.',
  image_credit     = 'Photo by Craig Adderley on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cce48eb0-f747-43b1-a1d3-028ed89cdc02';

-- Hampers — Celebration Hamper
--   query: Celebration Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/37606032/pexels-photo-37606032.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Charming wedding favors wrapped in burlap and pink ribbons, arranged in a rustic basket setting.',
  image_credit     = 'Photo by Luriko Yamaguchi on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3ba713a4-0034-427f-8ffc-c63ba394cc19';

-- Hampers / Corporate — Client Gifting Hamper (Premium)
--   query: Client Gifting Hamper Corporate gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/11770411/pexels-photo-11770411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Top view of elegantly wrapped gift boxes with ribbons on wooden floor, perfect for holiday imagery.',
  image_credit     = 'Photo by Max Bonda on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1b889215-a23c-41e3-abf1-c0cdc1edac06';

-- Hampers / Corporate — Corporate Appreciation Hamper
--   query: Corporate Appreciation Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10720839/pexels-photo-10720839.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully wrapped gift basket with a red ribbon and ''just for you'' tag, perfect for celebrations.',
  image_credit     = 'Photo by HAYA JAUNI on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9922dd68-7d6f-41f0-83df-8c08e27e8492';

-- Hampers — Corporate Gift Hamper
--   query: Corporate Gift Hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/14365405/pexels-photo-14365405.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a wicker basket filled with decorative gifts wrapped in fabric bows.',
  image_credit     = 'Photo by Masood Aslami on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'fe122028-eb4a-4a18-b0f1-7518b32da921';

-- Hampers / Corporate — Corporate New Year Hamper (Bulk)
--   query: Corporate New Year Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35753498/pexels-photo-35753498.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Traditional Vietnamese gift basket for Tet with decorated items, perfect for celebrations.',
  image_credit     = 'Photo by Thái Trường Giang on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'eeeb90ef-c0ee-421f-8d11-1357e8a44626';

-- Hampers / Corporate — Corporate Welcome Kit Hamper
--   query: Corporate Welcome Kit Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32117285/pexels-photo-32117285.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautiful gift basket with cards and chamomile flowers on a sunny windowsill.',
  image_credit     = 'Photo by Ánh Đặng on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ab4980ed-0e6d-4ed4-b04d-9e8b45b5f5db';

-- Hampers — Couple Hamper
--   query: Couple Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38382431/pexels-photo-38382431.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Happy couple enjoying a playful moment surrounded by handcrafted baskets in a market setting.',
  image_credit     = 'Photo by Hiếu Lê on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2703302a-6106-4903-8e38-f8c41696da0e';

-- Hampers / Chocolate — Dark Chocolate Lover's Hamper
--   query: Dark Chocolate Lover's Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12430678/pexels-photo-12430678.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Indulgent assortment of chocolate bars and wafers in a rustic bucket. Perfect for dessert inspiration.',
  image_credit     = 'Photo by Sylwester Ficek on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '9bfcf9c6-c630-4ac8-a5c0-7cb78cc0ac44';

-- Hampers / Dry Fruits — Dates & Dry Fruit Hamper
--   query: Dates & Dry Fruit Hamper Fruits gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5425018/pexels-photo-5425018.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A white plate filled with a variety of dried fruits including dates, figs, and apricots, isolated on a white background.',
  image_credit     = 'Photo by Engin Akyurt on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ef54a309-6851-4716-b4a9-485e101847ae';

-- Hampers / Diwali — Diwali Dry Fruit Hamper (Premium)
--   query: diwali diya lamps indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/34481848/pexels-photo-34481848.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful diya lamps with lit flames and offerings on a water surface create a serene festive scene.',
  image_credit     = 'Photo by AJAY KUMAR on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b6982dac-3fdb-4362-9ef1-5a3711416a2b';

-- Hampers / Diwali — Diwali Puja & Sweets Combo Hamper
--   query: diwali diya lamps indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38337412/pexels-photo-38337412.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautifully lit diya candle on leaves, symbolizing Diwali celebration in India.',
  image_credit     = 'Photo by Mehul on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '054e13c5-1e4c-4cae-8065-ed46e3491a30';

-- Hampers / Diwali — Diwali Sweets Hamper
--   query: diwali diya lamps indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6213685/pexels-photo-6213685.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Illuminated brass diyas surrounded by vibrant flowers on a wooden surface, perfect for Diwali celebrations.',
  image_credit     = 'Photo by Naveen Sahu on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bb986f73-fd24-4c93-935f-8d34e0ba0107';

-- Hampers / Diwali — Diwali Tea & Snacks Hamper
--   query: diwali diya lamps indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8819219/pexels-photo-8819219.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A young girl in traditional attire holds decorative Diwali lamps, spreading light and celebration.',
  image_credit     = 'Photo by Yan Krukau on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2751c484-05ae-4ff4-b387-33139518ed42';

-- Hampers / Dry Fruits — Exotic Nuts Gift Box
--   query: Exotic Nuts Gift Box Dry Fruits hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/13670951/pexels-photo-13670951.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Delicious breakfast setup with nut delight cereal, milk, and fruit parfait.',
  image_credit     = 'Photo by Pixel Senses on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '1b5ac91c-e525-4184-97d0-757fa7500d58';

-- Hampers / Chocolate — Ferrero Rocher Gift Hamper
--   query: Ferrero Rocher Gift Hamper Chocolate basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/754191/pexels-photo-754191.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A Grand Ferrero Rocher chocolate illuminated by warm LED string lights, perfect for Christmas decor.',
  image_credit     = 'Photo by Dzenina Lukac on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f91afa56-d57f-4c2b-888a-33e2025dacab';

-- Hampers / Get Well — Get Well Soon Wellness Hamper
--   query: Get Well Soon Wellness Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8468661/pexels-photo-8468661.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A spa set featuring scented candles, bath salts, and a towel for a luxurious relaxation experience.',
  image_credit     = 'Photo by Ahloki on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cc63df36-41a9-4b4f-8d73-c2f0187dee10';

-- Hampers / Housewarming — Griha Pravesh Gift Hamper
--   query: Griha Pravesh Gift Hamper Housewarming basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9695851/pexels-photo-9695851.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A close-up view of handcrafted wicker baskets showcasing intricate weaving patterns.',
  image_credit     = 'Photo by Sergey  Meshkov on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'bb3dda94-83f2-489f-9adf-dfb2dd6485ae';

-- Hampers / Wedding — Groom's Special Grooming Hamper
--   query: Groom's Special Grooming Hamper Wedding gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/27060266/pexels-photo-27060266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Luxury red silk necktie, handkerchief, and cufflink set displayed in a gift box for formal occasions.',
  image_credit     = 'Photo by BANU FILM  ADS on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '2e1d60f5-6e96-47af-ab30-8af2974fc3c4';

-- Hampers / Chocolate — Homestyle Chocolate Barfi Hamper
--   query: Homestyle Chocolate Barfi Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/5864767/pexels-photo-5864767.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A variety of Indian desserts including milk cake, coconut barfi, and ladoo displayed in a café.',
  image_credit     = 'Photo by Rachel Claire on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c62cf4fd-e979-436c-812c-949f1c16d313';

-- Hampers / Housewarming — Housewarming Sweets & Décor Hamper
--   query: Housewarming Sweets & Décor Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8798941/pexels-photo-8798941.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a family holding a ''Home Sweet Home'' sign, symbolizing warmth and togetherness.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '8a0c5756-b025-434e-a8e4-920ea7b48c33';

-- Hampers / Get Well — Immunity Boost Hamper
--   query: Immunity Boost Hamper Get Well gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/28927704/pexels-photo-28927704.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A collection of natural and medicinal cold remedies including tablets, a thermometer, and herbal drinks.',
  image_credit     = 'Photo by Gundula Vogel on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'a2a738e9-f986-4ac5-aad7-2d47df0e2576';

-- Hampers / Birthday — Kids Birthday Surprise Hamper
--   query: Kids Birthday Surprise Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7423735/pexels-photo-7423735.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A young girl in a pink jacket enjoys her birthday celebration with gifts and colorful balloons indoors.',
  image_credit     = 'Photo by Kampus Production on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'eec328df-ed34-4ca3-9789-c82a68d0c708';

-- Hampers / Birthday — Milestone Birthday Deluxe Hamper
--   query: Milestone Birthday Deluxe Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7911048/pexels-photo-7911048.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Golden 30 balloon with a wrapped gift box for a 30th celebration or birthday.',
  image_credit     = 'Photo by Ivan S on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'cb1846ae-caa4-45c7-9a3f-247689025ec3';

-- Hampers / Dry Fruits — Mixed Dry Fruit Gift Tray
--   query: Mixed Dry Fruit Gift Tray Fruits hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/3872425/pexels-photo-3872425.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant mix of dried fruits and nuts on a wooden tray, perfect for healthy snacking.',
  image_credit     = 'Photo by Polina Tankilevitch on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '47d3a00f-cee8-4d75-9b61-bb57c5a1ab00';

-- Hampers / Independence Day — National Pride Gift Hamper
--   query: National Pride Gift Hamper Independence Day basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7997862/pexels-photo-7997862.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Ceramic mug with American flag design and blue ribbon, showcasing patriotic pride with ''Proud to be an American'' sign.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '26ee05d4-5a8f-4f3b-90bc-816b5695914c';

-- Hampers / Baby Shower — New Mom Pampering Hamper
--   query: New Mom Pampering Hamper Baby Shower gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9215216/pexels-photo-9215216.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Cheerful mother-to-be holding a gift bag at a baby shower with pink decor.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e91c4192-ac21-4c7b-ac67-c5d43019c646';

-- Hampers / New Year — New Year Celebration Hamper
--   query: New Year Celebration Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/6640111/pexels-photo-6640111.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant display of a traditional Tet gift basket with food and ornaments, perfect for cultural celebrations.',
  image_credit     = 'Photo by Van Trang Ho on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '311ac345-4607-4e8e-9c9b-218dcd698b36';

-- Hampers / New Year — New Year Chocolate Hamper
--   query: New Year Chocolate Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/10442826/pexels-photo-10442826.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Colorful Christmas cookies in a basket, perfect for holiday celebrations and festive decorations.',
  image_credit     = 'Photo by Nikolett Emmert on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c7db6bf7-2fba-40fc-b2c7-c816cfbdedba';

-- Hampers / New Year — New Year Party Hamper (Snacks + Mixers)
--   query: New Year Party Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/834896/pexels-photo-834896.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of champagne bottle and glasses in ice bucket, perfect for holiday festivities.',
  image_credit     = 'Photo by JESHOOTS.com on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '658157a4-dea6-4d59-a695-532ffcec5cae';

-- Hampers / New Year — New Year Wellness Hamper
--   query: New Year Wellness Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/33958390/pexels-photo-33958390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A woman in red picking decorations at an Asian market for a festival.',
  image_credit     = 'Photo by 🇻🇳🇻🇳Nguyễn Tiến Thịnh 🇻🇳🇻🇳 on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '5661d32c-7f30-4baa-8854-83f1ca6ffcff';

-- Hampers / Independence Day — Patriotic Celebration Hamper
--   query: Patriotic Celebration Hamper Independence Day gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/8026754/pexels-photo-8026754.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Stylized bicycle decoration with American flag, perfect for Fourth of July celebrations.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '6fb92d55-37ca-4e2e-8a27-966ace22179d';

-- Hampers / Dry Fruits — Premium Dry Fruit Box (1kg)
--   query: Premium Dry Fruit Box Fruits gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7407264/pexels-photo-7407264.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A delightful assortment of chocolate dipped dried fruits in a decorative gift box.',
  image_credit     = 'Photo by Тимур Слугин on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'f64d2691-558d-4169-b011-7846a3e88ab6';

-- Hampers / Rakhi — Rakhi Combo Hamper (Kids)
--   query: rakhi thali indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7685644/pexels-photo-7685644.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A vibrant puja thali with traditional Indian items for festivals and rituals.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e6e1b99d-f49e-48a0-9562-546ee79bde05';

-- Hampers / Rakhi — Rakhi Gift Hamper for Sister
--   query: rakhi thali indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7686352/pexels-photo-7686352.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'An intricately decorated Puja Thali used in traditional Indian religious rituals, featuring cultural elements.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'b4194fd3-ce87-4083-9b2b-39d4618a8269';

-- Hampers / Rakhi — Rakhi Special Dry Fruit Hamper
--   query: rakhi thali indian festival gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/38036019/pexels-photo-38036019.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a brother and sister participating in Raksha Bandhan, a traditional Indian festival.',
  image_credit     = 'Photo by Soham Kundu on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ccb2942f-9001-447e-885f-e5a997e2f8fb';

-- Hampers / Dry Fruits — Saffron & Dry Fruit Combo
--   query: Saffron & Dry Fruit Combo Fruits gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35268684/pexels-photo-35268684.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of sun-dried fruits placed on wooden trays, showcasing natural preservation techniques.',
  image_credit     = 'Photo by Peter Xie on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e6c18837-2faa-4127-a850-d6de658e3f18';

-- Hampers / Anniversary — Silver Jubilee Gift Hamper
--   query: silver anniversary cake gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/32081637/pexels-photo-32081637.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of a 25th wedding anniversary cake topper with golden decoration and flowers.',
  image_credit     = 'Photo by SAMPARK FILMS SAMPARKFILMS.COM on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '52ec445c-6ee4-4b0f-bf23-56696b2bf8ef';

-- Hampers / Independence Day — Tiranga Sweets Box
--   query: Tiranga Sweets Box Independence Day gift hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/19151506/pexels-photo-19151506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Close-up of Indian laddoo sweets elegantly arranged in a box, perfect for festive treats.',
  image_credit     = 'Photo by Sharath G. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '76d29bf6-827e-4186-b094-dfde94ab7998';

-- Hampers / Wedding — Wedding Anniversary Hamper
--   query: Wedding Anniversary Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/503717/pexels-photo-503717.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A delicate white basket with a crystal ball, rings, and flowers amidst vibrant grass.',
  image_credit     = 'Photo by Jeffrey Paa Kwesi Opare on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'c1c04c85-1e11-4fed-acab-5b591bfd0235';

-- Hampers / Wedding — Wedding Congratulations Hamper
--   query: Wedding Congratulations Hamper gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/22081385/pexels-photo-22081385.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A beautiful white rose bouquet beside a decorative gift box, perfect for celebrations.',
  image_credit     = 'Photo by Ferat Söylemez on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'de2cbd73-1875-42ba-84c5-4df90646c7d9';

-- Hampers / Wedding — Wedding Guest Return Gift Hamper (Set of 10)
--   query: Wedding Guest Return Gift Hamper basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/35697091/pexels-photo-35697091.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'A row of elegant brown gift bags adorned with pink flowers and thank you notes, perfect for events.',
  image_credit     = 'Photo by 光术 山影 on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'fbd5944c-a989-416c-ada2-0a8844fa1ce8';

-- Hampers / Baby Shower — Welcome Baby Hamper (Deluxe)
--   query: Welcome Baby Hamper Shower gift basket
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/9215406/pexels-photo-9215406.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Two colorful gift bags for a baby shower with ''Oh Boy'' text in blue and pink tones.',
  image_credit     = 'Photo by RDNE Stock project on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = '3cba7371-8096-4cf7-a19f-0787dd2f1be7';

-- Party Essentials / Anniversary — Anniversary Balloon Bouquet
--   query: Anniversary Balloon Bouquet party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/4629854/pexels-photo-4629854.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant collection of star-shaped balloons perfect for festive decor and celebrations.',
  image_credit     = 'Photo by Nadezhda Moryak on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'e46ae925-503a-4ede-b204-8fef7458dbd1';

-- Party Essentials / Anniversary — Anniversary Photo Backdrop Banner
--   query: Anniversary Photo Backdrop Banner party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/7336918/pexels-photo-7336918.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Stylish birthday party decor with silver balloons and black-gold banner.',
  image_credit     = 'Photo by Polina Tankilevitch on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'd93bd42c-9e22-4952-b750-c6e2e5b02828';

-- Party Essentials / Anniversary — Anniversary Table Décor Set
--   query: Anniversary Table Décor Set party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/30142374/pexels-photo-30142374.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Chic 40th birthday party setting with champagne flutes, balloons, and gold glitter backdrop.',
  image_credit     = 'Photo by Matej Bizjak on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ab4f1033-7f80-46fb-93ef-c9443f0f9e7c';

-- Party Essentials / Theme Party — Avengers Theme Balloon Bouquet
--   query: Avengers Theme Balloon Bouquet Party decoration celebration
UPDATE products SET
  image_url        = 'https://images.pexels.com/photos/12689078/pexels-photo-12689078.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  image_alt        = 'Vibrant Spiderman themed party setup with decorations and snacks, ideal for children''s celebrations.',
  image_credit     = 'Photo by Vidal Balielo Jr. on Pexels',
  image_source     = 'stock',
  image_updated_at = now()
WHERE id = 'ac87b441-7548-4eab-b4e1-fb029623ff7d';

COMMIT;
