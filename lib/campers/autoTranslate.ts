import {
  CamperCardPill,
  CamperCardSummarySpec,
  CamperFeatureItem,
} from './camperCatalog'

export type TranslatableLocale = 'en' | 'fr' | 'de'

export interface CamperTranslatablePayload {
  tagline: string
  summarySpecs: CamperCardSummarySpec[]
  pills: CamperCardPill[]
  wizardHighlights: string[]
  galleryTags: string[]
  inlineDescImageAlt: string
  descriptionText: string
  features: CamperFeatureItem[]
  technicalFeatures: CamperFeatureItem[]
  includedItems: string[]
}

const PHRASE_DICTIONARY: Array<{
  es: RegExp
  en: string
  fr: string
  de: string
}> = [
    {
      es: /Más espacio, más comodidad y una experiencia pensada para viajar sin límites\./gi,
      en: 'More space, more comfort, and an experience designed for limitless travel.',
      fr: 'Plus d’espace, plus de confort et une expérience pensée pour voyager sans limites.',
      de: 'Mehr Platz, mehr Komfort und ein Erlebnis für grenzenloses Reisen.',
    },
    {
      es: /La camper perfecta para quienes buscan equilibrio entre confort, autonomía y libertad\./gi,
      en: 'The perfect campervan for those seeking a balance of comfort, autonomy, and freedom.',
      fr: 'Le van aménagé parfait pour ceux qui recherchent l’équilibre entre confort, autonomie et liberté.',
      de: 'Der perfekte Camper für alle, die das Gleichgewicht zwischen Komfort, Autonomie und Freiheit suchen.',
    },
    {
      es: /Plazas de viaje:\s*(\d+)/gi,
      en: 'Travel seats: $1',
      fr: 'Places route : $1',
      de: 'Sitzplätze: $1',
    },
    {
      es: /Plazas para dormir:\s*(\d+)/gi,
      en: 'Sleeping berths: $1',
      fr: 'Couchages : $1',
      de: 'Schlafplätze: $1',
    },
    {
      es: /(\d+)\s*Plazas viaje\s*\/\s*(\d+)\s*dormir/gi,
      en: '$1 Travel seats / $2 sleeping',
      fr: '$1 Places route / $2 couchages',
      de: '$1 Sitzplätze / $2 Schlafplätze',
    },
    {
      es: /Cocina \+ nevera 86L/gi,
      en: 'Kitchen + 86L fridge',
      fr: 'Cuisine + frigo 86L',
      de: 'Küche + 86L Kühlschrank',
    },
    {
      es: /WC químico y ducha/gi,
      en: 'Chemical toilet & shower',
      fr: 'WC chimique et douche',
      de: 'Chemietoilette & Dusche',
    },
    {
      es: /Ducha interior \+ WC/gi,
      en: 'Indoor shower + WC',
      fr: 'Douche intérieure + WC',
      de: 'Innendusche + WC',
    },
    {
      es: /Gran autonomía:\s*baterías\s*(\d+)Ah\s*y\s*placas solares\s*(\d+)W/gi,
      en: 'High autonomy: $1Ah batteries & $2W solar panels',
      fr: 'Grande autonomie : batteries $1Ah et panneaux solaires $2W',
      de: 'Große Autonomie: $1Ah Batterien & $2W Solarmodule',
    },
    {
      es: /Sistema eléctrico Pro/gi,
      en: 'Pro Electrical System',
      fr: 'Système électrique Pro',
      de: 'Pro-Elektrosystem',
    },
    {
      es: /Sistema eléctrico/gi,
      en: 'Electrical system',
      fr: 'Système électrique',
      de: 'Elektrosystem',
    },
    {
      es: /Cama elevable \+ interbanco/gi,
      en: 'Drop-down bed + bench bed',
      fr: 'Lit pavillon + lit banquette',
      de: 'Hubbett + Sitzbankbett',
    },
    {
      es: /Cama elevable \+ cama interbanco/gi,
      en: 'Drop-down bed + bench bed',
      fr: 'Lit pavillon + lit banquette',
      de: 'Hubbett + Sitzbankbett',
    },
    {
      es: /Elevable \+ interbanco/gi,
      en: 'Drop-down + bench bed',
      fr: 'Lit pavillon + banquette',
      de: 'Hubbett + Bankbett',
    },
    {
      es: /Cama doble fija \+ auxiliar/gi,
      en: 'Fixed double bed + auxiliary',
      fr: 'Lit double fixe + appoint',
      de: 'Festes Doppelbett + Zusatzbett',
    },
    {
      es: /Doble fija \+ auxiliar/gi,
      en: 'Fixed double + auxiliary',
      fr: 'Double fixe + appoint',
      de: 'Festes Doppelbett + Zusatz',
    },
    {
      es: /Plazas de viaje/gi,
      en: 'Travel seats',
      fr: 'Places carte grise',
      de: 'Sitzplätze',
    },
    {
      es: /Plazas para dormir/gi,
      en: 'Sleeping capacity',
      fr: 'Places couchage',
      de: 'Schlafplätze',
    },
    {
      es: /personas homologadas/gi,
      en: 'certified passengers',
      fr: 'personnes homologuées',
      de: 'zugelassene Personen',
    },
    {
      es: /personas en máximo confort/gi,
      en: 'people in maximum comfort',
      fr: 'personnes en confort maximal',
      de: 'Personen mit maximalem Komfort',
    },
    {
      es: /Tipo de cama/gi,
      en: 'Bed configuration',
      fr: 'Type de lit',
      de: 'Betttyp',
    },
    {
      es: /Cocina equipada/gi,
      en: 'Equipped kitchen',
      fr: 'Cuisine équipée',
      de: 'Ausgestattete Küche',
    },
    {
      es: /Nevera 86L y dos fogones a gas GLP/gi,
      en: '86L fridge and two LPG gas burners',
      fr: 'Frigo 86L et deux feux gaz GPL',
      de: '86L Kühlschrank und zwei LPG-Gaskocher',
    },
    {
      es: /Baño completo/gi,
      en: 'Full bathroom',
      fr: 'Salle de bain complète',
      de: 'Komplettes Badezimmer',
    },
    {
      es: /Ducha interior, WC químico\/portátil y ducha exterior/gi,
      en: 'Indoor shower, portable/chemical WC and outdoor shower',
      fr: 'Douche intérieure, WC chimique/portable et douche extérieure',
      de: 'Innendusche, Chemie-/Camping-WC und Außendusche',
    },
    {
      es: /Aire acondicionado/gi,
      en: 'Air conditioning',
      fr: 'Climatisation',
      de: 'Klimaanlage',
    },
    {
      es: /Calefacción y aislamiento/gi,
      en: 'Heating & insulation',
      fr: 'Chauffage et isolation',
      de: 'Heizung & Isolierung',
    },
    {
      es: /Calefacción diésel y aislamiento completo 360º/gi,
      en: 'Diesel heating and full 360° insulation',
      fr: 'Chauffage diesel et isolation complète 360°',
      de: 'Dieselheizung und 360°-Volldämmung',
    },
    {
      es: /Ventanas y luz/gi,
      en: 'Windows & lighting',
      fr: 'Fenêtres et luminosité',
      de: 'Fenster & Licht',
    },
    {
      es: /Claraboya panorámica, mosquiteras y oscurecedores/gi,
      en: 'Panoramic skylight, mosquito screens and blackout blinds',
      fr: 'Lanterneau panoramique, moustiquaires et occultants',
      de: 'Panoramadachfenster, Moskitonetze und Verdunkelung',
    },
    {
      es: /Longitud del vehículo/gi,
      en: 'Vehicle length',
      fr: 'Longueur du véhicule',
      de: 'Fahrzeuglänge',
    },
    {
      es: /Motor y cambio/gi,
      en: 'Engine & transmission',
      fr: 'Moteur et boîte',
      de: 'Motor & Getriebe',
    },
    {
      es: /Placas solares/gi,
      en: 'Solar panels',
      fr: 'Panneaux solaires',
      de: 'Solarmodule',
    },
    {
      es: /Inversor y cargador/gi,
      en: 'Inverter & charger',
      fr: 'Convertisseur et chargeur',
      de: 'Wechselrichter & Ladegerät',
    },
    {
      es: /Depósitos de agua/gi,
      en: 'Water tanks',
      fr: 'Réservoirs d’eau',
      de: 'Wassertanks',
    },
    {
      es: /Aguas limpias (\d+)L y aguas grises (\d+)L/gi,
      en: '$1L fresh water & $2L grey water',
      fr: 'Eaux propres $1L et eaux grises $2L',
      de: '$1L Frischwasser & $2L Grauwasser',
    },
    {
      es: /Gas GLP y seguridad/gi,
      en: 'LPG gas & safety',
      fr: 'Gaz GPL et sécurité',
      de: 'LPG-Gas & Sicherheit',
    },
    {
      es: /Seguridad en ruta/gi,
      en: 'Road safety',
      fr: 'Sécurité routière',
      de: 'Sicherheit unterwegs',
    },
    {
      es: /Rueda de repuesto y mini extintor/gi,
      en: 'Spare wheel and mini fire extinguisher',
      fr: 'Roue de secours et mini extincteur',
      de: 'Reserverad und Mini-Feuerlöscher',
    },
    {
      es: /Seguro a todo riesgo con asistencia en viaje/gi,
      en: 'Comprehensive insurance with roadside assistance',
      fr: 'Assurance tous risques avec assistance routière',
      de: 'Vollkaskoversicherung mit Pannenhilfe',
    },
    {
      es: /(\d+)\s*km al día incluidos/gi,
      en: '$1 km per day included',
      fr: '$1 km par jour inclus',
      de: '$1 km pro Tag inklusive',
    },
    {
      es: /Asistencia telefónica durante el viaje \(16 h\)/gi,
      en: 'Phone assistance during your trip (16h)',
      fr: 'Assistance téléphonique pendant le voyage (16h)',
      de: 'Telefonische Betreuung während der Reise (16 Std.)',
    },
    {
      es: /Almohadas, sábanas y toallas/gi,
      en: 'Pillows, bed linen and towels',
      fr: 'Oreillers, draps et serviettes',
      de: 'Kissen, Bettwäsche und Handtücher',
    },
    {
      es: /Menaje completo premium/gi,
      en: 'Complete premium kitchenware',
      fr: 'Vaisselle et ustensiles premium complets',
      de: 'Komplettes Premium-Küchengeschirr',
    },
    {
      es: /Dos sillas de camping para exterior/gi,
      en: 'Two outdoor camping chairs',
      fr: 'Deux chaises de camping d’extérieur',
      de: 'Zwei Outdoor-Campingstühle',
    },
    {
      es: /2 máscaras de snorkel/gi,
      en: '2 snorkel masks',
      fr: '2 masques de snorkeling',
      de: '2 Schnorchelmasken',
    },
    {
      es: /Set de limpieza/gi,
      en: 'Cleaning kit',
      fr: 'Kit de nettoyage',
      de: 'Reinigungsset',
    },
    {
      es: /Gastos de gestión/gi,
      en: 'Booking & handling fees',
      fr: 'Frais de dossier',
      de: 'Bearbeitungsgebühren',
    },
    {
      es: /fianza de/gi,
      en: 'deposit of',
      fr: 'caution de',
      de: 'Kaution von',
    },
    {
      es: /con opción Flex/gi,
      en: 'with Flex option',
      fr: 'avec option Flex',
      de: 'mit Flex-Option',
    },
    // Párrafos de descripción SPACE & NEO
    {
      es: /Máximo confort en una camper\. Gracias a su cama elevable, durante el día disfrutas de todo el espacio interior, como si estuvieras en una autocaravana… pero con la libertad de una camper\. Menos maletero\. Más calidad de vida en el día a día\. Camper diseñada para dos personas, primando el máximo confort en todo momento\./gi,
      en: 'Maximum comfort in a campervan. Thanks to its drop-down bed, during the day you enjoy all the interior space as if you were in a motorhome… but with the freedom of a campervan. Less trunk, more everyday quality of life. A campervan designed for two people, prioritizing maximum comfort at all times.',
      fr: 'Un confort maximal dans un van aménagé. Grâce à son lit pavillon, vous profitez toute la journée de tout l’espace intérieur comme dans un camping-car… mais avec la liberté d’un van. Moins de soute, plus de qualité de vie au quotidien. Un van conçu pour deux personnes, privilégiant le confort absolu à chaque instant.',
      de: 'Maximaler Komfort im Camper. Dank des Hubbetts genießen Sie tagsüber den gesamten Innenraum wie in einem Wohnmobil… aber mit der Freiheit eines Campervans. Weniger Stauraum, mehr Lebensqualität im Alltag. Entwickelt für zwei Personen mit höchstem Komfort zu jeder Zeit.',
    },
    {
      es: /Más espacio\. Más comodidad\. Más libertad\. La SPACE está diseñada para quienes quieren viajar sin renunciar a nada\. Una camper amplia, equipada y preparada para convertir cualquier destino en tu propio lugar\. Cocina completa, baño con ducha, climatización y un sistema eléctrico que te permite desconectar… sin dejar de tenerlo todo\./gi,
      en: 'More space. More comfort. More freedom. The SPACE is designed for those who want to travel without giving up anything. A spacious campervan, fully equipped and ready to turn any destination into your own place. Complete kitchen, bathroom with shower, air conditioning, and an electrical system that lets you disconnect… without missing a thing.',
      fr: 'Plus d’espace. Plus de confort. Plus de liberté. Le SPACE est conçu pour ceux qui veulent voyager sans rien sacrifier. Un van spacieux, équipé et prêt à transformer chaque destination en votre propre chez-vous. Cuisine complète, salle de bain avec douche, climatisation et système électrique pour déconnecter… sans rien perdre.',
      de: 'Mehr Platz. Mehr Komfort. Mehr Freiheit. Der SPACE ist für alle gemacht, die reisen möchten, ohne auf etwas zu verzichten. Ein geräumiger Camper, komplett ausgestattet und bereit, jedes Ziel in Ihr eigenes Zuhause zu verwandeln. Vollküche, Bad mit Dusche, Klimaanlage und ein Elektrosystem zum Abschalten… ohne auf etwas zu verzichten.',
    },
    {
      es: /Diseño en cada detalle: amplitud real con espacios abiertos que aportan libertad de movimiento; confort superior con cada zona pensada para disfrutar sin renunciar a nada; y funcionalidad total con todo organizado para un uso práctico y sencillo\. Perfecta para viajes largos, rutas sin prisa y planes que simplemente surgen\. Si la NEO es libertad, la SPACE es dar un paso más allá\./gi,
      en: 'Design in every detail: real spaciousness with open areas that give freedom of movement; superior comfort with every zone crafted to enjoy without compromise; and total functionality with everything organized for practical, effortless use. Perfect for long trips, unhurried routes, and spontaneous plans. If the NEO is freedom, the SPACE is taking it one step further.',
      fr: 'Le design dans chaque détail : une véritable amplitude avec des espaces ouverts offrant une grande liberté de mouvement ; un confort supérieur pensé pour profiter sans compromis ; et une fonctionnalité totale avec tout organisé pour un usage pratique et simple. Parfait pour les longs voyages, les itinéraires sans hâte et les plans improvisés. Si le NEO est la liberté, le SPACE va encore plus loin.',
      de: 'Design bis ins Detail: echte Großzügigkeit mit offenen Bereichen für maximale Bewegungsfreiheit; erstklassiger Komfort in jeder Zone; und volle Funktionalität, praktisch und einfach organisiert. Perfekt für lange Reisen, entspannte Routen und spontane Pläne. Wenn der NEO Freiheit bedeutet, geht der SPACE noch einen Schritt weiter.',
    },
    {
      es: /El corazón de la camper incorpora el sistema electrónico más avanzado: dos baterías de litio \(540Ah\), doble placa solar monocristalina \(400W\), inversor Multiplus 2\.000W Victron, centralita Cerbo GX, cargador de batería Orion XS 12\/12-50A y regulador SmartSolar MPPT 100\/30\./gi,
      en: 'At the heart of the campervan lies the most advanced electrical system: two lithium batteries (540Ah), twin monocrystalline solar panels (400W), Victron Multiplus 2,000W inverter, Cerbo GX control unit, Orion XS 12/12-50A battery charger, and SmartSolar MPPT 100/30 controller.',
      fr: 'Le cœur du van intègre le système électronique le plus avancé : deux batteries lithium (540Ah), double panneau solaire monocristallin (400W), convertisseur Victron Multiplus 2 000W, centrale Cerbo GX, chargeur Orion XS 12/12-50A et régulateur SmartSolar MPPT 100/30.',
      de: 'Das Herzstück des Campers bildet das modernste Elektroniksystem: zwei Lithiumbatterien (540Ah), doppelte monokristalline Solarmodule (400W), Victron Multiplus 2.000W Wechselrichter, Cerbo GX Zentrale, Orion XS 12/12-50A Ladegerät und SmartSolar MPPT 100/30 Regler.',
    },
    {
      es: /Esta camper es ideal para viajar en pareja, con amigos o en familia, ofreciendo una experiencia cómoda, práctica y totalmente autónoma\. Su distribución optimizada permite disfrutar de un amplio espacio interior y una gran capacidad de almacenaje, perfecta tanto para escapadas cortas como para rutas largas\. Con capacidad para viajar y dormir hasta 3 personas, cuenta con cama doble fija y una cama auxiliar adaptada, además de cocina totalmente equipada con nevera de 86L y dos fogones a gas GLP, baño completo con ducha interior y exterior y WC portátil\./gi,
      en: 'This campervan is ideal for traveling as a couple, with friends, or as a family, offering a comfortable, practical, and completely autonomous experience. Its optimized layout provides generous interior space and large storage capacity, perfect for both short getaways and long road trips. With seating and sleeping for up to 3 people, it features a fixed double bed and an adapted auxiliary bed, a fully equipped kitchen with an 86L fridge and two LPG gas burners, and a full bathroom with indoor/outdoor shower and portable WC.',
      fr: 'Ce van aménagé est idéal pour voyager en couple, entre amis ou en famille, offrant une expérience confortable, pratique et totalement autonome. Son agencement optimisé offre un bel espace intérieur et une grande capacité de rangement, parfait pour les courts séjours comme pour les longs trajets. Pouvant accueillir jusqu’à 3 personnes, il dispose d’un lit double fixe et d’un lit d’appoint, d’une cuisine équipée avec frigo 86L et deux feux GPL, ainsi que d’une salle de bain complète avec douche intérieure/extérieure et WC portable.',
      de: 'Dieser Camper ist ideal für Reisen zu zweit, mit Freunden oder der Familie und bietet ein komfortables, praktisches und völlig autarkes Erlebnis. Die optimierte Raumaufteilung bietet viel Innenraum und großen Stauraum – perfekt für Kurztrips wie auch lange Routen. Mit Platz für bis zu 3 Personen verfügt er über ein festes Doppelbett und ein Zusatzbett, eine voll ausgestattete Küche mit 86L-Kühlschrank und zwei LPG-Kochfeldern sowie ein komplettes Bad mit Innen-/Außendusche und tragbarem WC.',
    },
  ]

