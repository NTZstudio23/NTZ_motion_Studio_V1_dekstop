import { PromptConfig, StudioSettings } from '../types/studio';

export const ADOBE_CATS: Array<[number, string]> = [
  [1, 'Animals'],
  [2, 'Buildings and Architecture'],
  [3, 'Business'],
  [4, 'Drinks'],
  [5, 'The Environment'],
  [6, 'States of Mind'],
  [7, 'Food'],
  [8, 'Graphic Resources'],
  [9, 'Hobbies and Leisure'],
  [10, 'Industry'],
  [11, 'Landscapes'],
  [12, 'Lifestyle'],
  [13, 'People'],
  [14, 'Plants and Flowers'],
  [15, 'Culture and Religion'],
  [16, 'Science'],
  [17, 'Social Issues'],
  [18, 'Sports'],
  [19, 'Technology'],
  [20, 'Transport'],
  [21, 'Travel'],
];

export type TemplateItem = [string, string, number]; // [name, desc, isHot]
export type CategoryItem = [string, string, TemplateItem[]];

const parseTpl = (s: string): TemplateItem[] =>
  s
    .trim()
    .split('\n')
    .map((l) => {
      const q = l.trim().split('|');
      return [q[0], q[1], q[2] ? 1 : 0];
    });

const BASE_CATS: CategoryItem[] = [
  [
    'bestsellers',
    'Paling Dicari Buyer',
    [
      ['Abstract Corporate Blue Flow', 'Gelombang pita cahaya biru profesional & putih halus', 1],
      ['Golden Dust Luxury Loop', 'Partikel debu emas mewah berkilau dengan bokeh lembut', 1],
      ['AI Neural Network Data', 'Jaringan simpul AI 3D & pulsa data bercahaya', 1],
      ['Clean Minimalist White Waves', 'Latar putih bersih berombak lembut untuk iklan produk', 1],
      ['Cyber Stock Market Bullish', 'Grafik saham naik hijau-biru & grid finansial', 1],
      ['Warm Film Light Leaks', 'Sapuan cahaya lensa hangat oranye-amber untuk transisi', 1],
      ['Futuristic HUD Target Alpha', 'Elemen radar & lingkaran UI sci-fi overlay', 1],
      ['Vibrant Liquid Mesh Loop', 'Gradasi cair warna modern berombak lembut', 1],
    ],
  ],
  [
    'abstract',
    'Abstrak & Background',
    [
      ['Silk Liquid Gradient', 'Gelombang gradasi cair berlapis organik', 0],
      ['Bokeh Lights Ambient', 'Lingkaran bokeh hangat melayang ke atas', 1],
      ['Aurora Borealis Sky', 'Pita cahaya aurora hijau-cyan-ungu di langit malam', 0],
      ['Geometric Bauhaus Flow', 'Pola geometris minimalis berotasi sinkron', 0],
      ['Topographic Contour Lines', 'Garis kontur peta topografi bergerak lembut', 1],
    ],
  ],
  [
    'tech',
    'Teknologi & AI',
    [
      ['AI Neural Network', 'Jaringan saraf buatan dengan node bercahaya', 1],
      ['Cyber Matrix Rain', 'Hujan karakter digital & biner vertikal', 0],
      ['Circuit Board Pulse', 'Jalur PCB microchip dengan aliran pulsa listrik', 1],
      ['Hologram Wireframe Sphere', 'Bola dunia wireframe 3D berputar dengan orbit', 0],
      ['Quantum Grid Horizon', 'Grid retro-futuristik bergerak ke cakrawala', 0],
    ],
  ],
  [
    'business',
    'Bisnis & Finansial',
    [
      ['Bullish Stock Chart', 'Grafik saham naik dengan kurva cahaya', 1],
      ['Global Network Connections', 'Koneksi hub bisnis global dengan busur cahaya', 1],
      ['Isometric Growth Bars', 'Diagram batang 3D isometrik naik bertahap', 0],
      ['Clean Corporate Waves', 'Garis tipis paralel tenang untuk presentasi', 1],
    ],
  ],
  [
    'nature',
    'Alam & Kosmik',
    [
      ['Underwater Sun Rays', 'Sinar matahari menembus air laut & gelembung', 1],
      ['Falling Sakura Leaves', 'Kelopak bunga sakura melayang tertiup angin', 0],
      ['Starry Night Milky Way', 'Hamparan bintang berkedip & nebula galaksi', 1],
      ['Rain Water Ripples', 'Tetesan hujan menciptakan riak air konsentris', 0],
    ],
  ],
  [
    'medical',
    'Medis & Sains',
    [
      ['DNA Double Helix', 'Untaian DNA double helix 3D berputar halus', 1],
      ['ECG Heartbeat Pulse', 'Garis monitor detak jantung medis di grid', 1],
      ['Molecular Atoms Orbit', 'Struktur atom & lintasan elektron elips 3D', 0],
      ['Microscopic Cells Flow', 'Sel organik mengapung dalam fluida mikro', 0],
    ],
  ],
  [
    'social',
    'Sosmed & HUD',
    [
      ['Glassmorphism Lower Third', 'Panel judul kaca buram modern bercahaya', 1],
      ['Futuristic HUD Radar', 'Cincin kompas & pemindai radar sci-fi', 1],
      ['Audio Spectrum Visualizer', 'Equalizer batang & gelombang musik ritmis', 1],
      ['Countdown Timer Ring', 'Hitung mundur lingkaran progres elegan', 0],
    ],
  ],
  [
    'festive',
    'Perayaan & Musiman',
    [
      ['Fireworks Celebration', 'Kembang api warna-warni realistis di langit malam', 1],
      ['Confetti Party Overlay', 'Hujan konfeti & pita warna-warni berputar 3D', 1],
      ['Ramadan Eid Lanterns', 'Bulan sabit emas, lentera berayun & bintang islami', 1],
      ['Winter Snowfall Gentle', 'Kepingan salju turun lembut dengan bokeh', 0],
    ],
  ],
  [
    'transitions',
    'Transisi & Overlay',
    [
      ['Warm Film Light Leaks', 'Kebocoran cahaya lensa hangat oranye-amber', 1],
      ['Vintage Film Grain Dust', 'Tekstur film klasik, grain halus & debu', 1],
      ['Digital Glitch Bars', 'Distorsi RGB split, scanline & blok glitch', 0],
      ['Liquid Ink Wipe', 'Transisi sapuan tinta organik melengkung', 0],
    ],
  ],
  [
    'luxury',
    'Luxury & Wedding',
    [
      ['Gold Dust Horizon', 'Debu emas mewah & flare cahaya horizontal', 1],
      ['Diamond Lens Flare', 'Kilauan prisma berlian & flare kristal', 0],
      ['Golden Art-Deco Frame', 'Bingkai garis emas art-deco simetris', 1],
    ],
  ],
  [
    'infographic',
    'Infografis & Data',
    [
      ['World Map Ping Radar', 'Peta titik dunia dengan sinyal ping lokasi', 1],
      ['Animated Pie Donut Ring', 'Diagram donat multi-segmen terisi mulus', 0],
      ['Digital Radar Scan', 'Pemindai radar 360 derajat mendeteksi target', 0],
    ],
  ],
  [
    'gaming',
    'Gaming & Stream',
    [
      ['Synthwave Retro Sun Loop', 'Matahari neon retro 80an di atas grid 3D', 1],
      ['Neon Stream Frame Border', 'Bingkai tepi neon bercahaya untuk facecam', 1],
      ['Esports Energy Sparks', 'Percikan bara api merah-oranye kompetitif', 0],
    ],
  ],
];

