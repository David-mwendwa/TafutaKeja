/**
 * Real Kenyan neighbourhoods, with the coordinates the map pins them at and the
 * price band each one actually trades in.
 *
 * The bands are the part that matters. A property marketplace seeded with
 * uniform random prices reads as obviously fake to anyone who knows the market:
 * a bedsitter in Runda and a four-bedroom in Rongai at the same money is the
 * tell. `rentPerBedroom` is the monthly asking rent for a typical unit of that
 * size in that area, in KES, and the seed varies around it rather than across it.
 *
 * `saleMultiple` turns a monthly rent into an asking price. Nairobi residential
 * yields sit around 6-7% gross, so annual rent divided by 0.065 — about 185x the
 * monthly — is the honest conversion, and it keeps rent and sale listings in the
 * same area telling a consistent story.
 */

/* `landPerAcre` is what a serviced acre in that belt asks, in KES. Land does
 * not track rent closely enough to be derived from it — Karen rents a fraction
 * of what Kilimani does per bedroom while its land costs far more. */
export const TIERS = {
  premium: { label: 'Premium', saleMultiple: 200, landPerAcre: 100000000 },
  high: { label: 'Upmarket', saleMultiple: 190, landPerAcre: 55000000 },
  upperMid: { label: 'Upper middle', saleMultiple: 180, landPerAcre: 70000000 },
  mid: { label: 'Middle', saleMultiple: 170, landPerAcre: 16000000 },
  affordable: { label: 'Affordable', saleMultiple: 160, landPerAcre: 14000000 },
  commuter: { label: 'Commuter belt', saleMultiple: 150, landPerAcre: 10000000 },
};

