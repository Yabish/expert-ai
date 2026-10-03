// Name and catalogue vocabularies. Arabic script, transliterated Arabic
// and English names are mixed, as in GCC customer data.

export const arabicFirstNames = [
  'محمد',
  'أحمد',
  'عبدالله',
  'خالد',
  'فهد',
  'سلطان',
  'عمر',
  'يوسف',
  'فيصل',
  'ناصر',
  'نورة',
  'سارة',
  'فاطمة',
  'ريم',
  'هند',
  'لطيفة',
  'منى',
  'العنود',
  'جواهر',
  'ليان',
] as const;

export const arabicFamilyNames = [
  'الحربي',
  'العتيبي',
  'القحطاني',
  'الشمري',
  'الدوسري',
  'الغامدي',
  'الزهراني',
  'المطيري',
  'السبيعي',
  'الشهري',
  'العنزي',
  'الرشيدي',
] as const;

export const transliteratedFirstNames = [
  'Mohammed',
  'Ahmed',
  'Abdullah',
  'Khalid',
  'Fahad',
  'Omar',
  'Yousef',
  'Noura',
  'Sarah',
  'Fatimah',
  'Reem',
  'Hind',
] as const;

export const transliteratedFamilyNames = [
  'Al-Harbi',
  'Al-Otaibi',
  'Al-Qahtani',
  'Al-Shammari',
  'Al-Dosari',
  'Al-Ghamdi',
  'Al-Zahrani',
  'Al-Mutairi',
] as const;

export const englishFirstNames = [
  'James',
  'Sarah',
  'Michael',
  'Emily',
  'Daniel',
  'Priya',
  'Arjun',
  'Maria',
  'John',
  'Anna',
] as const;

export const englishFamilyNames = [
  'Smith',
  'Johnson',
  'Brown',
  'Khan',
  'Patel',
  'Garcia',
  'Wilson',
  'Taylor',
  'Fernandes',
] as const;

export const cities = [
  { en: 'Riyadh', ar: 'الرياض', weight: 5 },
  { en: 'Jeddah', ar: 'جدة', weight: 4 },
  { en: 'Dammam', ar: 'الدمام', weight: 2 },
  { en: 'Makkah', ar: 'مكة المكرمة', weight: 2 },
  { en: 'Madinah', ar: 'المدينة المنورة', weight: 1.5 },
  { en: 'Khobar', ar: 'الخبر', weight: 1.5 },
] as const;

export interface CategorySeed {
  code: string;
  en: string;
  ar: string;
  /** [priceMin, priceMax] in whole currency units. */
  price: readonly [number, number];
  uom: string;
  items: readonly (readonly [string, string])[];
}

export const categorySeeds: readonly CategorySeed[] = [
  {
    code: 'food',
    en: 'Food',
    ar: 'مواد غذائية',
    price: [5, 80],
    uom: 'unit',
    items: [
      ['Basmati Rice', 'أرز بسمتي'],
      ['Dates', 'تمر'],
      ['Olive Oil', 'زيت زيتون'],
      ['Lentils', 'عدس'],
      ['Chicken', 'دجاج'],
      ['Flour', 'طحين'],
    ],
  },
  {
    code: 'sweets',
    en: 'Sweets',
    ar: 'حلويات',
    price: [8, 120],
    uom: 'box',
    items: [
      ['Kunafa', 'كنافة'],
      ['Maamoul', 'معمول'],
      ['Baklava', 'بقلاوة'],
      ['Chocolate', 'شوكولاتة'],
    ],
  },
  {
    code: 'beverages',
    en: 'Beverages',
    ar: 'مشروبات',
    price: [2, 40],
    uom: 'bottle',
    items: [
      ['Laban', 'لبن'],
      ['Arabic Coffee', 'قهوة عربية'],
      ['Tea', 'شاي'],
      ['Juice', 'عصير'],
      ['Water', 'مياه'],
    ],
  },
  {
    code: 'apparel',
    en: 'Apparel',
    ar: 'ملابس',
    price: [40, 600],
    uom: 'piece',
    items: [
      ['Thobe', 'ثوب'],
      ['Abaya', 'عباية'],
      ['Shemagh', 'شماغ'],
      ['Sneakers', 'حذاء رياضي'],
    ],
  },
  {
    code: 'electronics',
    en: 'Electronics',
    ar: 'إلكترونيات',
    price: [80, 4500],
    uom: 'piece',
    items: [
      ['Smartphone', 'هاتف ذكي'],
      ['Headphones', 'سماعات'],
      ['Laptop', 'حاسب محمول'],
      ['Smartwatch', 'ساعة ذكية'],
    ],
  },
  {
    code: 'home',
    en: 'Home',
    ar: 'المنزل',
    price: [15, 900],
    uom: 'piece',
    items: [
      ['Coffee Maker', 'صانعة قهوة'],
      ['Rug', 'سجادة'],
      ['Cookware Set', 'طقم أواني'],
      ['Lamp', 'مصباح'],
    ],
  },
  {
    code: 'gifts',
    en: 'Gifts',
    ar: 'هدايا',
    price: [20, 500],
    uom: 'piece',
    items: [
      ['Oud Perfume', 'عطر عود'],
      ['Incense', 'بخور'],
      ['Gift Box', 'صندوق هدايا'],
    ],
  },
  {
    code: 'stationery',
    en: 'Stationery',
    ar: 'قرطاسية',
    price: [2, 150],
    uom: 'piece',
    items: [
      ['Notebook', 'دفتر'],
      ['Backpack', 'حقيبة مدرسية'],
      ['Pen Set', 'طقم أقلام'],
    ],
  },
];

export const productVariants = [
  ['Classic', 'كلاسيك'],
  ['Premium', 'فاخر'],
  ['Family Size', 'حجم عائلي'],
  ['Mini', 'صغير'],
  ['Deluxe', 'ممتاز'],
] as const;