const WORD_DICTIONARY: Array<{
  es: RegExp
  en: string
  fr: string
  de: string
}> = [
    { es: /\bcocina\b/gi, en: 'kitchen', fr: 'cuisine', de: 'Küche' },
    { es: /\bnevera\b/gi, en: 'fridge', fr: 'réfrigérateur', de: 'Kühlschrank' },
    { es: /\bfrigorífico\b/gi, en: 'fridge', fr: 'réfrigérateur', de: 'Kühlschrank' },
    { es: /\bfogones\b/gi, en: 'burners', fr: 'feux', de: 'Kochfelder' },
    { es: /\bfogón\b/gi, en: 'burner', fr: 'feu', de: 'Kochfeld' },
    { es: /\bducha\b/gi, en: 'shower', fr: 'douche', de: 'Dusche' },
    { es: /\bbaño\b/gi, en: 'bathroom', fr: 'salle de bain', de: 'Badezimmer' },
    { es: /\bquímico\b/gi, en: 'chemical', fr: 'chimique', de: 'Chemie-' },
    { es: /\bportátil\b/gi, en: 'portable', fr: 'portable', de: 'tragbar' },
    { es: /\bcama\b/gi, en: 'bed', fr: 'lit', de: 'Bett' },
    { es: /\bcamas\b/gi, en: 'beds', fr: 'lits', de: 'Betten' },
    { es: /\bdoble\b/gi, en: 'double', fr: 'double', de: 'Doppel-' },
    { es: /\belevable\b/gi, en: 'drop-down', fr: 'pavillon', de: 'Hubbett' },
    { es: /\bfija\b/gi, en: 'fixed', fr: 'fixe', de: 'fest' },
    { es: /\bauxiliar\b/gi, en: 'auxiliary', fr: 'd’appoint', de: 'Zusatz-' },
    { es: /\bplazas\b/gi, en: 'seats', fr: 'places', de: 'Plätze' },
    { es: /\bviaje\b/gi, en: 'travel', fr: 'route', de: 'Reise' },
    { es: /\bdormir\b/gi, en: 'sleeping', fr: 'couchage', de: 'Schlafen' },
    { es: /\bcalefacción\b/gi, en: 'heating', fr: 'chauffage', de: 'Heizung' },
    { es: /\baislamiento\b/gi, en: 'insulation', fr: 'isolation', de: 'Isolierung' },
    { es: /\bclimatización\b/gi, en: 'air conditioning', fr: 'climatisation', de: 'Klimaanlage' },
    { es: /\bbatería\b/gi, en: 'battery', fr: 'batterie', de: 'Batterie' },
    { es: /\bbaterías\b/gi, en: 'batteries', fr: 'batteries', de: 'Batterien' },
    { es: /\blitio\b/gi, en: 'lithium', fr: 'lithium', de: 'Lithium' },
    { es: /\bplacas solares\b/gi, en: 'solar panels', fr: 'panneaux solaires', de: 'Solarmodule' },
    { es: /\bplaca solar\b/gi, en: 'solar panel', fr: 'panneau solaire', de: 'Solarmodul' },
    { es: /\bsolar\b/gi, en: 'solar', fr: 'solaire', de: 'Solar' },
    { es: /\binversor\b/gi, en: 'inverter', fr: 'convertisseur', de: 'Wechselrichter' },
    { es: /\bcargador\b/gi, en: 'charger', fr: 'chargeur', de: 'Ladegerät' },
    { es: /\bcentralita\b/gi, en: 'control panel', fr: 'centrale', de: 'Steuergerät' },
    { es: /\bautonomía\b/gi, en: 'autonomy', fr: 'autonomie', de: 'Autonomie' },
    { es: /\baguas limpias\b/gi, en: 'fresh water', fr: 'eaux propres', de: 'Frischwasser' },
    { es: /\baguas grises\b/gi, en: 'grey water', fr: 'eaux grises', de: 'Grauwasser' },
    { es: /\bdepósito\b/gi, en: 'tank', fr: 'réservoir', de: 'Tank' },
    { es: /\bdepósitos\b/gi, en: 'tanks', fr: 'réservoirs', de: 'Tanks' },
    { es: /\bagua caliente\b/gi, en: 'hot water', fr: 'eau chaude', de: 'Warmwasser' },
    { es: /\binterior\b/gi, en: 'indoor', fr: 'intérieur', de: 'Innen' },
    { es: /\bexterior\b/gi, en: 'outdoor', fr: 'extérieur', de: 'Außen' },
    { es: /\bsalón\b/gi, en: 'lounge', fr: 'salon', de: 'Wohnbereich' },
    { es: /\bcomedor\b/gi, en: 'dining area', fr: 'coin repas', de: 'Essbereich' },
    { es: /\bmaletero\b/gi, en: 'trunk', fr: 'coffre', de: 'Stauraum' },
    { es: /\blongitud\b/gi, en: 'length', fr: 'longueur', de: 'Länge' },
    { es: /\baltura\b/gi, en: 'height', fr: 'hauteur', de: 'Höhe' },
    { es: /\banchura\b/gi, en: 'width', fr: 'largeur', de: 'Breite' },
    { es: /\bmotor\b/gi, en: 'engine', fr: 'moteur', de: 'Motor' },
    { es: /\bdiésel\b/gi, en: 'diesel', fr: 'diesel', de: 'Diesel' },
    { es: /\bcambio manual\b/gi, en: 'manual transmission', fr: 'boîte manuelle', de: 'Schaltgetriebe' },
    { es: /\bvelocidades\b/gi, en: 'speeds', fr: 'vitesses', de: 'Gänge' },
    { es: /\bseguridad\b/gi, en: 'safety', fr: 'sécurité', de: 'Sicherheit' },
    { es: /\bfianza\b/gi, en: 'deposit', fr: 'caution', de: 'Kaution' },
    { es: /\bseguro\b/gi, en: 'insurance', fr: 'assurance', de: 'Versicherung' },
    { es: /\bincluido\b/gi, en: 'included', fr: 'inclus', de: 'inklusive' },
    { es: /\bincluidos\b/gi, en: 'included', fr: 'inclus', de: 'inklusive' },
    { es: /\bal día\b/gi, en: 'per day', fr: 'par jour', de: 'pro Tag' },
    { es: /\bpor día\b/gi, en: 'per day', fr: 'par jour', de: 'pro Tag' },
    { es: /\bcompleto\b/gi, en: 'complete', fr: 'complet', de: 'komplett' },
    { es: /\bcompleta\b/gi, en: 'complete', fr: 'complète', de: 'komplett' },
    { es: /\bequipada\b/gi, en: 'equipped', fr: 'équipée', de: 'ausgestattet' },
    { es: /\bequipado\b/gi, en: 'equipped', fr: 'équipé', de: 'ausgestattet' },
    { es: /\bgrande\b/gi, en: 'large', fr: 'grand', de: 'groß' },
    { es: /\bgran\b/gi, en: 'great', fr: 'grande', de: 'groß' },
    { es: /\bcon\b/gi, en: 'with', fr: 'avec', de: 'mit' },
    { es: /\bsin\b/gi, en: 'without', fr: 'sans', de: 'ohne' },
    { es: /\by\b/gi, en: 'and', fr: 'et', de: 'und' },
    { es: /\bo\b/gi, en: 'or', fr: 'ou', de: 'oder' },
    { es: /\bpara\b/gi, en: 'for', fr: 'pour', de: 'für' },
    { es: /\bpor\b/gi, en: 'for', fr: 'pour', de: 'für' },
    { es: /\bde\b/gi, en: 'of', fr: 'de', de: 'von' },
    { es: /\bdel\b/gi, en: 'of the', fr: 'du', de: 'des' },
    { es: /\ben\b/gi, en: 'in', fr: 'en', de: 'in' },
    { es: /\bdesde\b/gi, en: 'from', fr: 'depuis', de: 'ab' },
    { es: /\bhasta\b/gi, en: 'up to', fr: 'jusqu’à', de: 'bis' },
    { es: /\btodo\b/gi, en: 'all', fr: 'tout', de: 'alles' },
    { es: /\btodos\b/gi, en: 'all', fr: 'tous', de: 'alle' },
    { es: /\btoda\b/gi, en: 'all', fr: 'toute', de: 'alle' },
    { es: /\btodas\b/gi, en: 'all', fr: 'toutes', de: 'alle' },
    { es: /\bmás\b/gi, en: 'more', fr: 'plus', de: 'mehr' },
    { es: /\bmenos\b/gi, en: 'less', fr: 'moins', de: 'weniger' },
    { es: /\bmuy\b/gi, en: 'very', fr: 'très', de: 'sehr' },
    { es: /\bideal\b/gi, en: 'ideal', fr: 'idéal', de: 'ideal' },
    { es: /\bperfecta\b/gi, en: 'perfect', fr: 'parfaite', de: 'perfekt' },
    { es: /\bperfecto\b/gi, en: 'perfect', fr: 'parfait', de: 'perfekt' },
    { es: /\bviajar\b/gi, en: 'travel', fr: 'voyager', de: 'reisen' },
    { es: /\bviaje\b/gi, en: 'trip', fr: 'voyage', de: 'Reise' },
    { es: /\bviajes\b/gi, en: 'trips', fr: 'voyages', de: 'Reisen' },
    { es: /\bdisfrutar\b/gi, en: 'enjoy', fr: 'profiter', de: 'genießen' },
    { es: /\bdescubrir\b/gi, en: 'discover', fr: 'découvrir', de: 'entdecken' },
    { es: /\bescapada\b/gi, en: 'getaway', fr: 'escapade', de: 'Kurztrip' },
    { es: /\bescapadas\b/gi, en: 'getaways', fr: 'escapades', de: 'Kurztrips' },
    { es: /\bruta\b/gi, en: 'route', fr: 'itinéraire', de: 'Route' },
    { es: /\brutas\b/gi, en: 'routes', fr: 'itinéraires', de: 'Routen' },
    { es: /\blibertad\b/gi, en: 'freedom', fr: 'liberté', de: 'Freiheit' },
    { es: /\bcomodidad\b/gi, en: 'comfort', fr: 'confort', de: 'Komfort' },
    { es: /\bconfort\b/gi, en: 'comfort', fr: 'confort', de: 'Komfort' },
    { es: /\bespacio\b/gi, en: 'space', fr: 'espace', de: 'Platz' },
    { es: /\bamplio\b/gi, en: 'spacious', fr: 'spacieux', de: 'geräumig' },
    { es: /\bamplia\b/gi, en: 'spacious', fr: 'spacieuse', de: 'geräumig' },
    { es: /\bpráctico\b/gi, en: 'practical', fr: 'pratique', de: 'praktisch' },
    { es: /\bpráctica\b/gi, en: 'practical', fr: 'pratique', de: 'praktisch' },
    { es: /\bautónoma\b/gi, en: 'autonomous', fr: 'autonome', de: 'autark' },
    { es: /\bautónomo\b/gi, en: 'autonomous', fr: 'autonome', de: 'autark' },
    { es: /\bpareja\b/gi, en: 'couple', fr: 'couple', de: 'Paar' },
    { es: /\bamigos\b/gi, en: 'friends', fr: 'amis', de: 'Freunde' },
    { es: /\bfamilia\b/gi, en: 'family', fr: 'famille', de: 'Familie' },
    { es: /\bpersonas\b/gi, en: 'people', fr: 'personnes', de: 'Personen' },
    { es: /\bpersona\b/gi, en: 'person', fr: 'personne', de: 'Person' },
    { es: /\bnoche\b/gi, en: 'night', fr: 'nuit', de: 'Nacht' },
    { es: /\bnoches\b/gi, en: 'nights', fr: 'nuits', de: 'Nächte' },
    { es: /\bdía\b/gi, en: 'day', fr: 'jour', de: 'Tag' },
    { es: /\bdías\b/gi, en: 'days', fr: 'jours', de: 'Tage' },
    { es: /\bexperiencias\b/gi, en: 'experiences', fr: 'expériences', de: 'Erlebnisse' },
    { es: /\bexperiencia\b/gi, en: 'experience', fr: 'expérience', de: 'Erlebnis' },
    { es: /\bcalidad\b/gi, en: 'quality', fr: 'qualité', de: 'Qualität' },
    { es: /\bdiseño\b/gi, en: 'design', fr: 'design', de: 'Design' },
    { es: /\bvehículo\b/gi, en: 'vehicle', fr: 'véhicule', de: 'Fahrzeug' },
    { es: /\bfurgoneta\b/gi, en: 'van', fr: 'van', de: 'Campervan' },
    { es: /\bcamper\b/gi, en: 'campervan', fr: 'van aménagé', de: 'Camper' },
    { es: /\btiene\b/gi, en: 'has', fr: 'dispose de', de: 'hat' },
    { es: /\bcuenta con\b/gi, en: 'features', fr: 'est équipé de', de: 'verfügt über' },
    { es: /\bincluye\b/gi, en: 'includes', fr: 'inclut', de: 'beinhaltet' },
    { es: /\bofrece\b/gi, en: 'offers', fr: 'offre', de: 'bietet' },
    { es: /\bpermite\b/gi, en: 'allows', fr: 'permet', de: 'ermöglicht' },
    { es: /\bpreparada\b/gi, en: 'ready', fr: 'prête', de: 'bereit' },
    { es: /\bpreparado\b/gi, en: 'ready', fr: 'prêt', de: 'bereit' },
    { es: /\bnueva\b/gi, en: 'new', fr: 'nouvelle', de: 'neu' },
    { es: /\bnuevo\b/gi, en: 'new', fr: 'nouveau', de: 'neu' },
    { es: /\bmejor\b/gi, en: 'best', fr: 'meilleur', de: 'beste' },
    { es: /\bmáximo\b/gi, en: 'maximum', fr: 'maximal', de: 'maximal' },
    { es: /\bmáxima\b/gi, en: 'maximum', fr: 'maximale', de: 'maximal' },
    { es: /\búnica\b/gi, en: 'unique', fr: 'unique', de: 'einzigartig' },
    { es: /\búnico\b/gi, en: 'unique', fr: 'unique', de: 'einzigartig' },
  ]