const EXTRA_MAP: Record<string, string> = {
  bestsellers: `Dark Blue Tech Particles Loop|Partikel biru tua teknologi mengalir halus|1
Soft Pastel Gradient Blur|Gradasi pastel lembut buram untuk latar teks|1
Glowing Particles Rising|Partikel bercahaya naik perlahan dengan bokeh|1
Elegant Black Gold Lines|Garis emas tipis di latar hitam mewah|1
Abstract Geometric Triangles Flow|Segitiga geometris bergerak dinamis modern|1
Light Rays Sunbeam Overlay|Sinar cahaya matahari diagonal untuk overlay|1
Floating Dust Cinematic Bokeh|Debu melayang & bokeh sinematik hangat|1
Smooth Gradient Mesh Blobs|Blob gradasi mesh warna cair modern|1
Neon Lines Tunnel Loop|Terowongan garis neon bergerak tanpa henti
Digital Binary Code Stream|Aliran kode biner digital bercahaya`,
  abstract: `Fluid Marble Ink Swirl|Pusaran tinta marmer cair elegan
Holographic Iridescent Gradient|Gradasi holografik warna-warni berkilau|1
Glitter Sparkle Shimmer Loop|Kilau glitter berkelip lembut berulang|1
Wave Dots Halftone Motion|Titik halftone bergelombang ritmis
Smoke Wisps Slow Motion|Asap tipis meliuk gerak lambat
Paper Cut Layers Waves|Lapisan kertas bergelombang bayangan lembut|1
Particle Vortex Spiral|Partikel berputar membentuk spiral
Kaleidoscope Mandala Rotate|Mandala kaleidoskop berputar simetris
Rising Bubbles Soft Gradient|Gelembung naik di gradasi lembut
Light Streaks Speed Lines|Goresan cahaya cepat melintas|1
Concentric Rings Pulse|Cincin konsentris berdenyut halus|1
Grainy Noise Gradient Aurora|Gradasi aurora bertekstur grain modern`,
  tech: `Cybersecurity Shield Scan|Perisai siber dengan pemindai data|1
Blockchain Cubes Chain|Rantai kubus blockchain bercahaya|1
Cloud Computing Data Nodes|Awan & node data saling terhubung
Data Center Server Lights|Rak server dengan lampu indikator berkedip
Digital Globe Connections|Bola dunia digital dengan busur koneksi|1
Code Rain Terminal Lines|Baris kode terminal bergulir cepat
Futuristic Interface Panels|Panel antarmuka futuristik melayang|1
5G Signal Wave Towers|Gelombang sinyal 5G memancar dari menara
Robot AI Brain Circuit|Otak AI dengan jalur sirkuit menyala|1
Quantum Particle Orbit|Partikel kuantum mengorbit inti bercahaya
Fintech Payment Digital Flow|Aliran data pembayaran digital`,
  business: `Business Growth Arrow Chart|Panah pertumbuhan naik dengan grid bersih|1
Finance Candlestick Rise|Candlestick saham naik bertahap|1
Team Network Collaboration Nodes|Node tim saling terhubung kolaboratif
Startup Rocket Launch Trail|Roket startup meluncur dengan jejak cahaya|1
Coin Crypto Digital Flow|Koin kripto emas mengalir digital|1
Presentation Clean Geometric Frame|Bingkai geometris bersih untuk presentasi
Marketing Funnel Flow|Corong pemasaran dengan partikel mengalir
World Trade Route Arcs|Busur rute perdagangan dunia
Pie Chart Percent Reveal|Diagram pie terisi bertahap
Corporate Lines Blue Minimal|Garis biru minimalis korporat`,
  nature: `Ocean Waves Sunset Glow|Ombak laut dengan cahaya senja|1
Forest Fireflies Night|Kunang-kunang di hutan malam|1
Floating Clouds Sky Timelapse|Awan berarak timelapse langit biru|1
Fire Embers Sparks Rising|Bara api & percikan naik ke udara|1
Snowy Mountain Aurora Night|Gunung salju di bawah aurora malam
Falling Autumn Leaves Breeze|Daun musim gugur melayang tertiup angin
Raindrops Window Bokeh|Tetesan hujan di kaca dengan bokeh kota|1
Lightning Storm Clouds|Petir menyambar awan badai gelap
Sunrise Rays Misty Valley|Sinar fajar menembus lembah berkabut|1
Dandelion Seeds Floating|Biji dandelion melayang lembut
Galaxy Nebula Space Travel|Perjalanan melintasi nebula galaksi|1
Desert Dunes Wind Sand|Bukit pasir gurun tertiup angin
Tropical Leaves Shadow Sway|Bayangan daun tropis bergoyang|1
Water Caustics Pool Light|Pantulan cahaya air kolam berkilau`,
  medical: `Virus Cells Floating Microscope|Sel virus melayang di bawah mikroskop|1
Heart Rate Monitor Line|Garis detak jantung bergulir di monitor|1
Human Brain Neural Pulses|Otak manusia dengan pulsa saraf|1
Medical Cross Pulse Glow|Palang medis berdenyut bercahaya
Pill Capsule Molecule Flow|Kapsul obat & molekul mengalir
Healthcare Plus Symbols Float|Simbol plus kesehatan melayang|1
Medical Lab Grid Particles|Partikel laboratorium di grid sains
Vaccine Droplet Shield Glow|Tetesan vaksin & perisai bercahaya
Red Blood Cells Flow|Sel darah merah mengalir di pembuluh`,
  social: `Notification Bell Pop Overlay|Lonceng notifikasi muncul memantul|1
Social Like Hearts Float Overlay|Hati like melayang naik overlay|1
Sound Wave Podcast Visualizer|Gelombang suara podcast ritmis|1
Lower Third Neon Bar|Bilah judul neon modern|1
Intro Reveal Particles|Partikel membentuk area judul intro
Streaming Overlay Frame Neon|Bingkai overlay streaming neon
Loading Spinner Rings|Cincin loading berputar elegan
Progress Bar Neon Sweep|Bar progres neon menyapu
Chat Bubble Pop Floating|Gelembung chat muncul melayang
Call To Action Arrow Pulse|Panah ajakan berdenyut menarik`,
  transitions: `Zoom Blur Speed Transition|Zoom blur cepat antar adegan|1
Shape Wipe Circle Reveal|Lingkaran membuka layar mulus
Smoke Reveal Transition|Asap tebal membuka adegan
Light Flash Flare Transition|Kilatan cahaya flare antar klip|1
Pixel Mosaic Dissolve|Mosaik piksel melarut
Page Peel Curl|Kertas terkelupas melengkung
Ink Splash Reveal|Cipratan tinta membuka layar|1
Glitch Zap Lines|Garis glitch menyambar singkat
Film Burn Edge Overlay|Tepi film terbakar hangat|1
Dust Scratches Old Film|Debu & goresan film tua|1`,
  luxury: `Rose Gold Particles Elegant|Partikel rose gold elegan berkilau|1
Black Gold Marble Veins|Urat marmer hitam emas mewah|1
Wedding Hearts Rings Sparkle|Hati & cincin pernikahan berkilau|1
Champagne Gold Bubbles|Gelembung champagne emas naik
Pearl Shimmer Silk Curtains|Tirai sutra mutiara berkilau
Sparkling Diamond Facets|Faset berlian berkilau berputar
Luxury Gold Frame Corners|Sudut bingkai emas mewah|1
Gold Foil Glitter Rain|Hujan glitter foil emas|1
Royal Velvet Curtain Glow|Tirai beludru royal bercahaya
Wedding Floral Petals Falling|Kelopak bunga pernikahan berjatuhan|1
Gold Line Ornament Draw|Ornamen garis emas tergambar halus`,
  infographic: `Animated Bar Chart Rise|Diagram batang naik animasi bersih|1
Line Chart Growth Draw|Grafik garis tergambar bertumbuh|1
Progress Circles Percent|Lingkaran progres persentase|1
Map Pin Location Drop|Pin lokasi jatuh di peta|1
Timeline Milestone Nodes|Garis waktu dengan node tonggak
Flowchart Arrows Connect|Diagram alur dengan panah terhubung
Counter Numbers Rolling|Angka penghitung bergulir
Data Dashboard Grid Pulses|Kisi dasbor data berdenyut
Checklist Tick Animation|Centang daftar tugas bergantian`,
  gaming: `Neon Arcade Grid Tunnel|Terowongan grid neon arcade|1
Pixel Rain Retro Game|Hujan piksel gaya game retro|1
Fire Magic Runes Circle|Lingkaran rune api sihir
Loot Sparkle Treasure Glow|Kilau harta karun bercahaya
Cyberpunk City Rain Neon|Kota cyberpunk hujan neon|1
Esports Hexagon HUD Frame|Bingkai HUD heksagon esports|1
Lightning Energy Shield|Perisai energi petir
Starfield Warp Jump|Lompatan warp melintasi bintang|1
Level Up Burst Particles|Ledakan partikel naik level|1`,
  festive: `Birthday Balloons Confetti|Balon & konfeti pesta ulang tahun|1
Party Disco Ball Lights|Bola disko & lampu pesta berputar|1
Champagne Bubbles Celebration|Gelembung champagne perayaan|1
Gold Balloons Party Loop|Balon emas melayang pesta
Baby Shower Pastel Clouds|Awan pastel & bintang bayi lembut
Gender Reveal Pink Blue Burst|Ledakan warna pink & biru
Sparkler Night Trails|Jejak kembang api tangan malam
Autumn Falling Leaves Warm|Daun musim gugur hangat berjatuhan|1
Spring Cherry Blossom Petals|Kelopak sakura musim semi melayang
Summer Beach Sunset Waves|Pantai senja & ombak musim panas|1
Winter Frost Crystal Snowflakes|Kristal es & salju musim dingin|1
Streamer Ribbon Celebration|Pita serpentine perayaan berputar
Congratulations Star Burst|Ledakan bintang ucapan selamat|1
Grand Opening Spotlight Beams|Sorotan lampu pembukaan megah|1
Sale Promo Burst Rays|Sinar ledakan promo diskon|1
Rainy Season Umbrella Drops|Tetes hujan & payung musim hujan`,
};

