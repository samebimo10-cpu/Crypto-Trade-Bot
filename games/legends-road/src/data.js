/* =====================================================================
   SEASON ONE — episodes, places, history and the legends of each city
   `route` stages are built from real coordinates (stylised street map);
   `places` stages spread real place names along a generated road.
   ===================================================================== */
const STAGES = [
  {
    id:'lagos', place:'Lagos', country:'Nigeria', era:'Eko · capital until 1991',
    ep:'Eko Never Sleeps', tag:'From Ikeja to Eko Atlantic, across the Third Mainland Bridge',
    history:'Lagos began as Eko, a Yoruba settlement on the islands of a lagoon. Portuguese traders named it Lagos, "lakes". It was Nigeria\'s capital until 1991, when the government moved to Abuja, and it is now one of the largest cities in Africa. The Third Mainland Bridge, opened in 1990, carries traffic 11.8 km across the lagoon.',
    facts:['The Third Mainland Bridge is 11.8 km long and opened in 1990.','The Lekki–Ikoyi Link Bridge, a cable-stayed bridge, opened in 2013.','Eko Atlantic is a new district built on land reclaimed from the ocean.'],
    route:[
      {n:'Ikeja', lat:6.6018, lon:3.3515, d:'Capital of Lagos State and home of the international airport.'},
      {n:'Gbagada', lat:6.5530, lon:3.3880, d:'Mainland district on the approach to the lagoon.'},
      {n:'Third Mainland Bridge', lat:6.5460, lon:3.4000, d:'Opened in 1990; 11.8 km across the Lagos Lagoon.'},
      {n:'Lagos Island', lat:6.4570, lon:3.3960, d:'The old heart of the city, once called Eko.', bridgeIn:true},
      {n:'Tafawa Balewa Square', lat:6.4475, lon:3.4010, d:'Built on the old Race Course, where Nigeria\'s flag was raised in 1960.'},
      {n:'Ikoyi', lat:6.4500, lon:3.4330, d:'Leafy district of embassies and old colonial homes.'},
      {n:'Lekki–Ikoyi Link Bridge', lat:6.4475, lon:3.4440, d:'Cable-stayed toll bridge over the lagoon, opened in 2013.'},
      {n:'Lekki Phase 1', lat:6.4430, lon:3.4640, d:'Newer Lagos on the Lekki peninsula.', bridgeIn:true},
      {n:'Victoria Island', lat:6.4290, lon:3.4210, d:'Business district facing the Atlantic.'},
      {n:'Eko Atlantic', lat:6.4080, lon:3.4090, d:'A new city rising on land reclaimed from the ocean.'}
    ],
    water:[
      [[6.62,3.385],[6.62,3.62],[6.462,3.62],[6.455,3.52],[6.452,3.48],[6.455,3.455],[6.458,3.44],[6.462,3.425],[6.466,3.41],[6.47,3.402],[6.50,3.396],[6.53,3.394],[6.56,3.392],[6.585,3.385]],
      [[6.475,3.372],[6.52,3.378],[6.548,3.39],[6.546,3.396],[6.50,3.392],[6.47,3.39],[6.46,3.385]],
      [[6.446,3.30],[6.452,3.37],[6.455,3.385],[6.447,3.392],[6.432,3.395],[6.417,3.404],[6.415,3.42],[6.423,3.44],[6.428,3.47],[6.428,3.62],[6.30,3.62],[6.30,3.30]]
    ],
    person:{name:'Mike Adenuga', initials:'MA', role:'Founder of Globacom and Conoil',
      story:'Born in Ibadan in 1953, Mike Adenuga studied in the United States, paying his way partly by driving a taxi. Back home he built a trading business in Lagos. In 1991 his Consolidated Oil became the first Nigerian-owned company to strike oil in commercial quantities. In 2003 he launched Globacom, known as Glo, which grew into one of Africa\'s biggest mobile networks, and later laid the Glo-1 undersea cable linking Lagos to Europe.',
      fact:'He is nicknamed "The Bull" and almost never gives interviews.'},
    script:{
      intro:[['Narrator','Lagos, six in the morning. Six couples. Twelve cities. One prize: the Fortune Trail.'],
        ['Tobi','Third Mainland Bridge at sunrise. You ready, Kemi?'],
        ['Kemi','Born ready. Your dad\'s garage is counting on us.'],
        ['Ada','Enjoy the view of our bumper, Adeyemis!']],
      outro:['Tobi','One down. Next stop, the Okafors\' home turf.'],
      next:'Next time: Port Harcourt. The Okafors know every street in the Garden City. Do the Adeyemis?'},
    theme:{sky:['#2a5d9c','#79aedb','#f4dcaa'], sun:{x:.76,y:.66,r:.055,c:'#fff1c8',glow:'rgba(255,230,170,.5)'},
      fog:'#e3dac6', grass:['#6c9a3e','#628f38'], road:['#55575c','#505257'], rumble:['#f4f4f4','#1f8a4c'], lane:'#f4f4f4',
      water:['#2f7fae','#2a76a3'], far:{type:'sea',color:'#2e6f9c',land:'#5d7a6a'}, mid:{type:'skyline',color:'#5a6a80',lit:.04},
      clouds:.8, weather:'none', scenery:['palm','palm','office','colonial','phhouse','bush','kiosk','stall','compound'], traffic:'danfo', landmark:'linkBridge', naija:true, landmarkAt:'Lekki–Ikoyi Link Bridge', dual:true}
  },
  {
    id:'portharcourt', place:'Port Harcourt', country:'Rivers State, Nigeria', era:'The Garden City · founded 1912',
    ep:'Garden City Showdown', tag:'From Rumuokoro to the port that gave the city its name',
    history:'Port Harcourt was founded in 1912 by the British as a port to ship coal from Enugu, and named after Lewis Harcourt, then Secretary of State for the Colonies. Its parks and tree-lined avenues earned it the name "the Garden City". Today it is the centre of Nigeria\'s oil and gas industry, set among the creeks of the Niger Delta.',
    facts:['Port Harcourt was founded in 1912 to export coal from Enugu.','It is nicknamed the Garden City for its parks and greenery.','The city sits on the Bonny River, about 60 km from the open sea.'],
    route:[
      {n:'Rumuokoro', lat:4.8660, lon:7.0020, d:'Busy junction at the northern gateway of the city.'},
      {n:'Rumuola', lat:4.8380, lon:7.0120, d:'Northern district on the city\'s main roads.'},
      {n:'Pleasure Park', lat:4.8270, lon:7.0300, d:'Port Harcourt Pleasure Park, a family park of lakes and gardens on Aba Road.'},
      {n:'Trans-Amadi', lat:4.8080, lon:7.0450, d:'Industrial layout at the heart of the oil and gas business.'},
      {n:'Tourist Beach', lat:4.7730, lon:7.0370, d:'Riverside beach on the creeks at the edge of the city.'},
      {n:'Isaac Boro Park', lat:4.7745, lon:7.0160, d:'Named after Isaac Adaka Boro, a Niger Delta activist and soldier.'},
      {n:'Mile 1', lat:4.7960, lon:6.9970, d:'Diobu district, home to one of the busiest markets in the city.'},
      {n:'Old GRA', lat:4.7830, lon:7.0040, d:'The original Government Reserved Area, with wide shaded streets.'},
      {n:'Port Harcourt Port', lat:4.7640, lon:7.0010, d:'The port on the Bonny River, the reason the city exists.'}
    ],
    water:[
      [[4.74,6.93],[4.767,6.94],[4.768,6.975],[4.766,7.0],[4.767,7.025],[4.770,7.04],[4.782,7.055],[4.80,7.062],[4.83,7.07],[4.86,7.075],[4.86,7.11],[4.74,7.11]],
      [[4.78,6.93],[4.80,6.975],[4.805,6.985],[4.80,6.988],[4.785,6.98],[4.775,6.96],[4.768,6.94]]
    ],
    person:{name:'Folorunso Alakija', initials:'FA', role:'Vice-chair of Famfa Oil, one of Africa\'s wealthiest women',
      story:'Born in 1951 in Ikorodu, near Lagos, Folorunso Alakija trained as a secretary in London and began her career at a bank in Lagos. She then studied fashion and built a respected label, Supreme Stitches. In 1993 her company Famfa Oil was granted a licence to explore the deep water off the Niger Delta. With its partners it found the Agbami field, which began producing oil in 2008 and made her one of the richest women in Africa. Port Harcourt is the capital of that oil country.',
      fact:'Before oil, she was a fashion designer; her label Supreme Stitches dressed many of Lagos\'s society figures.'},
    script:{
      intro:[['Narrator','Port Harcourt. Home ground for Chidi and Ada Okafor.'],
        ['Chidi','Welcome to the Garden City. Try not to get lost.'],
        ['Tobi','I\'ve got the map, Kemi. And I\'ve got shortcuts.'],
        ['Kemi','Then let\'s use them.']],
      outro:['Kemi','Tell Chidi the Garden City says hello.'],
      next:'Next time: the creeks of Bayelsa, where Nigeria\'s oil story began.'},
    theme:{sky:['#4a7fae','#a5c4dc','#eef2f2'], sun:{x:.3,y:.42,r:.045,c:'#fff8e8',glow:'rgba(255,248,232,.45)'},
      fog:'#d4dde0', grass:['#4f8f36','#468530'], road:['#4f5155','#4a4c50'], rumble:['#f4f4f4','#1d4fa8'], lane:'#f4f4f4',
      water:['#4a7a86','#44727e'], far:{type:'hills',color:'#5a7a5a'}, mid:{type:'skyline',color:'#6a7a78',lit:.04},
      clouds:1.7, weather:'none', scenery:['phhouse','phhouse','phhouse','palm','tree','bush','office','kiosk','stall','compound','frame','fuel'], traffic:'danfo', landmark:'portCranes', naija:true,
      dual:true, flyovers:['Pleasure Park','Isaac Boro Park'], towers:['Trans-Amadi','Old GRA']}
  },
  {
    id:'yenagoa', place:'Yenagoa', country:'Bayelsa State, Nigeria', era:'Capital since 1996 · oil since 1956',
    ep:'Creek City', tag:'From Igbogene to Peace Park, across the creeks of the Niger Delta',
    history:'Yenagoa became the capital of Bayelsa when the state was created on 1 October 1996. The city grew up on the creeks and mangrove swamps of the Niger Delta, and for years the only reliable way in was by water, until the Mbiama–Yenagoa road linked it to the East–West Road. Its Oxbow Lake, an old channel of the Nun River, is now a favourite place to unwind.',
    facts:['Bayelsa State was created on 1 October 1996, with Yenagoa as its capital.','Oxbow Lake formed from an old channel of the Nun River.','Nigeria\'s first commercial oil was found at Oloibiri, in today\'s Bayelsa, in 1956.'],
    route:[
      {n:'Igbogene', lat:4.9750, lon:6.3450, d:'Gateway on the Mbiama–Yenagoa road into the capital.'},
      {n:'Tombia Junction', lat:4.9550, lon:6.3150, d:'A busy junction on the way into town.'},
      {n:'Okaka', lat:4.9450, lon:6.2960, d:'Residential district on the edge of the city centre.'},
      {n:'Epie Creek', lat:4.9330, lon:6.2860, d:'A tidal creek that winds through the city.', bridgeIn:true},
      {n:'Ekeki', lat:4.9300, lon:6.2780, d:'Bustling neighbourhood of shops and markets.'},
      {n:'Swali Market', lat:4.9270, lon:6.2680, d:'The main market, by the waterside.'},
      {n:'Oxbow Lake', lat:4.9180, lon:6.2700, d:'A lake formed from an old channel of the Nun River.'},
      {n:'Peace Park', lat:4.9150, lon:6.2820, d:'Gardens and a boating lake beside the government offices.'}
    ],
    water:[
      [[4.938,6.25],[4.934,6.27],[4.936,6.282],[4.931,6.292],[4.928,6.31],[4.924,6.31],[4.927,6.292],[4.93,6.282],[4.929,6.27],[4.932,6.25]],
      [[4.921,6.262],[4.92,6.276],[4.915,6.277],[4.914,6.266],[4.917,6.26]],
      [[4.89,6.2],[4.905,6.23],[4.9,6.26],[4.89,6.29],[4.86,6.29],[4.86,6.2]]
    ],
    person:{name:'Oloibiri Well No. 1', initials:'OB', role:'Nigeria\'s first commercial oil discovery, 1956',
      story:'For years, geologists searched the swamps of the Niger Delta for oil. In 1956 the Shell-BP partnership struck it in commercial quantities at Oloibiri, in what is now Bayelsa State. In its first year the field produced around 5,000 barrels a day, and in 1958 the first cargo of Nigerian crude left for export. Oil became the backbone of the country\'s economy, and many of Nigeria\'s great fortunes trace back to it. Oloibiri itself, a small riverside community, is often remembered as a reminder of how little of that wealth stayed where it began.',
      fact:'The first well is usually called Oloibiri Well No. 1; its exact strike date is given differently in different histories.'},
    script:{
      intro:[['Narrator','Yenagoa, Bayelsa. Creeks, mangroves and the warm rain of the Niger Delta.'],
        ['Lukas','Water on both sides of the road? Where are the hills?'],
        ['Tobi','This is the Delta, Lukas. The water is the hills.'],
        ['Kemi','Then let\'s not fall in.']],
      outro:['Tobi','Seventy years ago, Nigeria\'s oil story began just up the creek from here.'],
      next:'Next time: across the River Niger to Asaba.'},
    theme:{sky:['#3f6f98','#9cbcd2','#e8eeea'], sun:{x:.6,y:.5,r:.045,c:'#fff6e0',glow:'rgba(255,246,224,.45)'},
      fog:'#cdd8d2', grass:['#3f8a34','#37802e'], road:['#4f5155','#4a4c50'], rumble:['#f4f4f4','#d9a21b'], lane:'#f4f4f4',
      water:['#3f6e6a','#3a6662'], far:{type:'hills',color:'#4a6e52'}, mid:{type:'skyline',color:'#6a7a74',lit:.04},
      clouds:1.6, weather:'none', scenery:['phhouse','phhouse','palm','palm','tree','kiosk','stall','compound','frame','bush'], traffic:'danfo', landmark:'derrick',
      dual:true, naija:true}
  },
  {
    id:'asaba', place:'Asaba', country:'Delta State, Nigeria', era:'On the Niger · bridge of 1965',
    ep:'Over the Niger', tag:'Across the Niger Bridge and out to the airport',
    history:'Asaba sits on a bend of the River Niger, facing Onitsha across the water. In the 1880s it was the administrative headquarters of the Royal Niger Company, and in 1991 it became the capital of the new Delta State. The steel Niger Bridge, completed in 1965, carries traffic between the two cities, and its partner, the Second Niger Bridge, opened downstream in 2022.',
    facts:['The Niger Bridge between Onitsha and Asaba was completed in 1965.','Delta State was created in 1991, with Asaba as its capital.','Stephen Keshi Stadium hosted the 2018 African Championships in Athletics.'],
    route:[
      {n:'Onitsha approach', lat:6.1520, lon:6.7880, d:'The eastern end of the Niger Bridge.'},
      {n:'Head Bridge', lat:6.1420, lon:6.7660, d:'Where the Niger Bridge lands in Asaba.', bridgeIn:true},
      {n:'Nnebisi Road', lat:6.1880, lon:6.7360, d:'One of the city\'s main roads, through the old town.'},
      {n:'Stephen Keshi Stadium', lat:6.2063, lon:6.7224, d:'22,000-seat stadium named after the Super Eagles legend.'},
      {n:'Summit Road', lat:6.2160, lon:6.7040, d:'Government offices along a broad avenue.'},
      {n:'Okpanam Road', lat:6.2260, lon:6.6880, d:'Road out toward Okpanam and the airport.'},
      {n:'Asaba Airport', lat:6.2042, lon:6.6653, d:'Asaba International Airport, west of the city.'}
    ],
    water:[[[6.25,6.74],[6.2,6.76],[6.16,6.768],[6.13,6.778],[6.1,6.79],[6.1,6.81],[6.13,6.796],[6.16,6.786],[6.2,6.78],[6.25,6.765]]],
    person:{name:'Tony Elumelu', initials:'TE', role:'Chairman of Heirs Holdings and UBA, founder of the Tony Elumelu Foundation',
      story:'Born in Jos in 1963 to a family from Onicha-Ukwu in Delta State, Tony Elumelu began his career as a salesman at Union Bank. In 1997 he led a group of investors that took over a small, struggling bank and turned it into Standard Trust Bank. In 2005 it merged with United Bank for Africa, which he led as chief executive and now chairs, with operations across Africa and beyond. In 2010 he created the Tony Elumelu Foundation, which committed $100 million over ten years to fund and train young African entrepreneurs.',
      fact:'His foundation\'s programme has funded more than 20,000 young African entrepreneurs.'},
    script:{
      intro:[['Narrator','Asaba, Delta State. A city on a bend of the great river.'],
        ['Marc','A bridge race! I love a bridge race.'],
        ['Kemi','Then you\'ll love the view of our tail lights.'],
        ['Tobi','Over the Niger, up Nnebisi Road, past the stadium and out to the airport.']],
      outro:['Kemi','Four Nigerian cities down. From here the Trail heads north.'],
      next:'Next time: the ancient walls of Kano, and a legend who started with a loan from his uncle.'},
    theme:{sky:['#3a74b4','#8fbbe0','#f0e6d0'], sun:{x:.3,y:.6,r:.05,c:'#fff2d4',glow:'rgba(255,236,200,.5)'},
      fog:'#dcd8cc', grass:['#5a8f3a','#518534'], road:['#4f5155','#4a4c50'], rumble:['#f4f4f4','#c22a2a'], lane:'#f4f4f4',
      water:['#5a7a6a','#537264'], far:{type:'hills',color:'#5a7a5a'}, mid:{type:'skyline',color:'#6a7472',lit:.04},
      clouds:1.1, weather:'none', scenery:['phhouse','phhouse','phhouse','colonial','palm','tree','kiosk','stall','compound','frame','fuel','bush'], traffic:'danfo', landmark:'nigerBridge',
      dual:true, naija:true}
  },
  {
    id:'kano', place:'Kano', country:'Nigeria', era:'Over 1,000 years of trade',
    ep:'Walls of Gold', tag:'City of walls, dye pits and caravans',
    history:'One of the oldest cities in West Africa, Kano grew rich at the southern end of the trans-Saharan caravan routes. Its earthen walls once ran for kilometres around the old city, and its indigo dye pits at Kofar Mata have been worked by hand for more than five hundred years.',
    facts:['Kano\'s first city walls are thought to date to the 11th or 12th century.','Caravans carried Kano leather and cloth north across the Sahara.','The Kofar Mata dye pits are still worked by hand today.'],
    places:['Kurmi Market','Gidan Makama Museum','Emir\'s Palace','Kofar Mata Dye Pits'],
    person:{name:'Aliko Dangote', initials:'AD', role:'Founder of the Dangote Group, long ranked Africa\'s richest person',
      story:'Born in Kano in 1957 into a family of traders, Aliko Dangote grew up hearing about his great-grandfather Alhassan Dantata, one of the wealthiest merchants in West Africa. At 21 he started trading cement, sugar and rice with a loan from his uncle. He then moved from trading goods to making them: cement plants across Africa, sugar and salt refineries, and finally one of the world\'s largest single-train oil refineries, near Lagos.',
      fact:'He has said that as a schoolboy he bought cartons of sweets and resold them to classmates at a profit.'},
    script:{
      intro:[['Narrator','Kano. A thousand years of caravans ended here.'],
        ['Tobi','Harmattan dust coming in. Keep your eyes on the road.'],
        ['Kemi','My eyes are always on the road. Your eyes are on the snacks.'],
        ['Priya','Good luck, Adeyemis! You\'ll need it in this heat.']],
      outro:['Tobi','From here, the Trail leaves Africa. Spain, here we come.'],
      next:'Next time: an ancient lighthouse on the edge of the Atlantic.'},
    theme:{sky:['#3a2758','#c96a4c','#f7c27a'], sun:{x:.72,y:.84,r:.085,c:'#ffd590',glow:'rgba(255,165,90,.55)'},
      fog:'#e3a873', grass:['#c79e5a','#bb9250'], road:['#6c5a4b','#645243'], rumble:['#f2e3c4','#a8442e'], lane:'#f2e3c4',
      far:{type:'mesas',color:'#9a5a4a'}, mid:{type:'dunes',color:'#c48a58'}, clouds:.35, weather:'dust',
      scenery:['adobe','adobe','baobab','acacia','bush','bush','kiosk','stall','compound'], landmark:'kanoGate', naija:true, traffic:'danfo'}
  },
  {
    id:'coruna', place:'A Coruña', country:'Galicia, Spain', era:'Roman lighthouse · 1st–2nd century AD',
    ep:'The Lighthouse', tag:'Where Atlantic ships have followed the same light for 1,900 years',
    history:'At the edge of the Atlantic stands the Tower of Hercules, a lighthouse built by the Romans and still in use, the oldest of its kind. Legend says Hercules buried the giant Geryon here and raised the tower over him. It became a UNESCO World Heritage Site in 2009.',
    facts:['The Tower of Hercules is the oldest Roman lighthouse still in use.','Galicia\'s stone hórreos lift grain off the damp ground on stilts.','A Coruña is called the "City of Glass" for its glazed seafront balconies.'],
    places:['María Pita Square','Riazor Beach','Paseo Marítimo','Monte San Pedro'],
    person:{name:'Amancio Ortega', initials:'AO', role:'Founder of Inditex, the company behind Zara',
      story:'The son of a railway worker, Amancio Ortega left school at 14 and went to work as a delivery boy for a shirt maker in A Coruña. He learned the trade from the shop floor up. In 1975 he opened the first Zara store on a street in this city. His idea was to design quickly, make clothes close to home and restock shops twice a week, and it changed how the world buys clothing. Inditex is still based just outside town, in Arteixo.',
      fact:'Ortega has given almost no interviews in his life; for decades very few photos of him were public.'},
    script:{
      intro:[['Narrator','Galicia, Spain. The Atlantic wind never stops.'],
        ['Élise','Paris is next. Marc and I will be waiting for you there.'],
        ['Tobi','That sounded like a threat.'],
        ['Kemi','That sounded like a challenge.']],
      outro:['Kemi','If that lighthouse can last two thousand years, we can last twelve episodes.'],
      next:'Next time: the Laurents race on home soil, under the Eiffel Tower.'},
    theme:{sky:['#2a66a6','#76acd8','#d9ecf5'], sun:{x:.24,y:.24,r:.045,c:'#fffbe8',glow:'rgba(255,255,230,.45)'},
      fog:'#cfe2ec', grass:['#5a9440','#518a39'], road:['#5d6268','#575c61'], rumble:['#f4f4f4','#3a6fb0'], lane:'#f4f4f4',
      far:{type:'sea',color:'#2e6e98',land:'#6d8e80'}, mid:{type:'hills',color:'#4d8a4a'}, clouds:1, weather:'none',
      scenery:['pine','pine','cottage','horreo','bush'], landmark:'hercules'}
  },
  {
    id:'paris', place:'Paris', country:'France', era:'La Belle Époque · 1889',
    ep:'City of Light', tag:'From the Arc de Triomphe to the Eiffel Tower, along the Seine',
    history:'The Eiffel Tower rose for the 1889 World\'s Fair, a century after the French Revolution. Leading artists signed a protest calling it an eyesore, and it was meant to stand for only twenty years. It stayed. The broad boulevards around it were cut through the old city by Baron Haussmann in the 1850s and 1860s.',
    facts:['The Eiffel Tower took just over two years to build, from 1887 to 1889.','It was the tallest structure in the world until 1930.','Louis Vuitton opened his first trunk shop in Paris in 1854.'],
    route:[
      {n:'Arc de Triomphe', lat:48.8738, lon:2.2950, d:'Commissioned by Napoleon in 1806 to honour his armies.'},
      {n:'Champs-Élysées', lat:48.8698, lon:2.3078, d:'The avenue of parades and of the Tour de France finish.'},
      {n:'Place de la Concorde', lat:48.8656, lon:2.3212, d:'Its Egyptian obelisk is more than 3,000 years old.'},
      {n:'The Louvre', lat:48.8611, lon:2.3358, d:'A royal palace before it became the world\'s most visited museum.'},
      {n:'Notre-Dame', lat:48.8530, lon:2.3499, d:'Gothic cathedral on the Île de la Cité, reopened in 2024 after the fire.'},
      {n:'Musée d\'Orsay', lat:48.8600, lon:2.3266, d:'A railway station built for the 1900 World\'s Fair, now a museum.'},
      {n:'Les Invalides', lat:48.8560, lon:2.3125, d:'The golden dome above Napoleon\'s tomb.'},
      {n:'Eiffel Tower', lat:48.8584, lon:2.2945, d:'Built for the 1889 World\'s Fair.'}
    ],
    river:[[[48.8455,2.369],[48.8505,2.3585],[48.8535,2.352],[48.8575,2.343],[48.8605,2.332],[48.8636,2.321],[48.8640,2.310],[48.8622,2.300],[48.8590,2.2925],[48.8540,2.2830],[48.8480,2.2750]],135],
    person:{name:'Bernard Arnault', initials:'BA', role:'Chairman and CEO of LVMH',
      story:'Born in Roubaix in 1949, Bernard Arnault trained as an engineer and joined his family\'s construction firm. In 1984 he bought the bankrupt textile group Boussac, mainly for one jewel inside it: Christian Dior. From there he built LVMH, the world\'s largest luxury group, home to Louis Vuitton, Moët & Chandon, Hennessy, Tiffany and Sephora. At times he has been ranked the richest person on earth.',
      fact:'Arnault is a trained classical pianist; his wife, Hélène Mercier, is a concert pianist.'},
    script:{
      intro:[['Narrator','Paris at golden hour. Home city of Marc and Élise Laurent.'],
        ['Marc','Bienvenue à Paris. The boulevards are wide, but not wide enough to pass us.'],
        ['Tobi','Champs-Élysées first, then along the Seine. Stay sharp.'],
        ['Kemi','Tobi, you\'re humming again.'],
        ['Tobi','It\'s Paris. Everybody hums in Paris.']],
      outro:['Tobi','Halfway through the season, and we\'re still in it.'],
      next:'Next time: Mumbai, a city built on seven islands.'},
    theme:{sky:['#27346a','#a6678a','#f8bf8a'], sun:{x:.6,y:.82,r:.07,c:'#ffe1a8',glow:'rgba(255,190,130,.5)'},
      fog:'#e6b49c', grass:['#7c8a3e','#738138'], road:['#57534f','#514d49'], rumble:['#f2efe8','#2b3a6e'], lane:'#f2efe8',
      far:{type:'hills',color:'#8a6f8e'}, mid:{type:'parisSkyline',color:'#6b5a78'}, clouds:.6, weather:'leaves',
      scenery:['haussmann','haussmann','poplar','poplar','lamp'], landmark:'eiffel'}
  },
  {
    id:'mumbai', place:'Mumbai', country:'India', era:'Gateway of India · 1924',
    ep:'Seven Islands', tag:'Seven islands that became a city of dreams',
    history:'Mumbai was once seven separate islands, joined over centuries by land reclaimed from the sea. On its waterfront stands the Gateway of India, completed in 1924 to mark the 1911 visit of King George V. In 1948, the last British troops left independent India by marching out through its arch.',
    facts:['Mumbai was once seven separate islands.','The Gateway of India was completed in 1924.','Chhatrapati Shivaji Terminus, finished in 1888, is a UNESCO World Heritage Site.'],
    places:['Bandra–Worli Sea Link','Marine Drive','Chhatrapati Shivaji Terminus','Colaba Causeway'],
    person:{name:'Mukesh Ambani', initials:'MA', role:'Chairman of Reliance Industries',
      story:'His father, Dhirubhai Ambani, came to Bombay after working as a clerk in Aden and in 1958 started a small yarn-trading business from a modest office. Mukesh, born in Aden in 1957, joined Reliance in 1981 and helped turn it into India\'s largest private company: refining, petrochemicals, retail, and Jio, which launched in 2016 and brought cheap mobile data to hundreds of millions of people.',
      fact:'Reliance\'s complex at Jamnagar is the largest oil refining site in the world.'},
    script:{
      intro:[['Narrator','Mumbai. Twenty million people, and every one of them in a hurry.'],
        ['Arjun','Our city, our rules. Stay in your lane!'],
        ['Kemi','After Lagos traffic? Arjun, this is a holiday.'],
        ['Tobi','The Gateway of India is the finish. Eyes on the arch.']],
      outro:['Kemi','Next time I\'m bringing a horn as loud as theirs.'],
      next:'Next time: Hong Kong after dark.'},
    theme:{sky:['#4a1d5e','#d2546a','#ffb36b'], sun:{x:.34,y:.84,r:.08,c:'#ffd27a',glow:'rgba(255,140,80,.55)'},
      fog:'#eda07c', grass:['#7a8f3c','#718536'], road:['#5a4f4f','#544949'], rumble:['#f7f0e0','#e07a2a'], lane:'#f7f0e0',
      far:{type:'sea',color:'#7a4a6e',land:'#5a3a5e'}, mid:{type:'skyline',color:'#6a3a5a',lit:.12}, clouds:.5, weather:'none',
      scenery:['palm','palm','colonial','colonial','bush'], landmark:'gateway'}
  },
  {
    id:'hongkong', place:'Hong Kong', country:'China', era:'Victoria Harbour · since 1841',
    ep:'Neon Harbour', tag:'A fishing coast turned city of light',
    history:'Hong Kong grew from fishing villages around one of the finest deep-water harbours on earth. Traders arrived in the 1840s, and Victoria Harbour became one of the world\'s great ports. At night its skyline of towers climbs the hills behind the water, lit like a circuit board.',
    facts:['The Peak Tram has climbed Victoria Peak since 1888.','Victoria Harbour is one of the deepest natural harbours in Asia.','Every night the skyline joins in the Symphony of Lights show.'],
    places:['Nathan Road','Cross-Harbour Tunnel','Central','Victoria Harbour'],
    person:{name:'Li Ka-shing', initials:'LK', role:'Founder of Cheung Kong and CK Hutchison',
      story:'Li Ka-shing fled war-torn Chaozhou with his family in 1940. When his father died, he left school at about 15 to support the family, working long days at a plastics trading company. In 1950, with his savings and loans from relatives, he started his own firm, Cheung Kong, making plastic flowers. "The king of plastic flowers" went on to build an empire of property, ports, telecoms and retail stretching across the world.',
      fact:'Hong Kong newspapers nicknamed him "Superman" for his business instincts.'},
    script:{
      intro:[['Narrator','Hong Kong, midnight. The city never turns off the lights.'],
        ['Wei','Night racing is our speciality. Try to keep up.'],
        ['Tobi','Neon on both sides. It\'s like driving through a pinball machine.'],
        ['Kemi','Then let\'s score some points.']],
      outro:['Tobi','Three episodes left. America\'s next.'],
      next:'Next time: a quiet house in Omaha, and the most patient investor in the world.'},
    theme:{night:true, sky:['#04071a','#121844','#3a2160'], moon:{x:.8,y:.16,r:.028},
      fog:'#271d48', grass:['#1b2729','#172224'], road:['#2c2d36','#282931'], rumble:['#d8d8e8','#d0306a'], lane:'#e8d070',
      far:{type:'mountains',color:'#191a36'}, mid:{type:'skyline',color:'#141634',lit:.55,dense:true}, clouds:.25, weather:'none', stars:.35,
      scenery:['tower','tower','neon','neon','lamp'], landmark:'hkTower'}
  },
  {
    id:'omaha', place:'Omaha', country:'Nebraska, USA', era:'Gateway to the West · 1854',
    ep:'The Oracle\'s Road', tag:'Where the rails to the Pacific began',
    history:'Founded in 1854 on the Missouri River, Omaha became the starting point of the Union Pacific Railroad. Ground was broken here in 1863 for America\'s first transcontinental line, which met the Central Pacific at Promontory Summit, Utah, in 1869, joining the country coast to coast.',
    facts:['Union Pacific broke ground for the transcontinental railroad here in 1863.','The golden spike was driven at Promontory Summit, Utah, in 1869.','Union Pacific still has its headquarters in Omaha.'],
    places:['Old Market','The Durham Museum','Bob Kerrey Pedestrian Bridge','Joslyn Art Museum'],
    person:{name:'Warren Buffett', initials:'WB', role:'Chairman of Berkshire Hathaway, "the Oracle of Omaha"',
      story:'Born in Omaha in 1930, Warren Buffett bought his first stock at 11 and filed his first tax return at 13, deducting his bicycle as a work expense for his paper route. In 1965 he took control of a struggling textile mill called Berkshire Hathaway and turned it into a giant that owns GEICO, BNSF Railway and Dairy Queen. He still lives in the Omaha house he bought in 1958 for $31,500, and has pledged to give away more than 99% of his fortune.',
      fact:'Shareholders call Berkshire\'s annual meeting in Omaha "Woodstock for Capitalists".'},
    script:{
      intro:[['Narrator','Omaha, Nebraska. Wheat to the horizon, and rails that crossed a continent.'],
        ['Hanna','Long straight roads. Finally, a race for real engines.'],
        ['Kemi','Long straight roads. Finally, room for nitro.'],
        ['Tobi','Patience, Kemi. Wait for the right pitch.']],
      outro:['Kemi','Wait for the right pitch. Then swing.'],
      next:'Next time: rain, pine trees, and the city where the PC age began.'},
    theme:{sky:['#2c6cc2','#78b1e6','#d8ecfa'], sun:{x:.3,y:.14,r:.04,c:'#fffef0',glow:'rgba(255,255,235,.45)'},
      fog:'#d6e4ea', grass:['#c7b15a','#bca64f'], road:['#5b5e60','#55585a'], rumble:['#f2f2f2','#c23b2e'], lane:'#f5d34a',
      far:{type:'plains',color:'#8aa0a8'}, mid:{type:'hills',color:'#a89a4f'}, clouds:1.1, weather:'none',
      scenery:['barn','silo','pole','wheat','wheat','tree'], landmark:'locomotive'}
  },
  {
    id:'seattle', place:'Seattle', country:'Washington, USA', era:'Gold Rush gateway · 1897',
    ep:'Rain City', tag:'Rain, evergreens and a ton of gold',
    history:'In July 1897 the steamship Portland docked in Seattle carrying "a ton of gold" from the Klondike. Overnight the city became the gateway to the Yukon gold rush, outfitting tens of thousands of prospectors. The Space Needle was built for the 1962 World\'s Fair, and the evergreen hills give the Emerald City its name.',
    facts:['The steamship Portland brought news of Klondike gold to Seattle in 1897.','The Space Needle was built in about a year for the 1962 World\'s Fair.','Pike Place Market has been open since 1907.'],
    places:['Pioneer Square','Pike Place Market','Lake Union','Seattle Center'],
    person:{name:'Bill Gates', initials:'BG', role:'Co-founder of Microsoft',
      story:'Born in Seattle in 1955, Bill Gates first programmed computers at Lakeside School here, alongside his friend Paul Allen. The two founded Microsoft in 1975 in Albuquerque and moved it home to the Seattle area in 1979. Its software put a PC on nearly every desk. Across the lake, a few years later, Jeff Bezos started Amazon in a Bellevue garage in 1994, selling books.',
      fact:'Gates has said his foundation will give away nearly all of his fortune and close its doors in 2045.'},
    script:{
      intro:[['Narrator','Seattle. It\'s raining. It\'s always raining.'],
        ['Lukas','Wet roads separate the drivers from the passengers.'],
        ['Tobi','Wipers on, assist on, nerves of steel.'],
        ['Kemi','Two out of three isn\'t bad.']],
      outro:['Tobi','One more. Just one more, and it\'s the big one.'],
      next:'Season finale: Starbase, Texas. The last race of the Fortune Trail, under a rocket.'},
    theme:{sky:['#29343f','#56687a','#9aa9b5'],
      fog:'#8b99a4', grass:['#2f5a3c','#2a5236'], road:['#3d4247','#383c41'], rumble:['#e8eef2','#2f7a4f'], lane:'#e8eef2',
      far:{type:'rainier',color:'#5a6a7c'}, mid:{type:'skyline',color:'#3a4a58',lit:.3}, clouds:1.4, weather:'rain',
      scenery:['pine','pine','pine','craftsman','lamp'], landmark:'needle'}
  },
  {
    id:'starbase', place:'Starbase', country:'Texas, USA', era:'Palmito Ranch 1865 · Starship today',
    ep:'Countdown', tag:'From the last battle of the Civil War to the edge of space',
    history:'On these dunes by the Rio Grande, the Battle of Palmito Ranch was fought in May 1865: the last land battle of the American Civil War, a month after Lee\'s surrender. A century and a half later, Boca Chica beach became Starbase, where giant steel rockets are built in the open air and launched toward orbit.',
    facts:['Palmito Ranch, May 1865, was the last land battle of the Civil War.','Starship with its Super Heavy booster stands over 120 metres tall.','In 2024 the launch tower caught a returning booster with its "chopsticks".'],
    places:['Brownsville','Palmito Ranch Battlefield','Boca Chica Beach','Starbase Launch Site'],
    person:{name:'Elon Musk', initials:'EM', role:'CEO of SpaceX and Tesla',
      story:'Born in Pretoria, South Africa, in 1971, Elon Musk taught himself to code and sold his first video game, Blastar, at 12. He moved to Canada at 17, then to the US, where he co-founded Zip2 and X.com, which became PayPal. He put the proceeds into SpaceX in 2002 and into Tesla. After three failed launches, SpaceX\'s fourth Falcon 1 reached orbit in 2008. Here at Starbase, which voted to become its own city in 2025, SpaceX builds and flies Starship, the largest rocket ever launched.',
      fact:'SpaceX catches returning Super Heavy boosters with the tower\'s mechanical arms, nicknamed "chopsticks".'},
    script:{
      intro:[['Narrator','Season finale. Starbase, Texas. Tonight a rocket flies, and so do we.'],
        ['Ada','Twelve cities, Adeyemis. It ends here.'],
        ['Kemi','It ends at the finish line. Let\'s see who\'s there first.'],
        ['Tobi','For the garage. For Dad.']],
      outro:['Tobi','Look up, Kemi. They\'re launching.'],
      next:'Season One of the Fortune Trail is complete. Thank you for driving with the Adeyemis.'},
    theme:{night:true, sky:['#01020a','#0b1438','#2a3262'], moon:{x:.22,y:.2,r:.032},
      fog:'#1c2246', grass:['#4a4434','#433d2f'], road:['#2a2b30','#26272c'], rumble:['#e0e0e8','#3a6ad8'], lane:'#d8d8e0',
      far:{type:'sea',color:'#121838',land:'#0e1330'}, mid:{type:'dunes',color:'#262634'}, clouds:.2, weather:'none', stars:1,
      scenery:['dunegrass','dunegrass','palm','hangar','lamp'], landmark:'starship'}
  }
];

