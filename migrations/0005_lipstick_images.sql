-- Point lipstick SKUs at lip / makeup photography instead of the nail still used for tools.

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1586495777744-4413f21062fa'
WHERE id IN (
  'mac-ruby-woo', 'mac-russian-red', 'mac-chili', 'nars-dragon-girl',
  'charlotte-red-carpet', 'fenty-stunna-uncensored', 'dior-rouge-999',
  'maybelline-superstay-pioneer', 'pat-mcgrath-elson-red', 'ilia-balmy-red'
);

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348'
WHERE id IN (
  'nars-jungle-red', 'ysl-le-rouge', 'rare-beauty-kind-worthy',
  'revlon-fire-ice', 'pat-mcgrath-elson'
);
