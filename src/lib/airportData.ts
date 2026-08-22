export const MEGA_HUBS = new Set([
  "ORD", "DFW", "CLT", "MIA", "ATL", "DEN", "LAX", "PHX", "JFK", "DCA", "SFO", "SEA"
]);

export const MAJOR_HUBS = new Set([
  "ORD", "DFW", "CLT", "MIA", "ATL", "DEN", "LAX", "PHX", "JFK", "DCA", "DTW", "MSP", "SFO", "IAH", "BOS", "SEA", "LAS", "SLC", "PHL", "SAN", "AUS", "MCO", "BNA", "RDU", "CLE", "IND", "STL", "MCI", "CVG", "YYZ"
]);

// Map of secondary/adjacent metro airports to their flagship hub to prevent visual overlap on map
export const METRO_SECONDARY_TO_PRIMARY: Record<string, string> = {
  MDW: "ORD", // Chicago: Show ORD
  LGA: "JFK", // New York Metro: Show JFK
  EWR: "JFK",
  HPN: "JFK",
  IAD: "DCA", // Washington DC / Baltimore: Show DCA
  BWI: "DCA",
  DAL: "DFW", // Dallas / Fort Worth: Show DFW
  HOU: "IAH", // Houston Metro: Show IAH
  FLL: "MIA", // South Florida: Show MIA
  PBI: "MIA",
  OAK: "SFO", // SF Bay Area: Show SFO
  SJC: "SFO",
  BUR: "LAX", // Los Angeles Basin: Show LAX
  SNA: "LAX",
  ONT: "LAX",
  LGB: "LAX",
};