/* The couples (fictional). */
const YOU = {id:'you', name:'Adeyemi', pair:'Kemi & Tobi', color:'#d9a52c'};
const TEAMS = [
  {id:'okafor',  name:'Okafor',  pair:'Chidi & Ada',   color:'#c7372f', skill:.00, voice:['Chidi','Ada']},
  {id:'laurent', name:'Laurent', pair:'Marc & Élise',  color:'#2f6fd1', skill:.02, voice:['Marc','Élise']},
  {id:'chen',    name:'Chen',    pair:'Wei & Mei',     color:'#e7e7ea', skill:.035, voice:['Wei','Mei']},
  {id:'muller',  name:'Müller',  pair:'Lukas & Hanna', color:'#2d9a5a', skill:.05, voice:['Lukas','Hanna']},
  {id:'sharma',  name:'Sharma',  pair:'Arjun & Priya', color:'#8a3fd0', skill:.065, voice:['Arjun','Priya']}
];
const SPEAKER_COLOR = {Kemi:'#ffd27a', Tobi:'#7fe0d0', Narrator:'#d8cfe8', Chidi:'#ff8a7a', Ada:'#ff8a7a', Marc:'#8ab4ff', 'Élise':'#8ab4ff',
  Wei:'#f0f0f0', Mei:'#f0f0f0', Lukas:'#8ae0a0', Hanna:'#8ae0a0', Arjun:'#d0a0ff', Priya:'#d0a0ff'};