const NEW_CATS: CategoryItem[] = [
  [
    'events',
    'Event Tahunan Dunia',
    parseTpl(`New Year Countdown Fireworks|Hitung mundur tahun baru & kembang api emas|1
Happy New Year Gold Confetti|Konfeti emas jatuh dengan kilau pesta malam|1
Chinese New Year Red Lanterns|Lentera merah imlek berayun & partikel emas|1
Valentine Hearts Bokeh|Hati merah muda melayang dengan bokeh romantis|1
International Womens Day Floral|Bunga ungu-pink mekar anggun hari perempuan
St Patrick Day Clover Gold|Semanggi hijau & koin emas berkilau
Easter Eggs Spring Pastel|Telur paskah pastel & bunga musim semi
Earth Day Green Planet|Planet hijau berputar dengan daun & cahaya lembut|1
Mothers Day Soft Blossoms|Kelopak bunga lembut & hati hangat|1
Fathers Day Blue Elegant|Gradasi biru elegan dengan bintang halus
Patriotic Fireworks Red White Blue|Kembang api merah-putih-biru & bintang jatuh|1
Summer Sale Tropical Splash|Percikan tropis cerah untuk promo musim panas|1
Back to School Doodle Pattern|Pola doodle sekolah & bintang warna-warni
Graduation Gold Confetti Caps|Konfeti emas & topi toga melayang|1
Halloween Spooky Moon Bats|Bulan purnama oranye, kelelawar & kabut|1
Halloween Pumpkin Glow|Labu menyala & percikan oranye|1
Dia de Muertos Marigold|Bunga marigold oranye & kelopak melayang
Diwali Festival of Lights Diya|Lampu diya berkilau & mandala emas|1
Holi Color Powder Burst|Ledakan bubuk warna-warni festival Holi
Thanksgiving Autumn Harvest Leaves|Daun panen musim gugur emas jatuh hangat
Black Friday Sale Neon|Neon hitam-kuning dramatis untuk diskon besar|1
Cyber Monday Digital Deals|Grid digital biru neon & kilatan promo
Double Eleven Mega Sale Burst|Ledakan promo belanja angka kembar|1
Christmas Snowfall Lights|Salju turun, lampu natal & bokeh hangat|1
Christmas Tree Golden Ornaments|Pohon natal berkilau & ornamen emas|1
Reindeer Sleigh Starry Night|Kereta rusa melintas langit berbintang
Hanukkah Menorah Candle Glow|Nyala lilin menorah hangat & bintang biru
Rainbow Pride Waves|Gelombang pelangi lembut inklusif
Carnival Samba Feathers Confetti|Bulu warna-warni & konfeti karnaval
Mid Autumn Lantern Moon Festival|Bulan purnama & lentera festival|1`),
  ],
  [
    'religious',
    'Religi & Event Nusantara',
    parseTpl(`Ramadan Kareem Crescent Lanterns|Bulan sabit emas, lentera & bintang|1
Ramadan Mubarak Mosque Silhouette|Siluet masjid senja & lampion hangat|1
Eid Mubarak Golden Fireworks|Kembang api emas & ornamen islami|1
Eid Al Fitr Ketupat Greeting|Ketupat, bintang & pola geometris islami|1
Eid Al Adha Crescent Stars|Bulan sabit & bintang bersinar tenang
Islamic New Year Muharram Glow|Pola arabesque & cahaya bulan sabit
Mawlid Gold Arabesque Light|Arabesque emas & cahaya lembut
Isra Miraj Night Journey Stars|Langit malam berbintang & jalur cahaya
Nuzulul Quran Light Rays|Sinar cahaya turun ke buku bercahaya
Islamic Geometric Pattern Loop|Pola geometris islami berputar mulus|1
Mosque Dome Moonlight Night|Kubah masjid & bulan purnama berawan
Takbiran Night City Lights|Bokeh lampu kota malam takbiran
Mudik Highway Night Lights|Jejak lampu mobil mudik di jalan malam
Indonesian Independence Red White Particles|Partikel merah-putih & kembang api 17 Agustus|1
Batik Pattern Flow Loop|Motif batik mengalir elegan berulang|1
Kartini Day Floral Elegant|Bunga kebaya lembut & pita pastel
Nyepi Lantern Silhouette Night|Siluet lampion & bulan malam hening
Galungan Penjor Golden Light|Penjor emas & cahaya janur hangat
Vesak Waisak Floating Lanterns|Lentera terbang & teratai bercahaya|1
Lotus Zen Meditation Glow|Teratai & riak air tenang
Good Friday Easter Cross Sunrise|Siluet salib dengan fajar lembut
Christmas Nativity Star Glow|Bintang natal bersinar di langit malam`),
  ],
];

