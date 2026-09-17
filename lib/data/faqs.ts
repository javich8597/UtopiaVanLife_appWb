export interface FAQCategory {
  id: string
  name_es: string
  name_en: string
  icon: string
}

export interface FAQItem {
  id: string
  categoryId: string
  categoryName_es: string
  categoryName_en: string
  question_es: string
  answer_es: string
  question_en: string
  answer_en: string
}

export const FAQ_CATEGORIES: FAQCategory[] = [
  { id: 'all', name_es: 'Todas las preguntas', name_en: 'All Questions', icon: 'HelpCircle' },
  { id: 'vehiculo', name_es: 'Características del Vehículo', name_en: 'Vehicle Features', icon: 'Truck' },
  { id: 'reserva', name_es: 'Experiencia y Reserva', name_en: 'Experience & Booking', icon: 'Calendar' },
  { id: 'seguro', name_es: 'Seguro y Tranquilidad', name_en: 'Insurance & Coverage', icon: 'ShieldCheck' },
  { id: 'uso', name_es: 'Uso del Vehículo', name_en: 'Driving & Roads', icon: 'Compass' },
  { id: 'fianza', name_es: 'Fianza y Devolución', name_en: 'Deposit & Return', icon: 'CreditCard' },
  { id: 'normas', name_es: 'Normas Importantes', name_en: 'Important Rules', icon: 'AlertCircle' },
  { id: 'tranquilidad', name_es: 'Tranquilidad y Soporte', name_en: 'Peace of Mind', icon: 'HeartHandshake' },
]