// rentPerBedroom is keyed by bedroom count; 0 is a bedsitter/studio.
export const AREAS = [
  // --- Nairobi: premium -----------------------------------------------------
  { area: 'Runda', county: 'Nairobi', tier: 'premium', coords: [36.8167, -1.2167],
    rentPerBedroom: { 3: 280000, 4: 420000, 5: 600000 },
    blurb: 'Leafy diplomatic suburb of walled compounds and mature gardens, minutes from the UN complex at Gigiri.' },
  { area: 'Muthaiga', county: 'Nairobi', tier: 'premium', coords: [36.8333, -1.2500],
    rentPerBedroom: { 3: 260000, 4: 400000, 5: 550000 },
    blurb: 'Old-money Nairobi: high hedges, half-acre plots and the golf club at its centre.' },
  { area: 'Kitisuru', county: 'Nairobi', tier: 'premium', coords: [36.7833, -1.2333],
    rentPerBedroom: { 3: 220000, 4: 350000, 5: 480000 },
    blurb: 'Quiet gated estates on the ridge above the Karura forest edge.' },
  { area: 'Gigiri', county: 'Nairobi', tier: 'premium', coords: [36.8167, -1.2333],
    rentPerBedroom: { 2: 150000, 3: 240000, 4: 360000 },
    blurb: 'The diplomatic quarter, walking distance to UNEP, embassies and Village Market.' },

  // --- Nairobi: upmarket ----------------------------------------------------
  { area: 'Karen', county: 'Nairobi', tier: 'high', coords: [36.7085, -1.3197],
    rentPerBedroom: { 3: 180000, 4: 280000, 5: 400000 },
    blurb: 'Space and horses on the city\'s south-western edge, with the Ngong Hills on the skyline.' },
  { area: 'Lavington', county: 'Nairobi', tier: 'high', coords: [36.7669, -1.2779],
    rentPerBedroom: { 2: 110000, 3: 165000, 4: 240000 },
    blurb: 'Established, tree-lined and central, the compromise between Westlands bustle and Karen distance.' },
  { area: 'Riverside', county: 'Nairobi', tier: 'high', coords: [36.7950, -1.2720],
    rentPerBedroom: { 1: 80000, 2: 120000, 3: 175000 },
    blurb: 'Riverside Drive\'s serviced apartments and embassies, a short hop from Westlands and the CBD.' },
  { area: 'Spring Valley', county: 'Nairobi', tier: 'high', coords: [36.7830, -1.2580],
    rentPerBedroom: { 2: 105000, 3: 155000, 4: 220000 },
    blurb: 'Low-density and green, tucked between Westlands and Loresho.' },
  { area: 'Loresho', county: 'Nairobi', tier: 'high', coords: [36.7500, -1.2500],
    rentPerBedroom: { 3: 145000, 4: 210000, 5: 290000 },
    blurb: 'Generous plots on the Waiyaki Way ridge, popular with families wanting a garden.' },

  // --- Nairobi: upper middle ------------------------------------------------
  { area: 'Kilimani', county: 'Nairobi', tier: 'upperMid', coords: [36.7856, -1.2921],
    rentPerBedroom: { 0: 35000, 1: 60000, 2: 95000, 3: 145000 },
    blurb: 'Nairobi\'s densest apartment market: Yaya Centre, Argwings Kodhek and a short commute to anywhere.' },
  { area: 'Kileleshwa', county: 'Nairobi', tier: 'upperMid', coords: [36.7833, -1.2833],
    rentPerBedroom: { 1: 62000, 2: 95000, 3: 140000, 4: 195000 },
    blurb: 'Quieter than Kilimani next door, and steadily replacing its bungalows with apartment blocks.' },
  { area: 'Westlands', county: 'Nairobi', tier: 'upperMid', coords: [36.8108, -1.2676],
    rentPerBedroom: { 0: 40000, 1: 70000, 2: 105000, 3: 160000 },
    blurb: 'The commercial second city: offices, Sarit Centre, and the Expressway on its doorstep.' },
  { area: 'Parklands', county: 'Nairobi', tier: 'upperMid', coords: [36.8570, -1.2620],
    rentPerBedroom: { 1: 48000, 2: 72000, 3: 105000 },
    blurb: 'Dense, walkable and long-established, with Aga Khan Hospital and City Park close by.' },
  { area: 'Upper Hill', county: 'Nairobi', tier: 'upperMid', coords: [36.8148, -1.2966],
    rentPerBedroom: { 1: 65000, 2: 98000, 3: 140000 },
    blurb: 'Nairobi\'s corporate spine: banks, hospitals and towers, five minutes from the CBD.' },

  // --- Nairobi: middle ------------------------------------------------------
  { area: 'South B', county: 'Nairobi', tier: 'mid', coords: [36.8400, -1.3100],
    rentPerBedroom: { 0: 15000, 1: 28000, 2: 45000, 3: 62000 },
    blurb: 'Settled, self-contained and close to the industrial area and Mombasa Road.' },
  { area: 'South C', county: 'Nairobi', tier: 'mid', coords: [36.8300, -1.3200],
    rentPerBedroom: { 1: 30000, 2: 48000, 3: 68000 },
    blurb: 'Quiet residential streets between Mombasa Road and Lang\'ata, handy for the airport.' },
  { area: "Lang'ata", county: 'Nairobi', tier: 'mid', coords: [36.7500, -1.3667],
    rentPerBedroom: { 2: 42000, 3: 65000, 4: 95000 },
    blurb: 'Bordering Nairobi National Park, with Galleria and the Southern Bypass nearby.' },
  { area: 'Ruaka', county: 'Kiambu', tier: 'mid', coords: [36.7830, -1.2000],
    rentPerBedroom: { 0: 14000, 1: 26000, 2: 42000, 3: 60000 },
    blurb: 'Fast-growing apartment belt on the Northern Bypass, next to Two Rivers.' },

  // --- Nairobi: affordable --------------------------------------------------
  { area: 'Donholm', county: 'Nairobi', tier: 'affordable', coords: [36.8900, -1.2950],
    rentPerBedroom: { 0: 11000, 1: 19000, 2: 30000, 3: 42000 },
    blurb: 'Eastlands mainstay off Outer Ring Road, well served by matatus into town.' },
  { area: 'Buruburu', county: 'Nairobi', tier: 'affordable', coords: [36.8770, -1.2870],
    rentPerBedroom: { 1: 18000, 2: 28000, 3: 40000 },
    blurb: 'The original Eastlands maisonette estate, laid out in phases and full of established families.' },
  { area: 'Kasarani', county: 'Nairobi', tier: 'affordable', coords: [36.8970, -1.2200],
    rentPerBedroom: { 0: 10000, 1: 17000, 2: 27000, 3: 38000 },
    blurb: 'Around the national stadium and Thika Road, one of the city\'s biggest rental markets.' },
  { area: 'Roysambu', county: 'Nairobi', tier: 'affordable', coords: [36.8890, -1.2170],
    rentPerBedroom: { 0: 11000, 1: 18000, 2: 29000, 3: 40000 },
    blurb: 'Thika Road high-rise country, at the TRM end with the superhighway into the city.' },
  { area: 'Embakasi', county: 'Nairobi', tier: 'affordable', coords: [36.8940, -1.3200],
    rentPerBedroom: { 0: 9500, 1: 16000, 2: 26000, 3: 36000 },
    blurb: 'Close to JKIA and the Eastern Bypass, popular with airport and industrial-area workers.' },

  // --- Commuter belt --------------------------------------------------------
  { area: 'Ongata Rongai', county: 'Kajiado', tier: 'commuter', coords: [36.7450, -1.3950],
    rentPerBedroom: { 0: 9000, 1: 15000, 2: 25000, 3: 35000 },
    blurb: 'Over the Ngong Hills side, on the Magadi Road with Karen between it and town.' },
  { area: 'Syokimau', county: 'Machakos', tier: 'commuter', coords: [36.9500, -1.3630],
    rentPerBedroom: { 1: 18000, 2: 30000, 3: 45000 },
    blurb: 'Purpose-built estates by the SGR terminus and the Expressway, minutes from JKIA.' },
  { area: 'Kitengela', county: 'Kajiado', tier: 'commuter', coords: [36.9600, -1.4780],
    rentPerBedroom: { 0: 8500, 1: 14000, 2: 24000, 3: 34000 },
    blurb: 'Beyond Athi River on the Namanga Road, with plot sizes town cannot match.' },
  { area: 'Athi River', county: 'Machakos', tier: 'commuter', coords: [36.9780, -1.4560],
    rentPerBedroom: { 1: 15000, 2: 25000, 3: 36000 },
    blurb: 'Industrial and residential mix on Mombasa Road, anchored by the EPZ.' },
  { area: 'Ruiru', county: 'Kiambu', tier: 'commuter', coords: [36.9600, -1.1500],
    rentPerBedroom: { 0: 9000, 1: 16000, 2: 26000, 3: 38000 },
    blurb: 'Thika Superhighway growth corridor, with gated estates going up on former coffee land.' },
  { area: 'Juja', county: 'Kiambu', tier: 'commuter', coords: [37.0100, -1.1000],
    rentPerBedroom: { 0: 7500, 1: 13000, 2: 22000, 3: 31000 },
    blurb: 'University town on the superhighway, with a large student rental market around JKUAT.' },
  { area: 'Kikuyu', county: 'Kiambu', tier: 'commuter', coords: [36.6630, -1.2470],
    rentPerBedroom: { 0: 8000, 1: 14000, 2: 23000, 3: 33000 },
    blurb: 'Off Waiyaki Way past Kinoo, with the Southern Bypass linking it to the rest of the city.' },

  // --- Coast ----------------------------------------------------------------
  { area: 'Nyali', county: 'Mombasa', tier: 'high', coords: [39.7000, -4.0300],
    rentPerBedroom: { 1: 45000, 2: 70000, 3: 105000, 4: 150000 },
    blurb: 'Mombasa\'s north-coast address: sea breeze, mature palms and the Nyali bridge into town.' },
  { area: 'Bamburi', county: 'Mombasa', tier: 'mid', coords: [39.7200, -3.9900],
    rentPerBedroom: { 1: 28000, 2: 45000, 3: 65000 },
    blurb: 'North coast beach strip, with holiday lets and long-term rentals side by side.' },
  { area: 'Diani', county: 'Kilifi', tier: 'high', coords: [39.5900, -4.2800],
    rentPerBedroom: { 1: 55000, 2: 85000, 3: 130000, 4: 190000 },
    blurb: 'South coast white sand, a holiday-let market that runs on the high season.' },

  // --- Regional cities ------------------------------------------------------
  { area: 'Milimani', county: 'Kisumu', tier: 'upperMid', coords: [34.7500, -0.1000],
    rentPerBedroom: { 1: 25000, 2: 40000, 3: 58000 },
    blurb: 'Kisumu\'s established residential quarter, close to the lake and the county offices.' },
  { area: 'Milimani', county: 'Nakuru', tier: 'upperMid', coords: [36.0700, -0.2900],
    rentPerBedroom: { 1: 22000, 2: 36000, 3: 52000 },
    blurb: 'Nakuru\'s leafy older suburb, a short drive from the lake and the new city centre.' },
  { area: 'Elgon View', county: 'Uasin Gishu', tier: 'high', coords: [35.2700, 0.5200],
    rentPerBedroom: { 2: 42000, 3: 62000, 4: 88000 },
    blurb: 'Eldoret\'s premium suburb, quiet streets and large plots near Moi Referral.' },
  { area: 'Kamakwa', county: 'Nyeri', tier: 'mid', coords: [36.9500, -0.4200],
    rentPerBedroom: { 1: 16000, 2: 26000, 3: 38000 },
    blurb: 'Residential Nyeri with the Aberdares behind it and the town centre a few minutes away.' },
];

export const areaByName = Object.fromEntries(AREAS.map((a) => [a.area, a]));
