export type PhotoCredit = {
  file: string;
  usedFor: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  changes: string;
};

/** Sources for the photographs in public/products and the homepage hero. */
export const photoCredits: PhotoCredit[] = [
  {
    file: '/products/atta.webp',
    usedFor: 'Chakki Fresh Atta, 5 kg',
    author: 'Nga Ahorangi',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceTitle: 'Atta flour',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Atta_flour.jpg',
    changes:
      'Cropped to the bowl of atta and saved as an 800×800 WebP. A sliver of packaging at the edge of the source frame is not included. The picture shows the flour, not a branded pack.',
  },
  {
    file: '/products/rice.webp',
    usedFor: 'Premium Basmati Rice, 5 kg',
    author: 'cookbookman17',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceTitle: 'Basmati Rice India, raw',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Basmati_Rice_India,_raw.jpg',
    changes: 'Cropped to the raw long-grain basmati and saved as an 800×800 WebP.',
  },
  {
    file: '/products/biscuit.webp',
    usedFor: 'Glucose Biscuit, 1 pack',
    author: 'Frederick Noronha',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceTitle: 'Biscuits on a plate, Goa India',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Biscuits_on_a_plate,_Goa_India.JPG',
    changes:
      'Cropped to the plain rectangular biscuits and saved as an 800×800 WebP. The other biscuits on the plate are not shown. The picture is of the biscuits themselves, not a branded packet.',
  },
  {
    file: '/products/chana.webp',
    usedFor: 'Premium Kabuli Chana, 1 kg',
    author: 'Ranjithkumar Murugesan',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceTitle: 'WHITE KABULI CHANA',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:WHITE_KABULI_CHANA.jpg',
    changes: 'Centre-cropped and saved as an 800×800 WebP.',
  },
  {
    file: '/products/millet.webp',
    usedFor: 'Organic Pearl Millet (bajra), 1 kg',
    author: 'Sengai Podhuvan',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    sourceTitle: 'Food grain pearl millet 1',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Food_grain_pearl_millet_1.jpg',
    changes: 'Centre-cropped and saved as an 800×800 WebP. The grains are pearl millet (bajra).',
  },
  {
    file: '/products/moong.webp',
    usedFor: 'Whole Green Moong, 1 kg',
    author: 'Sanjay Acharya',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceTitle: 'Green Mung Beans',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Green_Mung_Beans.jpg',
    changes: 'Centre-cropped and saved as an 800×800 WebP. The beans are whole green moong.',
  },
  {
    file: '/products/oil.webp',
    usedFor: 'Cold Pressed Mustard Oil, 1 litre',
    author: 'Biswarup Ganguly',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceTitle: 'Mustard oil and seeds, Kolkata',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Mustard_Oil_%26_Seeds_-_Kolkata_2003-10-31_00537.JPG',
    changes:
      'Cropped to the jar of mustard oil and the mustard seeds, then saved as an 800×800 WebP.',
  },
  {
    file: '/products/sugar.webp',
    usedFor: 'Natural Sulphur-free Sugar, 1 kg',
    author: 'Douglas P Perkins',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceTitle: 'Bowl of white sugar',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bowl_of_white_sugar_without_background.jpg',
    changes: 'Centre-cropped and saved as an 800×800 WebP. The picture is white granulated sugar.',
  },
  {
    file: '/products/dal.webp',
    usedFor: 'Unpolished Toor Dal, 1 kg',
    author: 'Miansari66',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    sourceTitle: 'Tur Dal',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tur_Dal.JPG',
    changes:
      'Cropped to the bowl of tur dal (toor dal, split pigeon peas) and saved as an 800×800 WebP.',
  },
  {
    file: '/harvest.webp',
    usedFor: 'Homepage hero',
    author: 'PilotChicago',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceTitle: 'Common Indian spices',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Common_Indian_spices.jpg',
    changes: 'Resized and saved as WebP. The photograph shows turmeric, mustard, chilli and cumin.',
  },
];