const POINTS = [25,18,15,12,10,8];

/* Cars in the garage: 13 original designs. Stats are multipliers on the base car; style is the 2D fallback look. */
const CARS_REAL = [
  {id:'saloon', name:'Family Saloon', style:'coupe', color:'#c9a24a', roof:'body', price:0, top:1, acc:1, grip:1, nitro:1,
    desc:'The mid-size saloon Tobi\'s father rebuilt. The car you see on every Nigerian street.'},
  {id:'hatch', name:'City Hatch', style:'coupe', color:'#d8dadc', roof:'body', price:20, top:.94, acc:1.1, grip:1.15, nitro:.95,
    desc:'A small five-door hatchback. Light and easy to thread through traffic.'},
  {id:'minivan', name:'People Carrier', style:'rally', color:'#5a6068', roof:'body', price:60, top:.95, acc:1, grip:1.05, nitro:1.1, tough:true,
    desc:'A seven-seat minivan with sliding doors. Built for school runs and long trips.'},
  {id:'estate', name:'Nordic Estate', style:'rally', color:'#2a4a6e', roof:'body', price:90, top:1.02, acc:1.02, grip:1.08, nitro:1.05,
    desc:'A long, square-backed estate with tall tail lights and a slatted grille.'},
  {id:'exec', name:'Executive Saloon', style:'gt', color:'#15171a', roof:'body', price:140, top:1.07, acc:1.04, grip:1.04, nitro:1.05,
    desc:'A long-bonnet executive saloon with a tall chrome grille. Quick and composed.'},
  {id:'suvmid', name:'Luxury SUV', style:'rally', color:'#e6e6e2', roof:'body', price:160, top:1, acc:1.05, grip:1.02, nitro:1.05, tough:true,
    desc:'A smooth mid-size luxury SUV, the favourite of Lagos executives.'},
  {id:'hilux', name:'Double-Cab Pickup', style:'muscle', color:'#f0f0ee', roof:'body', price:180, top:.98, acc:1.08, grip:.98, nitro:1.1, tough:true,
    desc:'A tough double-cab pickup. Nothing on the road slows it down.'},
  {id:'offroad', name:'Bush Cruiser', style:'rally', color:'#3a3d40', roof:'body', price:230, top:1, acc:1.06, grip:1.05, nitro:1.12, tough:true,
    desc:'A big, square full-size 4x4 with roof rails and a chrome grille.'}
];
const CARS_CONCEPT = [
  {id:'coupex', name:'Lagoon Coupe X', style:'coupe', color:'#e8a51c', roof:'black', price:70, top:1, acc:1, grip:1, nitro:1,
    desc:'A sharp electric coupe-crossover with a black roof.'},
  {id:'micro', name:'Pip City', style:'rally', color:'#b7d43a', roof:'body', price:30, top:.9, acc:1.18, grip:1.3, nitro:1,
    desc:'A tiny two-seat city cube. Slow on the straights, unbeatable in the bends.'},
  {id:'cross', name:'Arc Crossover', style:'coupe', color:'#c9cbcf', roof:'black', price:40, top:.98, acc:1.05, grip:1.08, nitro:1,
    desc:'Silver crossover with a floating black roof. Easy to drive fast.'},
  {id:'van', name:'Courier Van', style:'rally', color:'#a8cc3a', roof:'body', price:50, top:.92, acc:1.05, grip:1.1, nitro:1, tough:true,
    desc:'An electric delivery van. Bumps barely slow it down.'},
  {id:'smallsuv', name:'Kite Compact', style:'rally', color:'#e0322b', roof:'black', price:60, top:.96, acc:1.12, grip:1.12, nitro:.95,
    desc:'Small, bright and nimble, with a quick getaway.'},
  {id:'pod', name:'Harbour Shuttle', style:'rally', color:'#eef0f2', roof:'white', price:80, top:.9, acc:1, grip:1.15, nitro:1.2, tough:true,
    desc:'A glass-sided shuttle pod with a big battery for long nitro.'},
  {id:'sedan', name:'Glide Sedan', style:'gt', color:'#cdb9a8', roof:'black', price:90, top:1.04, acc:1, grip:1.05, nitro:1.05,
    desc:'A low, slippery fastback saloon in champagne.'},
  {id:'suv', name:'Gale SUV', style:'rally', color:'#7d8288', roof:'body', price:110, top:1, acc:1.04, grip:1.05, nitro:1, tough:true,
    desc:'A solid family SUV in storm grey.'},
  {id:'cruiser', name:'Trail Cub', style:'rally', color:'#7fb1de', roof:'black', price:120, top:.95, acc:1.1, grip:1.25, nitro:.95, tough:true,
    desc:'Boxy little off-roader. Grips anything and shrugs off knocks.'},
  {id:'fastback', name:'Ember Fastback', style:'gt', color:'#c81e24', roof:'black', price:150, top:1.06, acc:1.02, grip:1, nitro:1.05,
    desc:'A tall red fastback with a long, fast stride.'},
  {id:'pickup', name:'Atlas Pickup', style:'muscle', color:'#eceef0', accent:'#16181c', roof:'black', price:170, top:.98, acc:1.08, grip:1, nitro:1.1, tough:true,
    desc:'A full-size electric pickup. Heavy, strong and quick off the line.'},
  {id:'bigsuv', name:'Summit SUV', style:'rally', color:'#e4e6ea', roof:'black', price:190, top:1, acc:1, grip:1.02, nitro:1.1, tough:true,
    desc:'A three-row SUV that cruises at speed and barely notices bumps.'},
  {id:'sports', name:'Sol Roadster', style:'roadster', color:'#f2b01a', roof:'black', price:300, top:1.09, acc:1.15, grip:1.2, nitro:1.25,
    desc:'The fastest car in the garage: a low mid-engine sports car.'}
];