function matchCase(source: string, replacement: string): string {
  if (!source) return replacement
  const first = source.charAt(0)
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}

export function translateTextOffline(text: string, targetLocale: TranslatableLocale): string {
  if (!text || !text.trim()) return text
  let result = text
  for (const entry of PHRASE_DICTIONARY) {
    result = result.replace(entry.es, entry[targetLocale])
  }
  for (const entry of WORD_DICTIONARY) {
    result = result.replace(entry.es, (matched) => matchCase(matched, entry[targetLocale]))
  }
  return result
}

async function translateSingleViaGoogle(
  text: string,
  targetLocale: TranslatableLocale
): Promise<string> {
  if (!text || !text.trim()) return text
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${encodeURIComponent(
      targetLocale
    )}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return translateTextOffline(text, targetLocale)
    const data = await res.json()
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const joined = data[0]
        .map((chunk: any) => (Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''))
        .join('')
      if (joined.trim()) return joined
    }
  } catch {
    // Fallback al diccionario local si falla la red
  }
  return translateTextOffline(text, targetLocale)
}

export async function translateCamperContent(
  source: CamperTranslatablePayload,
  targetLocale: TranslatableLocale
): Promise<CamperTranslatablePayload> {
  const [
    tagline,
    summaryTexts,
    pillLabels,
    wizardHighlights,
    galleryTags,
    inlineDescImageAlt,
    descriptionText,
    featureLabels,
    featureValues,
    techLabels,
    techValues,
    includedItems,
  ] = await Promise.all([
    translateSingleViaGoogle(source.tagline, targetLocale),
    Promise.all(source.summarySpecs.map(s => translateSingleViaGoogle(s.text, targetLocale))),
    Promise.all(source.pills.map(p => translateSingleViaGoogle(p.label, targetLocale))),
    Promise.all(source.wizardHighlights.map(h => translateSingleViaGoogle(h, targetLocale))),
    Promise.all(source.galleryTags.map(t => translateSingleViaGoogle(t, targetLocale))),
    translateSingleViaGoogle(source.inlineDescImageAlt, targetLocale),
    translateSingleViaGoogle(source.descriptionText, targetLocale),
    Promise.all(source.features.map(f => translateSingleViaGoogle(f.label, targetLocale))),
    Promise.all(source.features.map(f => translateSingleViaGoogle(f.value, targetLocale))),
    Promise.all(source.technicalFeatures.map(f => translateSingleViaGoogle(f.label, targetLocale))),
    Promise.all(source.technicalFeatures.map(f => translateSingleViaGoogle(f.value, targetLocale))),
    Promise.all(source.includedItems.map(i => translateSingleViaGoogle(i, targetLocale))),
  ])

  return {
      tagline,
      summarySpecs: source.summarySpecs.map((s, idx) => ({
        ...s,
        text: summaryTexts[idx] ?? s.text,
      })),
        pills: source.pills.map((p, idx) => ({
          ...p,
          label: pillLabels[idx] ?? p.label,
        })),
          wizardHighlights,
          galleryTags,
          inlineDescImageAlt,
          descriptionText,
          features: source.features.map((f, idx) => ({
            ...f,
            label: featureLabels[idx] ?? f.label,
            value: featureValues[idx] ?? f.value,
          })),
            technicalFeatures: source.technicalFeatures.map((f, idx) => ({
              ...f,
              label: techLabels[idx] ?? f.label,
              value: techValues[idx] ?? f.value,
            })),
            includedItems,
          }
}