export const PROMPT_CATEGORIES: CategoryItem[] = (() => {
  const list: CategoryItem[] = BASE_CATS.map(([id, label, items]) => {
    const merged = [...items, ...(EXTRA_MAP[id] ? parseTpl(EXTRA_MAP[id]) : [])];
    const seen = new Set<string>();
    const unique = merged
      .filter((t) => {
        const k = t[0].toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 30);
    return [id, label, unique];
  });
  list.splice(1, 0, ...NEW_CATS);
  return list;
})();

export const TYPO_STYLES: Array<[string, string, string]> = [
  ['neon', 'Neon Glow Sign', 'tabung neon: strokeText tebal + shadowBlur berlapis warna cyan/magenta, denyut cahaya lembut dengan Math.sin (tanpa flicker acak)'],
  ['gold', 'Metallic Gold Foil', 'gradient emas (linear, 4-5 stop) dengan kilau highlight diagonal yang menyapu teks berulang mulus'],
  ['chrome', 'Chrome Liquid Metal', 'gradient perak-biru dengan pita refleksi horizontal yang bergerak, tepi tipis terang'],
  ['glass', 'Glassmorphism Frosted', 'panel kaca rounded semi-transparan dengan border highlight tipis, teks putih bersih di atasnya'],
  ['extrude', '3D Extruded Block', 'kedalaman 3D dengan menumpuk fillText bergeser bertahap, goyangan parallax halus'],
  ['isometric', 'Isometric 3D Letters', 'huruf isometrik: setTransform skew/rotate 30 derajat, sisi atas dan samping beda tone'],
  ['kinetic', 'Kinetic Word Slide', 'kata masuk bergantian dari sisi dengan clip mask per baris, easing halus, lalu keluar untuk loop'],
  ['letters', 'Letter By Letter Reveal', 'huruf muncul satu per satu (fade + scale + naik) dengan jeda tetap, tahan, lalu keluar seamless'],
  ['glitch', 'Glitch RGB Split', 'duplikat merah/cyan bergeser kecil dan irisan horizontal deterministik pada interval tetap'],
  ['typewriter', 'Typewriter Cursor', 'font monospace, karakter muncul berurutan dengan kursor berkedip berbasis sin, lalu terhapus'],
  ['outline', 'Outline Stroke Draw', 'strokeText dengan setLineDash animasi menggambar kontur, lalu fill memudar masuk'],
  ['gradientflow', 'Gradient Flow Text', 'gradient warna modern yang mengalir horizontal melewati teks, loop mulus'],
  ['cinematic', 'Cinematic Trailer Serif', 'serif lebar dengan letter-spacing besar, fade + zoom sangat lambat, garis cahaya tipis di bawah'],
  ['minimal', 'Minimalist Clean Sans', 'sans-serif tipis, spasi lega, naik halus dari balik mask, aksen garis kecil'],
  ['impact', 'Bold Impact Poster', 'uppercase tebal padat (Impact/Arial Black), blok warna solid di belakang, reveal mask tegas'],
  ['synthwave', 'Retro Synthwave Chrome', 'gradient pink-oranye-cyan, potongan garis horizontal, glow ungu dan garis grid halus'],
  ['stamp', 'Retro Vintage Stamp', 'teks ganda dengan outline kasar, bayangan offset, sedikit rotasi dan tekstur titik deterministik'],
  ['script', 'Elegant Handwriting Script', 'font script (Brush Script MT, cursive), terungkap dengan clip wipe kiri ke kanan, kilau kecil'],
  ['papercut', 'Paper Cut Layered', 'lapisan teks berwarna bertumpuk dengan offset dan bayangan lembut seperti kertas dipotong'],
  ['hologram', 'Hologram Scanline', 'cyan transparan dengan garis scan bergerak dan shimmer halus, glow tipis'],
  ['particles', 'Particle Dissolve Text', 'teks dibentuk partikel: sampel piksel dari offscreen canvas (grid jarang), posisi seed deterministik, berkumpul lalu menyebar'],
  ['wave', 'Liquid Wave Text', 'teks dipotong kolom tipis dengan offset vertikal Math.sin sehingga bergelombang seperti cairan'],
  ['embers', 'Embers Glow Text', 'gradient hangat merah-oranye-kuning dengan glow dan percikan bara kecil naik (seed deterministik)'],
  ['frost', 'Ice Frost Crystal', 'gradient biru es pucat, tepi bersinar, kilau bintang kecil berkedip halus'],
  ['blurfocus', 'Blur Focus Pull', 'teks masuk dari kabur ke tajam memakai shadowBlur/alpha berlapis (jangan pakai ctx.filter), lalu keluar'],
  ['parallax', 'Floating Words Parallax', 'beberapa kata di layer kedalaman berbeda melayang pelan dengan kecepatan dan ukuran berbeda'],
  ['splitreveal', 'Split Panel Reveal', 'dua panel warna bergeser membuka teks di tengah, lalu menutup kembali untuk loop'],
  ['cylinder', 'Rotating 3D Cylinder Text', 'huruf di permukaan silinder (proyeksi cos/sin) berputar seamless, huruf belakang diredupkan'],
  ['marquee', 'Marquee Ticker Scroll', 'teks bergulir horizontal tanpa putus (diulang), kecepatan konstan dan loop sempurna'],
  ['elastic', 'Elastic Bounce Pop', 'huruf muncul dengan skala elastis (overshoot) bergantian, lalu menyusut keluar mulus'],
];

export const VISUAL_STYLE_GROUPS: Array<[string, Array<[string, string]>]> = [
  [
    'Otomatis',
    [['Otomatis (AI memilih gaya terbaik)', 'pilih SATU gaya visual paling komersial dan paling cocok dengan tema, terapkan konsisten di semua elemen dengan detail premium']],
  ],
  [
    'Vector & Flat',
    [
      ['Flat Vector', 'bentuk solid tanpa outline, palet 5-7 warna harmonis, sudut rapi, bayangan datar lembut, komposisi seimbang dengan banyak lapisan objek'],
      ['Flat Gradient Modern', 'bentuk flat dengan gradasi linear halus (createLinearGradient), bayangan lembut, palet cerah modern, kedalaman dari lapisan tumpang tindih'],
      ['Isometric 3D', 'proyeksi isometrik 30 derajat, sisi atas-kiri-kanan dengan 3 tingkat kecerahan, bayangan jatuh konsisten, objek bergerak naik-turun halus'],
      ['Line Art Minimalis', 'garis tipis seragam (lineWidth proporsional minSide), tanpa isi atau isi sangat tipis, lineCap round, animasi menggambar garis (stroke progres) dan aksen satu warna'],
      ['Duotone Minimalis', 'hanya dua warna dominan plus turunan transparansi, kontras tinggi, bentuk geometris bersih, ruang kosong yang disengaja'],
      ['Memphis Geometric', 'bentuk geometris playful (lingkaran, zigzag, titik, segitiga), warna pop kontras, pola berulang, gerakan memantul ritmis'],
      ['Paper Cut Layered', 'lapisan kertas bertumpuk dengan bayangan lembut antar lapisan (shadowBlur), tepi bergelombang, efek kedalaman paralaks halus'],
      ['Low Poly Geometric', 'mesh segitiga dengan shading flat per-facet, titik mesh bergerak halus, gradasi warna antar facet, tepi tajam'],
      ['Material Design Shadow', 'kartu dan bentuk dengan elevasi bertingkat, bayangan lembut berlapis, warna primer cerah, transisi ease-in-out halus'],
    ],
  ],
  [
    'Neon & Futuristik',
    [
      ['Neon Cyber Glow', 'garis dan bentuk neon dengan shadowBlur berlapis, globalCompositeOperation lighter, palet cyan magenta ungu di latar gelap, pendar halus berdenyut'],
      ['Synthwave Retrowave', 'matahari gradasi oranye-pink dengan garis horizontal, grid perspektif bergerak, gunung siluet, palet ungu-pink-cyan era 80an'],
      ['Holographic Iridescent', 'gradasi pelangi metalik bergeser (hue berputar), kilap iridescent, tepi berpendar, kesan hologram lembut dan mewah'],
      ['HUD Futuristic UI', 'elemen antarmuka sci-fi: cincin berputar, busur, tick mark, garis scan, angka dan grid tipis, warna cyan atau oranye di latar gelap'],
      ['Glitch Digital', 'pergeseran kanal RGB, potongan horizontal bergeser, scanline, noise deterministik; glitch singkat berirama dan tetap rapi'],
      ['Data Particle Network', 'ribuan partikel dengan garis penghubung berdasarkan jarak, jaringan titik bergerak organik, kedalaman lewat ukuran dan opasitas'],
      ['Wireframe Hologram', 'objek 3D kerangka garis (proyeksi perspektif manual), rotasi halus, garis cyan transparan dengan pendar, grid lantai tipis'],
    ],
  ],
  [
    'Glass, Soft & Gradient',
    [
      ['Glassmorphism', 'panel kaca semi-transparan dengan blur latar tiruan, tepi highlight tipis, gradasi lembut di belakang, bayangan halus, sudut membulat'],
      ['Neumorphism Soft', 'bentuk timbul lembut dengan dua bayangan (terang dan gelap), satu warna dasar monokrom, tanpa kontras keras, kesan tactile'],
      ['Gradient Mesh Modern', 'blob gradasi radial besar yang bergerak lambat dan menyatu, warna halus berpadu, tekstur noise tipis untuk kesan premium'],
      ['Aurora Gradient Flow', 'pita cahaya bergelombang ala aurora, gradasi hijau-cyan-ungu, gerakan sinus berlapis, blur lembut dan pendar'],
      ['Liquid Fluid Metaball', 'bola cairan yang menyatu dan terpisah (metaball), tepi mulus, gradasi mengkilap, gerakan elastis organik'],
      ['Pastel Soft Dreamy', 'palet pastel lembut, bentuk membulat, gradasi halus, partikel kecil melayang, suasana tenang dan hangat'],
      ['Bokeh Light Orbs', 'lingkaran cahaya besar-kecil dengan blur, opasitas bervariasi, melayang pelan, warna hangat atau dingin, kedalaman lapangan tiruan'],
    ],
  ],
  [
    'Luxury & Realistis',
    [
      ['Dark Luxury Gold', 'latar gelap pekat dengan aksen emas metalik (gradasi emas multi-stop), kilau sparkle halus, tipografi elegan, kesan eksklusif'],
      ['Metallic Chrome', 'permukaan krom dengan gradasi tajam dan pantulan tiruan, highlight putih kontras, bayangan dalam, kilau bergerak melintas'],
      ['Realistic 3D Render', 'shading realistis: sumber cahaya jelas, diffuse plus specular, bayangan lembut, ambient occlusion tiruan, pantulan halus'],
      ['Crystal Gemstone Facets', 'permata dengan facet geometris, refleksi warna bergeser, kilau bintang, highlight tajam, rotasi lambat berkilau'],
      ['Marble Gold Elegant', 'tekstur marmer prosedural (noise deterministik) dengan urat emas tipis, kilau halus, komposisi elegan simetris'],
      ['Cinematic Volumetric Light', 'berkas cahaya volumetrik (god rays), debu halus melayang di cahaya, kontras sinematik, vignette lembut, color grading teal-orange'],
      ['Glowing Particles Cinematic', 'partikel bercahaya dengan jejak (trail), aliran gerak lembut, kedalaman bertingkat, pendar hangat dan sinematik'],
    ],
  ],
  [
    'Artistik & Retro',
    [
      ['Watercolor Ink Wash', 'noda cat air transparan berlapis, tepi lembut menyebar, tekstur kertas halus, warna mengalir dan berbaur pelan'],
      ['Cartoon Outline Bold', 'outline tebal gelap, warna cerah solid, bentuk ekspresif dan membulat, gerakan squash and stretch ceria'],
      ['Retro Vintage Grain', 'palet hangat pudar, grain film deterministik, vignette, garis halus, tipografi retro, kesan analog era lama'],
      ['Pixel Art Retro', 'piksel besar tegas tanpa smoothing (imageSmoothingEnabled=false), palet terbatas 16 warna, animasi sprite bergaya game retro'],
      ['Doodle Hand-drawn', 'garis tangan tidak sempurna namun rapi, coretan, bintang, panah, warna marker cerah, animasi menggambar bergantian'],
      ['Abstract Geometric Art', 'komposisi bentuk geometris abstrak berlapis, garis, busur dan lingkaran, palet terkurasi, ritme gerak harmonis bergaya poster modern'],
      ['Kaleidoscope Mandala', 'simetri radial 8-16 sumbu, pola berulang berputar, gradasi warna kaya, transisi halus dan hipnotis'],
      ['Cosmic Galaxy Space', 'nebula berlapis gradasi, bintang berkelip, galaksi spiral berputar pelan, planet dan cincin, warna ungu-biru-pink kaya'],
      ['Organic Blob Shapes', 'bentuk organik hasil noise halus, tepi mulus, warna gradasi lembut, morphing perlahan dan berulang mulus'],
      ['Stained Glass Mosaic', 'potongan kaca berwarna dengan garis timah gelap, cahaya menembus, kilau bergeser, pola mosaik rapi'],
      ['Ink Brush Oriental', 'sapuan tinta kuas dengan ketebalan bervariasi, percikan, ruang negatif luas, palet hitam plus satu aksen merah, komposisi tenang'],
    ],
  ],
];

export const VISUAL_STYLES_FLAT = VISUAL_STYLE_GROUPS.reduce<Array<[string, string]>>(
  (acc, group) => acc.concat(group[1]),
  []
);

function typoRules(id: string): string {
  const found = TYPO_STYLES.find((x) => x[0] === id);
  const base = [
    'ATURAN TIPOGRAFI (WAJIB):',
    '- Gambar teks hanya dengan Canvas (ctx.fillText/strokeText); jangan pakai CDN, @font-face, atau file font luar. Gunakan font sistem aman: Arial, Helvetica, Georgia, "Times New Roman", Impact, "Courier New", system-ui, "Brush Script MT".',
    '- Ukuran font proporsional (minSide) dan wajib diukur dengan ctx.measureText agar lebar teks maksimal 80% w; textAlign center dan textBaseline middle; tidak terpotong di tepi.',
    '- Teks harus kontras dan terbaca jelas; tidak ada teks bertumpuk atau flicker; semua gerak memakai t, loopT, dan sceneProgress dengan easing halus.',
    '- Animasi teks masuk, tahan, lalu keluar di dalam satu durasi sehingga akhir loop menyambung mulus ke awal.',
    "- Jika window.STUDIO_BG_MODE === 'transparent', jangan menggambar kotak/panel background selain efek teks itu sendiri.",
  ];
  if (found) {
    base.splice(1, 0, `- Gaya teks "${found[1]}": ${found[2]}.`);
  } else {
    base.splice(
      1,
      0,
      '- Pilih SATU gaya tipografi paling cocok dengan tema (neon, emas metalik, kaca, 3D, kinetic, dsb.) dan terapkan konsisten dengan detail premium.'
    );
  }
  return base.join('\n');
}

export function getPromptBgInstruction(bgStyle: string, customBgText: string, studioBgMode: string): string {
  const m: Record<string, string> = {
    sync:
      studioBgMode === 'code'
        ? "Gambar background premium sendiri di dalam kode (gradasi/tekstur, bukan kosong). Jika window.STUDIO_BG_MODE === 'transparent' atau 'solid', JANGAN menggambar background, bersihkan dengan ctx.clearRect(0,0,w,h) dan gambar objek saja."
        : studioBgMode === 'transparent'
          ? 'Background TRANSPARAN (alpha): JANGAN menggambar background apa pun, hanya objek di atas kanvas kosong.'
          : 'JANGAN menggambar background (studio mengisi warna solid), gambar objek saja.',
    dark_cinematic: "Background hitam pekat sinematik (#04070e). Hormati jika STUDIO_BG_MODE === 'transparent'.",
    deep_navy: 'Background biru navy tua gradasi (#0f203d ke #050a14).',
    clean_white: 'Background putih bersih cerah (#f8fafc ke #e2e8f0).',
    gradient_modern: 'Background gradasi halus modern bergerak lembut.',
    transparent: 'WAJIB TRANSPARAN ALPHA: JANGAN gambar background solid, bersihkan dengan ctx.clearRect(0,0,w,h).',
    greenscreen: 'Background Green Screen solid (#00FF00).',
    custom: `Background khusus: "${customBgText.trim() || 'Gradasi gelap halus'}".`,
  };
  return m[bgStyle] || m.sync;
}

export function generateAiPromptText(cfg: PromptConfig, studio: StudioSettings): { prompt: string; title: string } {
  let ttl = '';
  let tema = '';
  if (cfg.inputMode === 'manual') {
    ttl = cfg.manualTitle.trim() || 'Animasi Motion Custom';
    const d = cfg.manualDesc.trim();
    tema = d ? `${ttl} — ${d}` : ttl;
  } else {
    const cat = PROMPT_CATEGORIES.find((x) => x[0] === cfg.catId) || PROMPT_CATEGORIES[0];
    const it = cat[2][cfg.tplIndex] || cat[2][0];
    ttl = it[0];
    tema = `${it[0]} — ${it[1]}`;
  }

  const sc = Math.max(1, Math.min(5, cfg.sceneCount || 1));
  const txt = cfg.textOverlay.trim();
  const ty = cfg.typoStyle || 'auto';
  const gv = cfg.colorStyle || 'Flat Vector';
  const bg = getPromptBgInstruction(cfg.bgStyle, cfg.customBgText, studio.bgMode);
  const vsInfo = VISUAL_STYLES_FLAT.find((x) => x[0] === gv);
  const RL = ({ '720p': 'HD (1280×720)', '1080p': 'FHD (Full HD)', '2K': '2K (QHD)', '4K': '4K (Ultra HD)' } as Record<string, string>)[studio.res] || studio.res;
  const qNote =
    (
      {
        '720p': 'Pertahankan komposisi sederhana namun bersih; detail halus tidak perlu terlalu rapat.',
        '1080p': 'Pakai detail seimbang: tepi tajam, gradasi halus tanpa banding.',
        '2K': 'Tambahkan detail halus berlapis (tekstur, highlight, partikel) agar tetap tajam di layar besar.',
        '4K': 'Wajib detail tinggi: tekstur halus, tepi anti-alias bersih, gradasi tanpa banding, ketebalan garis dan efek proporsional minSide agar terlihat premium saat di-zoom.',
      } as Record<string, string>
    )[studio.res] || '';

  const fNote =
    studio.fps >= 60
      ? 'Gerakan harus sangat mulus: gunakan easing kontinu, hindari lompatan posisi, semua gerak berbasis t (bukan hitungan frame).'
      : studio.fps <= 24
        ? 'Gaya sinematik 24 fps: gerakan ritmis dan tegas, hindari gerakan terlalu cepat yang terlihat patah.'
        : 'Gerakan halus dan stabil di 30 fps, hindari perubahan kecepatan mendadak.';

  const sceneRule =
    sc === 1
      ? 'Jika jumlah scene hanya 1, jangan memaksa pergantian scene. Buat satu visual utama yang tetap hidup sepanjang durasi.'
      : 'Setiap scene harus punya visual berbeda dengan transisi halus antar scene, dan scene terakhir harus menyambung mulus ke scene pertama (seamless).';

  const typoChosen = TYPO_STYLES.find((x) => x[0] === ty);

  const lines = [
    'Kamu adalah Motion Graphics Designer profesional dan JavaScript Canvas API Developer untuk video microstock premium.',
    '',
    'Buat 5 konsep video berbeda berdasarkan pengaturan berikut:',
    '',
    `Tema: ${tema}`,
    txt
      ? `Teks di video: ${txt}`
      : ty !== 'auto'
        ? 'Teks di video: buat 1 teks singkat bahasa Inggris (maks 3 kata) yang relevan dengan tema'
        : null,
    ty !== 'auto' ? `Gaya Teks: ${typoChosen ? typoChosen[1] : 'Otomatis'}` : null,
    `Durasi: ${studio.duration} detik`,
    `Jumlah Scene: ${sc}`,
    `Gaya Visual: ${gv}`,
    vsInfo ? `Detail Gaya Visual: ${vsInfo[1]}` : null,
    `Rasio: ${studio.ratio}`,
    `Resolusi: ${RL} (${studio.width}×${studio.height})`,
    `Frame Rate: ${studio.fps} fps`,
    cfg.customNote.trim() ? `Catatan: ${cfg.customNote.trim()}` : null,
    '',
    'Setiap konsep wajib berisi:',
    '- Judul',
    '- Ringkasan visual',
    '- Struktur scene',
    '- Gaya motion',
    '- Nilai jual microstock',
    '',
    'Aturan konsep:',
    '- Semua konsep harus berbeda.',
    '- Visual harus premium, modern, komersial, dan layak untuk Shutterstock, Adobe Stock, Pond5, Storyblocks, dan Vecteezy.',
    '- Hindari visual terlalu sederhana, kosong, terlalu flat, atau hanya 1 objek tanpa detail.',
    '- Semua konsep harus realistis dibuat menggunakan Canvas API.',
    '- Jangan gunakan logo, brand, karakter berlisensi, atau asset eksternal.',
    vsInfo && gv !== VISUAL_STYLE_GROUPS[0][1][0][0]
      ? `- Terapkan gaya "${gv}" secara konsisten di semua scene: ${vsInfo[1]}.`
      : `- ${vsInfo ? vsInfo[1] : ''}`,
    `- Kualitas ${RL}: ${qNote}`,
    `- Frame rate ${studio.fps} fps: ${fNote}`,
    '',
    'Setelah memberi 5 konsep, tunggu saya memilih nomor.',
    '',
    'Jika saya mengetik “Nomor 1”, “Nomor 2”, dan seterusnya, langsung buat 1 file HTML lengkap (<!DOCTYPE html> ... </html>) berisi animasi HTML5 Canvas 2D berdasarkan konsep tersebut.',
    '',
    'KETENTUAN WAJIB KODE HTML:',
    '1. Pure HTML5 + CSS + Vanilla JS Canvas 2D dalam 1 file utuh tanpa CDN, library luar, atau asset eksternal.',
    '2. Isi <title> sesuai judul konsep yang dipilih (bahasa Inggris, deskriptif tentang visualnya, maks 60 karakter). DILARANG memuat nama studio, website, aplikasi, tools, atau brand apa pun di <title>, komentar, teks canvas, nama variabel, maupun meta.',
    '3. Satu elemen <canvas id="canvas"></canvas> penuh layar (margin:0;overflow:hidden;width:100vw;height:100vh;display:block;).',
    "4. const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d'); const w=canvas.width=window.STUDIO_WIDTH||window.innerWidth; const h=canvas.height=window.STUDIO_HEIGHT||window.innerHeight; const minSide=Math.min(w,h); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';",
    '5. Semua ukuran elemen harus proporsional memakai w, h, dan minSide agar tajam di FHD, 2K, dan 4K.',
    '6. Sinkron waktu (WAJIB dihitung ULANG di dalam fungsi draw() yang dipanggil tiap requestAnimationFrame, bukan sekali di luar loop):',
    `const duration = window.STUDIO_DURATION || ${studio.duration};`,
    "const t = (typeof window.STUDIO_TIME === 'number') ? window.STUDIO_TIME : (performance.now() / 1000);",
    `const sceneCount = ${sc};`,
    'const loopT = t % duration;',
    'const sceneDuration = duration / sceneCount;',
    'const currentScene = Math.floor(loopT / sceneDuration);',
    'const sceneProgress = (loopT % sceneDuration) / sceneDuration;',
    'const progress = loopT / duration;',
    '7. Parameter t sudah dalam satuan DETIK. Dilarang: t = time * 0.001, t / 1000, Date.now(). performance.now() hanya boleh sebagai fallback seperti di atas.',
    '8. Semua animasi harus memakai t, loopT, currentScene, dan sceneProgress.',
    `9. ${sceneRule}`,
    '10. Loop harus 100% seamless (berbasis progress 0..1 dengan Math.sin/Math.cos/modulo) dan animasi tetap bergerak dari awal sampai akhir durasi.',
    '11. ANTI-NOISE: dilarang memakai Math.random() di dalam loop render (pakai seed deterministik). Hindari flicker, objek terpotong, teks bertumpuk, dan gerakan patah. Tanpa watermark/FPS counter.',
    '12. Visual harus premium, rapi, tajam, dan optimal di browser. Loop animasi wajib memakai requestAnimationFrame(draw) (bukan setInterval/setTimeout) dan hanya satu <canvas>.',
    bg ? `13. BACKGROUND: ${bg}` : null,
    `${bg ? 14 : 13}. METADATA STOCK (WAJIB): di dalam <head> sertakan TEPAT 4 tag meta berikut. Metadata harus ORIGINAL dan dibuat dari kode HTML/animasi yang kamu tulis sendiri: deskripsikan hanya apa yang benar-benar tampil di video (bentuk, objek, warna, efek, gerakan, teks yang digambar). Jangan memasukkan elemen, warna, atau tema yang tidak ada di animasi. Bahasa Inggris, tanpa tanda kutip ganda di dalam isinya. DILARANG menyebut nama studio, website, aplikasi, tools, atau brand apa pun. <meta name="stock-title" content="maks 150 karakter, deskriptif sesuai visual (objek, warna, gerakan), tanpa koma atau simbol"> <meta name="stock-description" content="1-2 kalimat, maks 200 karakter, menjelaskan isi visual video"> <meta name="stock-keywords" content="tepat 50 keyword dipisah koma, urut dari terpenting, semuanya relevan dengan visual di animasi, tanpa duplikat dan tanpa brand"> <meta name="stock-category" content="pilih salah satu: ${ADOBE_CATS.map((c) => c[1]).join(' | ')}">`,
    '',
    txt || ty !== 'auto' ? typoRules(ty) : null,
    txt || ty !== 'auto' ? '' : null,
    'Saat membuat kode, jangan beri penjelasan. Berikan HANYA kode HTML lengkap dalam 1 blok kode siap copy.',
  ]
    .filter((x) => x !== null)
    .join('\n');

  return { prompt: lines, title: ttl };
}