CARS_CONCEPT.forEach(c=>c.concept=true);
const CARS = CARS_REAL.concat(CARS_CONCEPT);

/* Time of day and weather, chosen before a race. */
const TOD = {
  morning:{sky:['#3a78c8','#9cc4e8','#f6e6c8'], sun:{x:.25,y:.72,r:.05,c:'#fff0d0',glow:'rgba(255,230,190,.5)'}, fog:'#e8e4da'},
  midday:{sky:['#2a6cc8','#7ab4ea','#d8ecfa'], sun:{x:.4,y:.12,r:.04,c:'#fffef4',glow:'rgba(255,255,240,.45)'}, fog:'#d8e6ee'},
  sunset:{sky:['#2e3a78','#c8687a','#ffb070'], sun:{x:.6,y:.86,r:.075,c:'#ffd090',glow:'rgba(255,150,90,.55)'}, fog:'#e6a88a'},
  night:{sky:['#03061a','#0d1640','#2a2f5a'], moon:{x:.75,y:.18,r:.03}, stars:.8, fog:'#1a2038'}
};
const COND_LABEL={story:'As in the story',morning:'Morning',midday:'Midday',sunset:'Sunset',night:'Night',clear:'Clear',cloudy:'Cloudy',rain:'Rain'};

/* Lucky spin prizes. */
const PRIZES = [
  {label:'$10M', type:'cash', v:10, c:'#e8b04b'},
  {label:'NITRO+', type:'perk', v:'nitro', c:'#2a7fd8'},
  {label:'$25M', type:'cash', v:25, c:'#a2341f'},
  {label:'SHIELD', type:'perk', v:'shield', c:'#2d9a5a'},
  {label:'$5M', type:'cash', v:5, c:'#e8b04b'},
  {label:'NEW CAR', type:'car', c:'#8a3fd0'},
  {label:'HEAD START', type:'perk', v:'boost', c:'#2a7fd8'},
  {label:'$50M', type:'cash', v:50, c:'#a2341f'}
];
const PERK_TEXT = {nitro:'Nitro+: a bigger nitro tank this race', shield:'Shield: your first crash costs no speed', boost:'Head start: free nitro at the green light'};
