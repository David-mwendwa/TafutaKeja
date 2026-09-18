/**
 * The agencies the seeded catalogue is listed by.
 *
 * An empty marketplace demos as broken, and so does one where every property is
 * listed by the same person. These are invented firms with plausible Kenyan
 * names and a spread of sizes — one national outfit, a couple of area
 * specialists, one coastal agency, and a sole trader who has not been verified
 * yet, so the admin queue has something honest to act on.
 */
export const AGENTS = [
  {
    name: 'Wanjiru Kamau', email: 'wanjiru@tafutakeja.ke', phone: '0722145889',
    whatsapp: '0722145889', agencyName: 'Acacia Property Partners', verified: true,
    bio: 'Fifteen years letting and selling in Nairobi\'s western suburbs: Lavington, Kileleshwa and Riverside. I handle viewings personally.',
    areas: ['Lavington', 'Kileleshwa', 'Riverside', 'Kilimani', 'Spring Valley', 'Westlands'],
  },
  {
    name: 'Otieno Ochieng', email: 'otieno@tafutakeja.ke', phone: '0733207415',
    whatsapp: '0733207415', agencyName: 'Jengo Realty', verified: true,
    bio: 'Eastlands and the Thika Road corridor. If you want honest advice about what your budget actually reaches, call me before you start viewing.',
    areas: ['Donholm', 'Buruburu', 'Kasarani', 'Roysambu', 'Embakasi', 'Ruiru', 'Juja'],
  },
  {
    name: 'Aisha Mohamed', email: 'aisha@tafutakeja.ke', phone: '0720883014',
    whatsapp: '0720883014', agencyName: 'Coastline Realty', verified: true,
    bio: 'North and south coast: Nyali, Bamburi and Diani. Holiday lets and long-term rentals, and I know which blocks actually have water.',
    areas: ['Nyali', 'Bamburi', 'Diani'],
  },
  {
    name: 'Peter Mwangi', email: 'peter@tafutakeja.ke', phone: '0711452063',
    whatsapp: '0711452063', agencyName: 'Ndovu Properties', verified: true,
    bio: 'Karen, Runda, Muthaiga and Kitisuru. Family homes on larger plots, and I will tell you when a property is overpriced.',
    areas: ['Karen', 'Runda', 'Muthaiga', 'Kitisuru', 'Gigiri', 'Loresho'],
  },
  {
    name: 'Grace Njeri', email: 'grace@tafutakeja.ke', phone: '0726190337',
    whatsapp: '0726190337', agencyName: 'Tamarind Homes', verified: true,
    bio: 'The commuter belt: Syokimau, Kitengela, Athi River and Rongai. Plots, own-compound houses and new gated estates.',
    areas: ['Syokimau', 'Kitengela', 'Athi River', 'Ongata Rongai', 'Kikuyu', 'Ruaka'],
  },
  {
    name: 'Brian Kiptoo', email: 'brian@tafutakeja.ke', phone: '0715738204',
    whatsapp: '0715738204', agencyName: 'Rift Valley Homes', verified: true,
    bio: 'Nakuru, Eldoret and Nyeri. Regional markets move differently from Nairobi and I have worked in all three for a decade.',
    areas: ['Milimani', 'Elgon View', 'Kamakwa'],
  },
  {
    name: 'Faith Chebet', email: 'faith@tafutakeja.ke', phone: '0708316592',
    whatsapp: '0708316592', agencyName: 'Mji Property Group', verified: true,
    bio: 'Apartments in South B, South C and Lang\'ata. Mostly two and three bedroom units for young families.',
    areas: ['South B', 'South C', "Lang'ata", 'Parklands', 'Upper Hill'],
  },
  {
    // Deliberately unverified with listings still in review, so the admin
    // moderation queue and the "unverified agent" badge both have something
    // real to show rather than an empty state.
    name: 'Samuel Kariuki', email: 'samuel@tafutakeja.ke', phone: '0790224718',
    whatsapp: '0790224718', agencyName: '', verified: false,
    bio: 'Independent agent working across Nairobi. New to TafutaKeja.',
    areas: [],
  },
];