export const FAQ_ITEMS: FAQItem[] = [
  {
    "id": "faq-1",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Qué hace especial a vuestras campers?",
    "answer_es": "Nuestras campers están equipadas con uno de los sistemas más avanzados del mercado. Están pensadas para ofrecer autonomía total, confort y libertad real, sin depender de campings ni enchufes.",
    "question_en": "What makes your campervans special?",
    "answer_en": "Our campervans are equipped with one of the most advanced systems on the market. They are designed to offer total autonomy, comfort, and genuine freedom, without relying on campsites or electric hookups."
  },
  {
    "id": "faq-2",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Qué sistema eléctrico tiene la camper?",
    "answer_es": "Contamos con un sistema eléctrico PRO, muy por encima de lo habitual:\n\n• 540Ah de baterías de litio\n\n• 400W de placas solares\n\n• Inversor de 2000W (como en casa)\n\n• Sistema inteligente de gestión energética.\n\nEsto permite usar enchufes, cargar dispositivos y vivir con total normalidad durante varios días, sin necesidad de acudir a camping ni areas de servicio.",
    "question_en": "What electrical system does the campervan have?",
    "answer_en": "We feature a professional PRO electrical system well above industry standards:\n\n• 540Ah Lithium batteries\n• 400W solar panels\n• 2000W Pure Sine Inverter (standard 230V plugs like at home)\n• Smart energy management system (Victron Cerbo GX).\n\nThis allows you to power appliances, charge laptops and cameras, and live in total comfort for days without needing to visit a campsite or service area."
  },
  {
    "id": "faq-3",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Necesito conectarme a un camping?",
    "answer_es": "No.\n\nGracias al sistema eléctrico y solar, podrás viajar con total autonomía sin necesidad de enchufaros a la luz durante varios días.",
    "question_en": "Do I need to plug in at a campsite?",
    "answer_en": "No.\n\nThanks to our high-capacity Victron lithium and solar system, you can travel with complete off-grid autonomy for days without needing external electricity."
  },
  {
    "id": "faq-4",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Tiene aire acondicionado?",
    "answer_es": "Sí.  \n\nLa camper cuenta con aire acondicionado de 12V, lo que significa que funciona sin necesidad de estar conectado a corriente externa, y optimiza el consumo.",
    "question_en": "Does it have air conditioning?",
    "answer_en": "Yes.\n\nThe camper features a 12V Dometic CoolAir system that runs directly from our lithium battery bank, keeping the cabin cool off-grid without needing 230V shore power."
  },
  {
    "id": "faq-5",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Y en invierno? ¿Tiene calefacción?",
    "answer_es": "Sí.\n\nDispone de calefacción estacionaria diésel, ideal para viajar en invierno o noches frías. La calefación se utiliza con el motor apagado, puedes dormir con ella encendida, además cuenta con una alarma de gases en caso de cualquier problema.",
    "question_en": "What about in winter? Does it have heating?",
    "answer_en": "Yes.\n\nIt features a Truma Combi 4D+E diesel stationary heater and water heater. It operates safely with the vehicle engine off, allowing comfortable sleep during chilly nights, complemented by gas safety alarms."
  },
  {
    "id": "faq-6",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Está bien aislada?",
    "answer_es": "Sí.\n\nCuenta con aislamiento térmico y acústico 360º de alta calidad, kaiflex de 20 y 10 mm, que mejora ampliamente el confort.",
    "question_en": "Is the campervan well insulated?",
    "answer_en": "Yes.\n\nIt features 360º premium Kaiflex thermal and acoustic insulation (20mm and 10mm), significantly improving temperature control and soundproofing."
  },
  {
    "id": "faq-7",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Qué nivel de confort tiene el interior?",
    "answer_es": "Está diseñada para ofrecer una experiencia cómoda y práctica:\n\n• Cama fija con colchón viscoelástico\n• Baño completo con ducha interior y agua caliente\n• Cocina equipada\n• Nevera de compresor, no hace uso de la bateria del vehículo.\n• Iluminación ambiente\n• Amplio espacio de almacenamiento\n• Deposito de aguas de 113 litros\n• Deposito de aguas grises de 90 litros\nTodo pensado para que te sientas como en casa.",
    "question_en": "What comfort level does the interior offer?",
    "answer_en": "It is designed to offer a practical, luxury experience:\n\n• Fixed bed with memory foam mattress\n• Full private bathroom with hot indoor shower and chemical WC\n• Fully equipped kitchen with 86L compressor fridge (independent from engine)\n• Ambient dimmable lighting\n• Generous storage capacity\n• 113L fresh water tank and 90L gray water tank\nEverything designed to make you feel right at home."
  },
  {
    "id": "faq-8",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿En qué se diferencia de otras campers?",
    "answer_es": "La diferencia principal es la autonomía y el nivel de equipamiento.\n\nMuchas campers del mercado:\n\n• Tienen poca batería\n• Dependen de enchufes\n• Limitan el uso\nNuestras campers:\n\n•  Son completamente autónomas\n• Permiten viajar sin límites\n• Están pensadas para disfrutar sin preocupaciones",
    "question_en": "How does it differ from other camper rentals?",
    "answer_en": "The primary difference is true off-grid autonomy and premium build quality.\n\nMany rental campers:\n• Have small AGM batteries and depend on daily hookups\n• Limit your route to designated campsites\n\nOur campervans:\n• Are 100% off-grid autonomous\n• Let you travel freely around Mallorca's best corners\n• Are maintained in brand-new condition for carefree adventures."
  },
  {
    "id": "faq-9",
    "categoryId": "vehiculo",
    "categoryName_es": "Características del Vehículo",
    "categoryName_en": "Vehicle Features",
    "question_es": "¿Podré hacer vida dentro de la camper cómodamente?",
    "answer_es": "Sí.\n\nLa camper está preparada para que puedas cocinar, descansar, ducharte y cargar dispositivos con total normalidad durante el viaje, y sin necesidad de sacar ningun elemento al exterior como sillas y mesas, lo cual esta prohibido al considerarse acampar y las multas son elevadas.\n\nSi buscas una camper básica para moverte, hay muchas opciones.\n\nSi buscas vivir la experiencia con comodidad, autonomía y libertad real, estos elementos marcan la diferencia. Porque cuando vienes a Mallorca a recorrerla en camper, vienes a disfrutar y ser libre, no a pensar en que una camper te deje tirada al segundo día porque esta vieja o porque tiene poca autonomía.",
    "question_en": "Can I comfortably live and work inside the camper?",
    "answer_en": "Yes.\n\nThe vehicle is designed for cooking, showering, relaxing, and charging all devices comfortably inside without needing to unpack outdoor tables or chairs—which is strictly regulated in natural areas of Mallorca.\n\nIf you want freedom with authentic comfort, our campers deliver that difference."
  },
  {
    "id": "faq-10",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Qué tipo de experiencia ofrecéis?",
    "answer_es": "Nuestras campers están pensadas para disfrutar de Mallorca con calma, libertad, comodidad y la mayor autonomía.\n\nEstán diseñadas para viajes tranquilos (especialmente parejas), no para uso intensivo o festivo.",
    "question_en": "What type of experience do you offer?",
    "answer_en": "Our campers are tailored for couples and conscious explorers who want to discover Mallorca with calmness, comfort, and autonomy. They are designed for relaxed journeys, not for heavy party or festival use."
  },
  {
    "id": "faq-11",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Qué incluye el alquiler?",
    "answer_es": "Incluye todo lo necesario para empezar el viaje sin preocuparte de nada:\n\n Seguro a todo riesgo\n\n Asistencia en carretera en España y Europa (países de la Carta verde)\n\n Equipamiento completo\n\n Asesoramiento antes del viaje\n\n Recogida y traslado al aeropuerto, bajo petición previa, con un coste total de 50€\n\n Solo tienes que disfrutar de este paraíso de isla.",
    "question_en": "What is included in the rental?",
    "answer_en": "Everything you need to start your trip with zero surprises:\n\n• Comprehensive insurance (Seguro a todo riesgo)\n• 24/7 Roadside assistance across Spain and Europe (Green Card)\n• Complete premium kitchen and bed linen pack\n• Personalized pre-trip route advice\n• Airport pickup/transfer available on request (€50)\n\nAll you have to do is relax and enjoy Mallorca."
  },
  {
    "id": "faq-12",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Cómo es el proceso de entrega de la camper?",
    "answer_es": "Si contratas el servicio de recogida iremos a buscarte al aeropuerto y te llevaremos hasta donde tenemos estacionada nuestra camper, muy próximo al aeropuerto, en caso contrario, te mandaremos la ubicación para que puedas desplazarte tu mismo hasta este lugar.\n\nSe te hará una explicación detallada y demostración de como funcionan todos los accesorios para que te vayas tranquilo, además, si durante la reserva tienes alguna duda, estaremos pendientes del teléfono para ayudarte a resolver cualquier incidencia.\n\nNuestro objetivo es que disfrutes de tu estancia sin preocupaciones.",
    "question_en": "How does the pickup and handover process work?",
    "answer_en": "If you select airport transfer, we meet you directly at Palma Airport (PMI) and escort you to the vehicle located just minutes away. Alternatively, we send exact location coordinates for independent arrival.\n\nWe provide a full in-person walkthrough explaining every feature (electricity, water, bed, heating). In addition, our team remains reachable by phone/WhatsApp throughout your journey."
  },
  {
    "id": "faq-13",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Qué necesito para alquilar?",
    "answer_es": "El conductor debe tener obligatoriamente:\n\n• Tener al menos 25 años\n• Carnet tipo B con mínimo 2 años de antigüedad\n• Documento de identidad en vigor",
    "question_en": "What are the driver requirements to rent?",
    "answer_en": "The main driver must fulfill:\n\n• Be at least 25 years old\n• Hold a valid Category B driving license with at least 2 years of driving experience\n• Present a valid ID card or Passport"
  },
  {
    "id": "faq-14",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Cómo funciona la reserva?",
    "answer_es": "• Pago del 100% del importe de la reserva en el momento de solicitud.\n• Firma del contrato vía online previo a la entrega.\nAntes del viaje recibirás toda la información para que todo sea sencillo desde el primer momento.",
    "question_en": "How does the booking process work?",
    "answer_en": "• 100% payment upon booking confirmation via secure checkout.\n• Easy online contract signing prior to vehicle handover.\nBefore your trip, you receive all essential guide materials for a seamless arrival."
  },
  {
    "id": "faq-15",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Cuál es la política de cancelación y cambios?",
    "answer_es": "Queremos ofrecerte flexibilidad manteniendo el compromiso de cada reserva.\n\n**🗓 Cancelaciones**\n• Más de 30 días antes: devolución del 100%\n• Entre 29 y 15 días: devolución del 50%\n• 14 días o menos: no reembolsable (100%)\n\n**⏰ No presentación**\nSe considerará cancelación de última hora (100% no reembolsable).\n\n**🔄 Cambio de fechas**\nPodrás solicitar un único cambio de fechas sin coste adicional con más de 15 días de antelación, sujeto a disponibilidad. En caso de que las fechas solicitadas sean a una temporada superior, el precio por día se deberá ajustar.\n\n⚠ Importante: el cambio de fechas no modifica ni reinicia las condiciones de cancelación originales de la reserva. Es decir, si a posterior se cancela esta reserva se perderá el importe abonado.\n\n**💬 Estamos para ayudarte**\nSi surge cualquier imprevisto, contáctanos y haremos todo lo posible por ayudarte.",
    "question_en": "What is the cancellation and date change policy?",
    "answer_en": "We offer clear conditions to balance flexibility with booking commitment:\n\n**🗓 Cancellations**\n• > 30 days before pickup: 100% refund\n• Between 29 and 15 days: 50% refund\n• ≤ 14 days: non-refundable (0%)\n\n**⏰ No-show**\nConsidered a last-minute cancellation (non-refundable).\n\n**🔄 Date Changes**\nYou may request one date change without penalty up to 15 days before departure (subject to availability; season rate adjustments apply).\n\n*Note: Date changes do not reset the original cancellation policy.*"
  },
  {
    "id": "faq-16",
    "categoryId": "reserva",
    "categoryName_es": "Experiencia y Reserva",
    "categoryName_en": "Experience & Booking",
    "question_es": "¿Recibiré indicaciones sobre cómo funciona la camper?",
    "answer_es": "Sí, y además hemos diseñado un sistema para que lo entiendas todo de forma sencilla incluso antes de tu llegada.\n\nTras completar tu reserva, recibirás acceso a una página privada donde encontrarás vídeos breves y claros explicando cada uno de los sistemas de la camper: cama, cocina, electricidad, agua, baño, entre otros.\n\nDe esta forma, podrás familiarizarte con el funcionamiento a tu ritmo, sin prisas y desde cualquier lugar, resolviendo la mayoría de dudas antes incluso de empezar el viaje.\n\nAdemás, podrás consultar estos contenidos tantas veces como necesites durante tu experiencia, directamente desde tu móvil.\n\nY por supuesto, si te surge cualquier duda puntual, nuestro equipo estará disponible para ayudarte.\n\nNuestro objetivo es que, cuando llegues, solo tengas que subirte… y empezar disfrutar.",
    "question_en": "Will I receive instructions on how everything operates?",
    "answer_en": "Yes. Upon confirmation, you receive exclusive access to our client portal with concise video guides demonstrating every system: bed, kitchen, electrical controls, hot water, and bathroom.\n\nYou can re-watch them on your smartphone at any time during your trip, backed by our phone assistance."
  },
  {
    "id": "faq-17",
    "categoryId": "seguro",
    "categoryName_es": "Seguro y Tranquilidad",
    "categoryName_en": "Insurance & Coverage",
    "question_es": "¿El seguro está incluido?",
    "answer_es": "Sí. Todas nuestras campers cuentan con seguro a todo riesgo con fianza de 1.000 €.\n\nEn condiciones normales de uso, estarás cubierto ante la mayoría de imprevistos.",
    "question_en": "Is insurance included?",
    "answer_en": "Yes. All our rentals include comprehensive insurance with a refundable security deposit of €1,000.\n\nUnder normal driving conditions, you are covered against the majority of incidents."
  },
  {
    "id": "faq-18",
    "categoryId": "seguro",
    "categoryName_es": "Seguro y Tranquilidad",
    "categoryName_en": "Insurance & Coverage",
    "question_es": "¿Qué no cubre el seguro?",
    "answer_es": "Como en cualquier vehículo, el seguro no cubre:\n\n• Daños en el interior\n• Uso negligente\n• Circulación por zonas no aptas\nPor eso es importante usar la camper como lo que es: un espacio cuidado.",
    "question_en": "What is excluded from insurance coverage?",
    "answer_en": "As with any vehicle rental, insurance does not cover:\n\n• Negligent or reckless driving\n• Driving on unpaved or unauthorized tracks\n• Internal damage or burns caused by misuse\n• Wrong fueling\nTreating the campervan with care ensures a completely trouble-free experience."
  },
  {
    "id": "faq-19",
    "categoryId": "seguro",
    "categoryName_es": "Seguro y Tranquilidad",
    "categoryName_en": "Insurance & Coverage",
    "question_es": "¿Incluye asistencia en carretera?",
    "answer_es": "Sí, en España y Europa (paises de la carta verde)\n\nEn la mayoría de situaciones estarás cubierto.\n\nEn casos fuera de uso normal (arena, accesos complicados, etc.), pueden existir costes adicionales asumible por el cliente.",
    "question_en": "Does it include roadside assistance?",
    "answer_en": "Yes, 24/7 roadside assistance is included in Spain and Green Card European countries. In rare cases where recovery is required due to non-permitted off-road driving (e.g. deep beach sand), towing costs are the client's responsibility."
  },
  {
    "id": "faq-20",
    "categoryId": "seguro",
    "categoryName_es": "Seguro y Tranquilidad",
    "categoryName_en": "Insurance & Coverage",
    "question_es": "¿Qué pasa si hay una avería?",
    "answer_es": "Avísanos y te ayudamos en todo momento. La asistencia cubrirá la mayoría de incidencias.\n\nLo importante es no continuar circulando si el vehículo indica un problema. Este problema es raro que se de, ya que contamos con una flota de vehículos nuevos, año de matriculación novimebre de 2025.",
    "question_en": "What happens in case of a mechanical breakdown?",
    "answer_en": "Contact our team immediately and we will coordinate assistance. Our entire fleet consists of brand-new 2025/2026 vehicles, making mechanical issues extremely rare."
  },
  {
    "id": "faq-21",
    "categoryId": "seguro",
    "categoryName_es": "Seguro y Tranquilidad",
    "categoryName_en": "Insurance & Coverage",
    "question_es": "¿Qué debo hacer en caso de accidente?",
    "answer_es": "Lo primero: mantén la calma.\n\nEstamos para ayudarte en todo momento. En caso de accidente, sigue estos pasos:\n\n**1. Prioriza la seguridad**\nAsegúrate de que todos los ocupantes están bien. Si hay heridos o la situación lo requiere, contacta inmediatamente con emergencias (112).\n\n**2. Documenta el incidente**\nSiempre que sea posible:\n\n• Completa el parte amistoso con el otro conductor\n• Recoge sus datos (nombre, DNI, matrícula, seguro)\n• Toma fotos o vídeos del lugar, daños y vehículos implicados\n\n**3. Contacta con nosotros**\nAvísanos lo antes posible para poder ayudarte y guiarte en los siguientes pasos.\n\nNuestro equipo te indicará cómo proceder según la situación.\n\n**4. No actúes por tu cuenta**\nNo autorices reparaciones ni traslados del vehículo sin consultarnos previamente, salvo por motivos de seguridad.\n\n**5. ¿Qué ocurre después del accidente?**\n🟢 Si el otro conductor es responsable Si el accidente no ha sido culpa tuya y queda correctamente reflejado en el parte amistoso o atestado, los daños serán gestionados a través del seguro del tercero responsable.\n\nNosotros nos encargaremos de todo el proceso para que no tengas que preocuparte.\n\n🔴 Si eres responsable del accidente En este caso, los daños estarán cubiertos según las condiciones del seguro contratado. El cliente asumirá la parte correspondiente establecida en el contrato (como la franquicia o daños no cubiertos, si los hubiera).\n\nNuestro equipo te acompañará en todo momento para que la gestión sea lo más sencilla posible.",
    "question_en": "What should I do in case of an accident?",
    "answer_en": "Stay calm and follow these 5 steps:\n\n**1. Prioritize Safety:** Ensure everyone is safe. Call 112 if medical assistance is needed.\n**2. Document Everything:** Fill out the standard European accident report (parte amistoso), record third-party details, and take clear photos.\n**3. Contact Utopia:** Inform us immediately so our support team can guide you.\n**4. Do Not Authorize Repairs:** Never authorize towing or repairs on your own without our prior consent.\n**5. Post-accident Management:** Non-fault accidents are claimed through the third-party insurer with our team handling all paperwork."
  },
  {
    "id": "faq-22",
    "categoryId": "uso",
    "categoryName_es": "Uso del Vehículo",
    "categoryName_en": "Driving & Roads",
    "question_es": "¿Puedo circular por cualquier sitio?",
    "answer_es": "Para tu seguridad y la del vehículo:\n\nSolo está permitido circular por carreteras y vías aptas para turismos.",
    "question_en": "Can I drive anywhere in Mallorca?",
    "answer_en": "For your safety and vehicle preservation, you may only drive on paved roads suitable for passenger vehicles. Off-road driving, unpaved tracks, and driving onto beach sand are strictly prohibited."
  },
  {
    "id": "faq-23",
    "categoryId": "uso",
    "categoryName_es": "Uso del Vehículo",
    "categoryName_en": "Driving & Roads",
    "question_es": "¿Puedo salir de Mallorca?",
    "answer_es": "Sí, bajo solicitud previa y confirmación por escrito de la empresa.\n\nEn algunos casos permitimos viajes a península o Europa con autorización.",
    "question_en": "Can I take the campervan outside Mallorca?",
    "answer_en": "Only with prior written authorization from Utopia Van Life. Ferry transit to the Spanish mainland or other islands must be requested and approved in advance."
  },
  {
    "id": "faq-24",
    "categoryId": "uso",
    "categoryName_es": "Uso del Vehículo",
    "categoryName_en": "Driving & Roads",
    "question_es": "¿Hay límite de kilómetros?",
    "answer_es": "Sí:\n\n150 km por día (acumulables)\n\n• Exceso: 0,25 €/km\n• Opción ilimitada disponible",
    "question_en": "Is there a mileage limit?",
    "answer_en": "The standard rental includes 150 km per day (cumulative across your stay). Additional kilometers are charged at €0.25/km. Unlimited mileage packages are also available."
  },
  {
    "id": "faq-25",
    "categoryId": "fianza",
    "categoryName_es": "Fianza y Devolución",
    "categoryName_en": "Deposit & Return",
    "question_es": "¿Cómo funciona la fianza?",
    "answer_es": "Se realiza una retención de 1.000 € en tarjeta.\n\nSe desbloquea tras la devolución y positiva revisión del vehículo.",
    "question_en": "How does the security deposit work?",
    "answer_en": "A temporary pre-authorization hold of €1,000 is placed on your credit card at vehicle pickup. It is released promptly following positive post-rental inspection."
  },
  {
    "id": "faq-26",
    "categoryId": "fianza",
    "categoryName_es": "Fianza y Devolución",
    "categoryName_en": "Deposit & Return",
    "question_es": "¿Qué cubre la fianza?",
    "answer_es": "Sirve como garantía para:\n\n• Daños no cubiertos por el seguro\n• Interior del vehículo\n• Limpieza extraordinaria\n• Incidencias derivadas del uso",
    "question_en": "What does the deposit cover?",
    "answer_en": "It acts as a guarantee for:\n\n• Insurance excess/deductible in case of fault\n• Interior damage not covered by vehicle insurance\n• Extraordinary cleaning fees if returned excessively dirty\n• Missing equipment or fuel shortage"
  },
  {
    "id": "faq-27",
    "categoryId": "fianza",
    "categoryName_es": "Fianza y Devolución",
    "categoryName_en": "Deposit & Return",
    "question_es": "¿Cómo debo devolver la camper?",
    "answer_es": "El vehiculo se entrega con depositos de combustible y gas llenos, debe entregarse en mismas condiciones.\n\nAdemas debe entregarse:\n\n• En condiciones razonables de limpieza\n• Con WC y depósitos de aguas grises vaciados\nNo es necesaria limpieza profesional, pero si una limpieza básica.",
    "question_en": "How should the campervan be returned?",
    "answer_en": "The vehicle is handed over with full fuel and clean water tanks, and should be returned with full fuel.\n\n• Returned in reasonably clean condition\n• Chemical toilet cassette and grey water tank completely emptied\nProfessional detailing is not required, just respectful everyday cleanliness."
  },
  {
    "id": "faq-28",
    "categoryId": "fianza",
    "categoryName_es": "Fianza y Devolución",
    "categoryName_en": "Deposit & Return",
    "question_es": "¿Qué pasa si la devuelvo muy sucia?",
    "answer_es": "Podrán aplicarse cargos de limpieza en función del estado.\n\nSolo en casos donde el estado no sea el adecuado para su siguiente uso.",
    "question_en": "What happens if the vehicle is returned very dirty?",
    "answer_en": "An extraordinary cleaning fee may apply only if the interior condition requires professional deep-cleaning, sand removal, or upholstery treatment."
  },
  {
    "id": "faq-29",
    "categoryId": "normas",
    "categoryName_es": "Normas Importantes",
    "categoryName_en": "Important Rules",
    "question_es": "¿Se puede fumar dentro?",
    "answer_es": "No.\n\nPara mantener el confort del vehículo, no está permitido fumar en el interior.",
    "question_en": "Is smoking permitted inside?",
    "answer_en": "No. Smoking is strictly prohibited inside the campervan to preserve a clean and fresh atmosphere for all travelers. Violation incurs a specialized odor elimination charge."
  },
  {
    "id": "faq-30",
    "categoryId": "normas",
    "categoryName_es": "Normas Importantes",
    "categoryName_en": "Important Rules",
    "question_es": "¿Se permiten mascotas?",
    "answer_es": "Solo con autorización previa.\n\nAsí garantizamos el buen estado del vehículo para todos.",
    "question_en": "Are pets allowed?",
    "answer_en": "Only with prior authorization upon booking, subject to a pet cleaning fee."
  },
  {
    "id": "faq-31",
    "categoryId": "normas",
    "categoryName_es": "Normas Importantes",
    "categoryName_en": "Important Rules",
    "question_es": "¿Qué pasa si devuelvo tarde el vehículo?",
    "answer_es": "Se aplicarán cargos por retraso.\n\nEn caso de afectar a otras reservas, pueden derivarse costes adicionales.",
    "question_en": "What happens if I return the camper late?",
    "answer_en": "Late return fees apply as specified in the rental agreement, as delayed drop-offs can disrupt vehicle preparation for subsequent guests."
  },
  {
    "id": "faq-32",
    "categoryId": "normas",
    "categoryName_es": "Normas Importantes",
    "categoryName_en": "Important Rules",
    "question_es": "¿Qué ocurre si hago un uso inadecuado?",
    "answer_es": "En esos casos, el cliente será responsable de los costes derivados.\n\nSiempre buscamos que todo sea sencillo: usando la camper de forma normal, no tendrás ningún problema.",
    "question_en": "What happens in case of improper use?",
    "answer_en": "The renter is responsible for damages resulting from reckless behavior or disregard of vehicle operating instructions. Normal, respectful use guarantees a seamless trip."
  },
  {
    "id": "faq-33",
    "categoryId": "tranquilidad",
    "categoryName_es": "Tranquilidad y Soporte",
    "categoryName_en": "Peace of Mind & Support",
    "question_es": "¿Voy a tener problemas durante el viaje?",
    "answer_es": "No. Buscamos la mayor tranquilidad, confortabilidad y experiencia del cliente, por eso buscamos un grupo selecto de personas y no un uso másivo. La flota de vehículos es completamente nueva para mejorar la experiencia.\n\nNuestro objetivo es que disfrutes sin preocupaciones.\n\nSi haces un uso responsable, todo funciona de forma fácil, clara y sin sorpresas.",
    "question_en": "Will I experience issues during my trip?",
    "answer_en": "No! We focus on delivering tranquility, comfort, and premium hospitality. With our brand-new fleet, high-end Victron off-grid technology, and responsive customer support, your Mallorca road trip will be effortless and unforgettable."
  }
];