export const ALL_MAJOR_AIRPORTS: Record<string, { name: string; lat: number; lng: number; cat: "VFR" | "MVFR" | "IFR" | "LIFR" }> = {
  // Texas, Southwest & Gulf Coast
  DFW: { name: "Dallas/Fort Worth Intl", lat: 32.8998, lng: -97.0403, cat: "VFR" },
  DAL: { name: "Dallas Love Field", lat: 32.8471, lng: -96.8518, cat: "VFR" },
  CRP: { name: "Corpus Christi Intl", lat: 27.7704, lng: -97.5012, cat: "VFR" },
  SAT: { name: "San Antonio Intl", lat: 29.5337, lng: -98.4698, cat: "VFR" },
  AUS: { name: "Austin-Bergstrom Intl", lat: 30.1945, lng: -97.6699, cat: "VFR" },
  IAH: { name: "Houston George Bush", lat: 29.9902, lng: -95.3368, cat: "VFR" },
  HOU: { name: "Houston William P Hobby", lat: 29.6454, lng: -95.2789, cat: "VFR" },
  BRO: { name: "Brownsville/South Padre", lat: 25.9068, lng: -97.4259, cat: "VFR" },
  HRL: { name: "Valley Intl Harlingen", lat: 26.2285, lng: -97.6544, cat: "VFR" },
  MFE: { name: "McAllen Miller Intl", lat: 26.1758, lng: -98.2386, cat: "VFR" },
  LRD: { name: "Laredo Intl", lat: 27.5438, lng: -99.4616, cat: "VFR" },
  ELP: { name: "El Paso Intl", lat: 31.8072, lng: -106.3778, cat: "VFR" },
  MAF: { name: "Midland Intl Air & Space Port", lat: 31.9425, lng: -102.2019, cat: "VFR" },
  LBB: { name: "Lubbock Preston Smith Intl", lat: 33.6636, lng: -101.8228, cat: "VFR" },
  AMA: { name: "Rick Husband Amarillo Intl", lat: 35.2194, lng: -101.7059, cat: "VFR" },
  ABI: { name: "Abilene Regional", lat: 32.4113, lng: -99.6819, cat: "VFR" },
  SPS: { name: "Wichita Falls Regional", lat: 33.9888, lng: -98.4919, cat: "VFR" },
  ACT: { name: "Waco Regional", lat: 31.6113, lng: -97.2305, cat: "VFR" },
  TYR: { name: "Tyler Pounds Regional", lat: 32.3541, lng: -95.4024, cat: "VFR" },
  GGG: { name: "East Texas Regional Longview", lat: 32.3840, lng: -94.7115, cat: "VFR" },
  CLL: { name: "Easterwood Field College Station", lat: 30.5886, lng: -96.3638, cat: "VFR" },
  GRK: { name: "Killeen-Fort Cavazos Regional", lat: 31.0649, lng: -97.8278, cat: "VFR" },
  TXK: { name: "Texarkana Regional", lat: 33.4537, lng: -93.9910, cat: "VFR" },

  // Arkansas, Missouri, Kansas, Oklahoma & Plains
  FSM: { name: "Fort Smith Regional", lat: 35.3366, lng: -94.3674, cat: "VFR" },
  LIT: { name: "Bill and Hillary Clinton National", lat: 34.7294, lng: -92.2243, cat: "VFR" },
  XNA: { name: "Northwest Arkansas National", lat: 36.2818, lng: -94.3068, cat: "VFR" },
  SGF: { name: "Springfield-Branson National", lat: 37.2457, lng: -93.3886, cat: "VFR" },
  MCI: { name: "Kansas City Intl", lat: 39.2976, lng: -94.7139, cat: "VFR" },
  STL: { name: "St Louis Lambert Intl", lat: 38.7487, lng: -90.3654, cat: "VFR" },
  COU: { name: "Columbia Regional", lat: 38.8181, lng: -92.2196, cat: "VFR" },
  MHK: { name: "Manhattan Regional", lat: 39.1409, lng: -96.6708, cat: "VFR" },
  ICT: { name: "Wichita Dwight D. Eisenhower", lat: 37.6499, lng: -97.4331, cat: "VFR" },
  TUL: { name: "Tulsa Intl", lat: 36.1984, lng: -95.8881, cat: "VFR" },
  OKC: { name: "Will Rogers World Oklahoma City", lat: 35.3931, lng: -97.6007, cat: "VFR" },

  // Midwest & North (ORD Base & Surrounding Stations)
  ORD: { name: "Chicago O'Hare Intl", lat: 41.9742, lng: -87.9073, cat: "VFR" },
  MDW: { name: "Chicago Midway Intl", lat: 41.7868, lng: -87.7522, cat: "VFR" },
  BMI: { name: "Central Illinois Regional", lat: 40.4771, lng: -88.9159, cat: "VFR" },
  CMI: { name: "Champaign Willard", lat: 40.0392, lng: -88.2781, cat: "VFR" },
  PIA: { name: "General Downing Peoria", lat: 40.6642, lng: -89.6933, cat: "VFR" },
  SPI: { name: "Springfield Abraham Lincoln Capital", lat: 39.8441, lng: -89.6779, cat: "VFR" },
  MLI: { name: "Quad Cities Intl", lat: 41.4485, lng: -90.5075, cat: "VFR" },
  EVV: { name: "Evansville Regional", lat: 38.0378, lng: -87.5306, cat: "VFR" },
  IND: { name: "Indianapolis Intl", lat: 39.7173, lng: -86.2944, cat: "VFR" },
  FWA: { name: "Fort Wayne Intl", lat: 40.9789, lng: -85.1945, cat: "VFR" },
  SBN: { name: "South Bend Intl", lat: 41.7087, lng: -86.3173, cat: "VFR" },
  CVG: { name: "Cincinnati/Northern KY", lat: 39.0461, lng: -84.6622, cat: "VFR" },
  DAY: { name: "Dayton Intl", lat: 39.9024, lng: -84.2194, cat: "VFR" },
  CMH: { name: "John Glenn Columbus Intl", lat: 39.9980, lng: -82.8919, cat: "VFR" },
  CAK: { name: "Akron-Canton", lat: 40.9161, lng: -81.4422, cat: "VFR" },
  CLE: { name: "Cleveland Hopkins Intl", lat: 41.4117, lng: -81.8498, cat: "VFR" },
  DTW: { name: "Detroit Metropolitan", lat: 42.2162, lng: -83.3554, cat: "VFR" },
  LAN: { name: "Capital Region Intl Lansing", lat: 42.7787, lng: -84.5874, cat: "VFR" },
  GRR: { name: "Gerald R. Ford Grand Rapids", lat: 42.8808, lng: -85.5228, cat: "VFR" },
  AZO: { name: "Kalamazoo/Battle Creek Intl", lat: 42.2350, lng: -85.5521, cat: "VFR" },
  TVC: { name: "Cherry Capital Traverse City", lat: 44.7414, lng: -85.5822, cat: "VFR" },
  MQT: { name: "Sawyer Intl Marquette", lat: 46.3536, lng: -87.3953, cat: "VFR" },
  MKE: { name: "Milwaukee Mitchell Intl", lat: 42.9472, lng: -87.8966, cat: "VFR" },
  MSN: { name: "Dane County Regional Madison", lat: 43.1398, lng: -89.3375, cat: "VFR" },
  GRB: { name: "Green Bay Austin Straubel Intl", lat: 44.4835, lng: -88.1308, cat: "VFR" },
  ATW: { name: "Appleton Intl", lat: 44.2581, lng: -88.5191, cat: "VFR" },
  CWA: { name: "Central Wisconsin Airport", lat: 44.7776, lng: -89.6668, cat: "VFR" },
  MSP: { name: "Minneapolis-St Paul Intl", lat: 44.8848, lng: -93.2223, cat: "VFR" },
  RST: { name: "Rochester Intl", lat: 43.9083, lng: -92.5000, cat: "VFR" },
  DLH: { name: "Duluth Intl", lat: 46.8419, lng: -92.1987, cat: "VFR" },
  CID: { name: "The Eastern Iowa Airport", lat: 41.8847, lng: -91.7108, cat: "VFR" },
  DSM: { name: "Des Moines Intl", lat: 41.5340, lng: -93.6567, cat: "VFR" },
  DBQ: { name: "Dubuque Regional", lat: 42.4020, lng: -90.7095, cat: "VFR" },
  SUX: { name: "Sioux Gateway Airport", lat: 42.4026, lng: -96.3844, cat: "VFR" },
  FSD: { name: "Sioux Falls Regional", lat: 43.5855, lng: -96.7412, cat: "VFR" },
  FAR: { name: "Hector Intl Fargo", lat: 46.9207, lng: -96.8158, cat: "VFR" },
  BIS: { name: "Bismarck Municipal", lat: 46.7728, lng: -100.7460, cat: "VFR" },
  LNK: { name: "Lincoln Airport", lat: 40.8510, lng: -96.7592, cat: "VFR" },
  OMA: { name: "Eppley Airfield Omaha", lat: 41.3032, lng: -95.8941, cat: "VFR" },
  GRI: { name: "Central Nebraska Regional", lat: 40.9675, lng: -98.3096, cat: "VFR" },
  EAR: { name: "Kearney Regional", lat: 40.7270, lng: -99.0068, cat: "VFR" },
  RAP: { name: "Rapid City Regional", lat: 44.0453, lng: -103.0574, cat: "VFR" },
  BIL: { name: "Billings Logan Intl", lat: 45.8077, lng: -108.5428, cat: "VFR" },
  BZN: { name: "Bozeman Yellowstone Intl", lat: 45.7772, lng: -111.1530, cat: "VFR" },

  // Southeast & East Coast (MIA Base & Regional Connections)
  MIA: { name: "Miami Intl", lat: 25.7959, lng: -80.2870, cat: "VFR" },
  FLL: { name: "Fort Lauderdale-Hollywood", lat: 26.0726, lng: -80.1527, cat: "VFR" },
  PBI: { name: "Palm Beach Intl", lat: 26.6832, lng: -80.0956, cat: "VFR" },
  RSW: { name: "Southwest Florida Intl", lat: 26.5362, lng: -81.7552, cat: "VFR" },
  TPA: { name: "Tampa Intl", lat: 27.9755, lng: -82.5332, cat: "VFR" },
  MCO: { name: "Orlando Intl", lat: 28.4294, lng: -81.3090, cat: "VFR" },
  JAX: { name: "Jacksonville Intl", lat: 30.4941, lng: -81.6879, cat: "VFR" },
  EYW: { name: "Key West Intl", lat: 24.5561, lng: -81.7596, cat: "VFR" },
  ECP: { name: "Northwest Florida Beaches Panama City", lat: 30.3571, lng: -85.7954, cat: "VFR" },
  VPS: { name: "Destin-Fort Walton Beach", lat: 30.4832, lng: -86.5254, cat: "VFR" },
  PNS: { name: "Pensacola Intl", lat: 30.4734, lng: -87.1866, cat: "VFR" },
  TLH: { name: "Tallahassee Intl", lat: 30.3965, lng: -84.3503, cat: "VFR" },
  GNV: { name: "Gainesville Regional", lat: 29.6901, lng: -82.2718, cat: "VFR" },
  ATL: { name: "Hartsfield-Jackson Atlanta", lat: 33.6407, lng: -84.4277, cat: "VFR" },
  SAV: { name: "Savannah/Hilton Head Intl", lat: 32.1276, lng: -81.2021, cat: "VFR" },
  CHS: { name: "Charleston Intl", lat: 32.8986, lng: -80.0405, cat: "VFR" },
  MYR: { name: "Myrtle Beach Intl", lat: 33.6797, lng: -78.9283, cat: "VFR" },
  CAE: { name: "Columbia Metropolitan", lat: 33.9388, lng: -81.1195, cat: "VFR" },
  GSP: { name: "Greenville-Spartanburg Intl", lat: 34.8956, lng: -82.2189, cat: "VFR" },
  AVL: { name: "Asheville Regional", lat: 35.4362, lng: -82.5418, cat: "VFR" },
  CLT: { name: "Charlotte Douglas Intl", lat: 35.2140, lng: -80.9431, cat: "VFR" },
  RDU: { name: "Raleigh-Durham Intl", lat: 35.8776, lng: -78.7875, cat: "VFR" },
  GSO: { name: "Piedmont Triad Intl Greensboro", lat: 36.0977, lng: -79.9373, cat: "VFR" },
  ILM: { name: "Wilmington Intl", lat: 34.2706, lng: -77.9026, cat: "VFR" },
  FAY: { name: "Fayetteville Regional", lat: 34.9912, lng: -78.8803, cat: "VFR" },
  TRI: { name: "Tri-Cities Regional", lat: 36.4752, lng: -82.4074, cat: "VFR" },
  TYS: { name: "McGhee Tyson Knoxville", lat: 35.8110, lng: -83.9940, cat: "VFR" },
  CHA: { name: "Chattanooga Metropolitan", lat: 35.0353, lng: -85.2038, cat: "VFR" },
  BNA: { name: "Nashville Intl", lat: 36.1245, lng: -86.6782, cat: "VFR" },
  MEM: { name: "Memphis Intl", lat: 35.0424, lng: -89.9767, cat: "VFR" },
  BHM: { name: "Birmingham-Shuttlesworth Intl", lat: 33.5629, lng: -86.7535, cat: "VFR" },
  HSV: { name: "Huntsville Intl", lat: 34.6372, lng: -86.7725, cat: "VFR" },
  MOB: { name: "Mobile Regional", lat: 30.6912, lng: -88.2428, cat: "VFR" },
  MSY: { name: "Louis Armstrong New Orleans", lat: 29.9911, lng: -90.2580, cat: "MVFR" },
  BTR: { name: "Baton Rouge Metropolitan", lat: 30.5332, lng: -91.1496, cat: "VFR" },
  LFT: { name: "Lafayette Regional", lat: 30.2053, lng: -91.9876, cat: "VFR" },
  SHV: { name: "Shreveport Regional", lat: 32.4466, lng: -93.8256, cat: "VFR" },
  MLU: { name: "Monroe Regional", lat: 32.5109, lng: -92.0377, cat: "VFR" },
  JAN: { name: "Jackson-Medgar Wiley Evers Intl", lat: 32.3112, lng: -90.0759, cat: "VFR" },
  GPT: { name: "Gulfport-Biloxi Intl", lat: 30.4056, lng: -89.0698, cat: "VFR" },

  // Mid-Atlantic & Northeast
  RIC: { name: "Richmond Intl", lat: 37.5052, lng: -77.3197, cat: "VFR" },
  ORF: { name: "Norfolk Intl", lat: 36.8946, lng: -76.2012, cat: "VFR" },
  PHF: { name: "Newport News/Williamsburg", lat: 37.1319, lng: -76.4930, cat: "VFR" },
  ROA: { name: "Roanoke-Blacksburg Regional", lat: 37.3255, lng: -79.9754, cat: "VFR" },
  CHO: { name: "Charlottesville Albemarle", lat: 38.1386, lng: -78.4529, cat: "VFR" },
  LYH: { name: "Lynchburg Regional", lat: 37.3267, lng: -79.2004, cat: "VFR" },
  CRW: { name: "West Virginia Intl Yeager", lat: 38.3731, lng: -81.5932, cat: "VFR" },
  HTS: { name: "Tri-State Huntington", lat: 38.3667, lng: -82.5580, cat: "VFR" },
  DCA: { name: "Reagan Washington National", lat: 38.8512, lng: -77.0377, cat: "VFR" },
  IAD: { name: "Washington Dulles Intl", lat: 38.9445, lng: -77.4558, cat: "VFR" },
  BWI: { name: "Baltimore/Washington Intl", lat: 39.1754, lng: -76.6683, cat: "VFR" },
  PHL: { name: "Philadelphia Intl", lat: 39.8719, lng: -75.2411, cat: "VFR" },
  AVP: { name: "Wilkes-Barre/Scranton", lat: 41.3385, lng: -75.7242, cat: "VFR" },
  PIT: { name: "Pittsburgh Intl", lat: 40.4915, lng: -80.2329, cat: "VFR" },
  BUF: { name: "Buffalo Niagara Intl", lat: 42.9405, lng: -78.7322, cat: "VFR" },
  ROC: { name: "Frederick Douglass Greater Rochester", lat: 43.1189, lng: -77.6724, cat: "VFR" },
  SYR: { name: "Syracuse Hancock Intl", lat: 43.1111, lng: -76.1063, cat: "VFR" },
  ALB: { name: "Albany Intl", lat: 42.7483, lng: -73.8017, cat: "VFR" },
  JFK: { name: "New York John F. Kennedy", lat: 40.6413, lng: -73.7781, cat: "MVFR" },
  LGA: { name: "New York LaGuardia", lat: 40.7769, lng: -73.8740, cat: "VFR" },
  EWR: { name: "Newark Liberty Intl", lat: 40.6925, lng: -74.1687, cat: "VFR" },
  HPN: { name: "Westchester County", lat: 41.0669, lng: -73.7076, cat: "VFR" },
  BOS: { name: "Boston Logan Intl", lat: 42.3656, lng: -71.0096, cat: "VFR" },
  PVD: { name: "Rhode Island T.F. Green Intl", lat: 41.7225, lng: -71.4325, cat: "VFR" },
  BDL: { name: "Bradley Intl Hartford", lat: 41.9389, lng: -72.6832, cat: "VFR" },
  MHT: { name: "Manchester-Boston Regional", lat: 42.9326, lng: -71.4357, cat: "VFR" },
  PWM: { name: "Portland Intl Jetport", lat: 43.6462, lng: -70.3093, cat: "VFR" },
  BGR: { name: "Bangor Intl", lat: 44.8074, lng: -68.8281, cat: "VFR" },
  BTV: { name: "Patrick Leahy Burlington Intl", lat: 44.4719, lng: -73.1533, cat: "VFR" },

  // West Coast & Mountain (PHX Base & Western Stations)
  PHX: { name: "Phoenix Sky Harbor", lat: 33.4352, lng: -112.0101, cat: "VFR" },
  TUS: { name: "Tucson Intl", lat: 32.1161, lng: -110.9410, cat: "VFR" },
  FLG: { name: "Flagstaff Pulliam", lat: 35.1398, lng: -111.6698, cat: "VFR" },
  YUM: { name: "Yuma Intl", lat: 32.6566, lng: -114.6060, cat: "VFR" },
  PRC: { name: "Prescott Regional", lat: 34.6545, lng: -112.4196, cat: "VFR" },
  ABQ: { name: "Albuquerque Sunport", lat: 35.0402, lng: -106.6092, cat: "VFR" },
  SAF: { name: "Santa Fe Regional", lat: 35.6171, lng: -106.0894, cat: "VFR" },
  ROW: { name: "Roswell Air Center", lat: 33.3016, lng: -104.5306, cat: "VFR" },
  HOB: { name: "Lea County Regional Hobbs", lat: 32.6875, lng: -103.2170, cat: "VFR" },
  LAS: { name: "Harry Reid Intl Las Vegas", lat: 36.0840, lng: -115.1537, cat: "VFR" },
  RNO: { name: "Reno-Tahoe Intl", lat: 39.4991, lng: -119.7681, cat: "VFR" },
  SLC: { name: "Salt Lake City Intl", lat: 40.7884, lng: -111.9778, cat: "VFR" },
  DEN: { name: "Denver Intl", lat: 39.8561, lng: -104.6737, cat: "VFR" },
  COS: { name: "Colorado Springs", lat: 38.8058, lng: -104.7008, cat: "VFR" },
  DRO: { name: "Durango-La Plata County", lat: 37.1515, lng: -107.7540, cat: "VFR" },
  BOI: { name: "Boise Air Terminal", lat: 43.5644, lng: -116.2228, cat: "VFR" },
  IDA: { name: "Idaho Falls Regional", lat: 43.5146, lng: -112.0709, cat: "VFR" },
  LAX: { name: "Los Angeles Intl", lat: 33.9416, lng: -118.4085, cat: "VFR" },
  SAN: { name: "San Diego Intl", lat: 32.7336, lng: -117.1897, cat: "VFR" },
  SNA: { name: "John Wayne Orange County", lat: 33.6757, lng: -117.8674, cat: "VFR" },
  ONT: { name: "Ontario Intl", lat: 34.0560, lng: -117.6012, cat: "VFR" },
  BUR: { name: "Hollywood Burbank", lat: 34.2007, lng: -118.3590, cat: "VFR" },
  PSP: { name: "Palm Springs Intl", lat: 33.8297, lng: -116.5067, cat: "VFR" },
  SBA: { name: "Santa Barbara Municipal", lat: 34.4262, lng: -119.8404, cat: "VFR" },
  FAT: { name: "Fresno Yosemite Intl", lat: 36.7758, lng: -119.7180, cat: "VFR" },
  MRY: { name: "Monterey Regional", lat: 36.5868, lng: -121.8442, cat: "VFR" },
  SFO: { name: "San Francisco Intl", lat: 37.6213, lng: -122.3790, cat: "VFR" },
  SJC: { name: "Norman Y. Mineta San Jose", lat: 37.3626, lng: -121.9290, cat: "VFR" },
  OAK: { name: "Oakland San Francisco Bay", lat: 37.7213, lng: -122.2207, cat: "VFR" },
  SMF: { name: "Sacramento Intl", lat: 38.6954, lng: -121.5908, cat: "VFR" },
  SEA: { name: "Seattle-Tacoma Intl", lat: 47.4502, lng: -122.3088, cat: "MVFR" },
  GEG: { name: "Spokane Intl", lat: 47.6199, lng: -117.5340, cat: "VFR" },
  PDX: { name: "Portland Intl", lat: 45.5898, lng: -122.5951, cat: "VFR" },
  EUG: { name: "Eugene Airport", lat: 44.1246, lng: -123.2120, cat: "VFR" },
  MFR: { name: "Rogue Valley Intl Medford", lat: 42.3742, lng: -122.8730, cat: "VFR" },

  // International & Caribbean Stations
  YYZ: { name: "Toronto Pearson Intl", lat: 43.6777, lng: -79.6248, cat: "VFR" },
  YVR: { name: "Vancouver Intl", lat: 49.1967, lng: -123.1815, cat: "VFR" },
  YUL: { name: "Montreal-Trudeau Intl", lat: 45.4706, lng: -73.7408, cat: "VFR" },
  GDL: { name: "Guadalajara Intl", lat: 20.5218, lng: -103.3112, cat: "VFR" },
  PVR: { name: "Puerto Vallarta Intl", lat: 20.6801, lng: -105.2541, cat: "VFR" },
  CUN: { name: "Cancun Intl", lat: 21.0365, lng: -86.8771, cat: "VFR" },
  CZM: { name: "Cozumel Intl", lat: 20.5224, lng: -86.9256, cat: "VFR" },
  MTY: { name: "Monterrey Intl", lat: 25.7785, lng: -100.1069, cat: "VFR" },
  AGU: { name: "Aguascalientes Intl", lat: 21.7056, lng: -102.3178, cat: "VFR" },
  BJX: { name: "Guanajuato Intl Leon", lat: 20.9935, lng: -101.4808, cat: "VFR" },
  CUU: { name: "Chihuahua General Roberto Fierro", lat: 28.7029, lng: -105.9646, cat: "VFR" },
  HMO: { name: "Hermosillo Intl", lat: 29.0959, lng: -111.0479, cat: "VFR" },
  MLM: { name: "Morelia Intl", lat: 19.8500, lng: -101.0254, cat: "VFR" },
  OAX: { name: "Oaxaca Intl", lat: 16.9999, lng: -96.7266, cat: "VFR" },
  QRO: { name: "Queretaro Intercontinental", lat: 20.6173, lng: -100.1856, cat: "VFR" },
  SLP: { name: "San Luis Potosi Intl", lat: 22.2543, lng: -100.9308, cat: "VFR" },
  TRC: { name: "Torreon Intl", lat: 25.5683, lng: -103.4106, cat: "VFR" },
  ZCL: { name: "Zacatecas Intl", lat: 22.8971, lng: -102.6869, cat: "VFR" },
  NAS: { name: "Lynden Pindling Intl Nassau", lat: 25.0389, lng: -77.4662, cat: "VFR" },
  FPO: { name: "Grand Bahama Intl Freeport", lat: 26.5585, lng: -78.6956, cat: "VFR" },
  ELH: { name: "North Eleuthera", lat: 25.4753, lng: -76.6811, cat: "VFR" },
  MHH: { name: "Marsh Harbour", lat: 26.5114, lng: -77.0835, cat: "VFR" },
  GGT: { name: "Exuma Intl George Town", lat: 23.5627, lng: -75.8776, cat: "VFR" },
  SJU: { name: "Luis Munoz Marin San Juan", lat: 18.4394, lng: -66.0018, cat: "VFR" },
  BZE: { name: "Philip S. W. Goldson Intl Belize", lat: 17.5391, lng: -88.3082, cat: "VFR" },
  RTB: { name: "Juan Manuel Galvez Intl Roatan", lat: 16.3168, lng: -86.5262, cat: "VFR" },
  PLS: { name: "Providenciales Intl", lat: 21.7736, lng: -72.2659, cat: "VFR" },
  CAP: { name: "Cap-Haitien Intl", lat: 19.7330, lng: -72.1947, cat: "VFR" },
};

export function destinationDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in NM
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [lat, lng] = point;

  // Bounding box pre-check
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [pLat, pLng] of polygon) {
    if (pLat < minLat) minLat = pLat;
    if (pLat > maxLat) maxLat = pLat;
    if (pLng < minLng) minLng = pLng;
    if (pLng > maxLng) maxLng = pLng;
  }
  if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) inside = !inside;
  }

  return inside;
}
