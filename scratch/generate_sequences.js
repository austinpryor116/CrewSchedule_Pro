const fs = require('fs');

const julyAndAugustSequences = [
  // 1. Seq 21649 (06JUL - 08JUL) Trade Pickup
  {
    id: 'seq-21649-20260706',
    rank: 'CA',
    sequenceNumber: '21649',
    startDate: '2026-07-06',
    endDate: '2026-07-08',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 754,
    totalCreditMinutes: 1054, // 17.34h
    expTafbHours: 52.55,
    actualTafbHours: 52.55,
    statusTag: 'TT',
    colorTag: 'amber',
    isDropped: false,
    layoverCities: ['EVV', 'BIL'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '0841',
        releaseTime: '1842',
        dutyMinutes: 599,
        payCreditMinutes: 360,
        actualDutyMinutes: 581,
        layoverCity: 'EVV',
        layoverHotelInfo: 'DoubleTree by Hilton Evansville (812-423-5002)',
        legs: [
          { flightNumber: 'AA3453', depAirport: 'ORD', arrAirport: 'PVD', depTime: '0926', arrTime: '1232', blockMinutes: 126, actualDepTime: '0924', actualArrTime: '1217', actualBlockMinutes: 113, equipment: 'E75', tailNumber: 'N345AA', isDeadhead: false },
          { flightNumber: 'AA3453', depAirport: 'PVD', arrAirport: 'ORD', depTime: '1302', arrTime: '1442', blockMinutes: 160, actualDepTime: '1302', actualArrTime: '1428', actualBlockMinutes: 146, equipment: 'E75', tailNumber: 'N345AA', isDeadhead: false },
          { flightNumber: 'AA3511', depAirport: 'ORD', arrAirport: 'EVV', depTime: '1731', arrTime: '1845', blockMinutes: 74, actualDepTime: '1731', actualArrTime: '1827', actualBlockMinutes: 56, equipment: 'E75', tailNumber: 'N351AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '0623',
        releaseTime: '1233',
        dutyMinutes: 411,
        payCreditMinutes: 287,
        actualDutyMinutes: 395,
        layoverCity: 'BIL',
        layoverHotelInfo: 'Northern Hotel Billings (406-867-6767)',
        legs: [
          { flightNumber: 'AA3707', depAirport: 'EVV', arrAirport: 'ORD', depTime: '0612', arrTime: '0739', blockMinutes: 87, actualDepTime: '0612', actualArrTime: '0731', actualBlockMinutes: 79, equipment: 'E75', tailNumber: 'N370AA', isDeadhead: false },
          { flightNumber: 'AA3428', depAirport: 'ORD', arrAirport: 'BIL', depTime: '0958', arrTime: '1218', blockMinutes: 200, actualDepTime: '0958', actualArrTime: '1150', actualBlockMinutes: 172, equipment: 'E75', tailNumber: 'N342AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '0615',
        releaseTime: '1340',
        dutyMinutes: 445,
        payCreditMinutes: 335,
        actualDutyMinutes: 445,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3746', depAirport: 'BIL', arrAirport: 'DFW', depTime: '0600', arrTime: '0955', blockMinutes: 175, actualDepTime: '0553', actualArrTime: '0929', actualBlockMinutes: 156, equipment: 'E75', tailNumber: 'N374AA', isDeadhead: false },
          { flightNumber: 'AA3330', depAirport: 'DFW', arrAirport: 'ORD', depTime: '1045', arrTime: '1325', blockMinutes: 160, equipment: 'E75', tailNumber: 'N333AA', isDeadhead: true },
        ]
      }
    ]
  },

  // 2. Seq 17352 (06JUL - 08JUL) Dropped
  {
    id: 'seq-17352-20260706-drp',
    rank: 'CA',
    sequenceNumber: '17352',
    startDate: '2026-07-06',
    endDate: '2026-07-08',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 841,
    totalCreditMinutes: 841,
    statusTag: 'DROP',
    colorTag: 'rose',
    isDropped: true,
    dropReason: 'Traded for High-Credit Sequence #21649',
    layoverCities: ['CAE', 'CMH'],
    dutyPeriods: []
  },

  // 3. Seq 18080 (11JUL - 14JUL) Regular Assignment
  {
    id: 'seq-18080-20260711',
    rank: 'CA',
    sequenceNumber: '18080',
    startDate: '2026-07-11',
    endDate: '2026-07-14',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 708,
    totalCreditMinutes: 922, // 15.37h
    expTafbHours: 77.06,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['MEM', 'BMI', 'DFW'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1620',
        releaseTime: '0033',
        dutyMinutes: 493,
        payCreditMinutes: 310,
        layoverCity: 'MEM',
        layoverHotelInfo: 'The Peabody Memphis (901-529-4000)',
        legs: [
          { flightNumber: 'AA3383', depAirport: 'ORD', arrAirport: 'BNA', depTime: '1705', arrTime: '1848', blockMinutes: 103, actualDepTime: '1925', actualArrTime: '2115', actualBlockMinutes: 110, equipment: 'E75', tailNumber: 'N338AA', isDeadhead: false },
          { flightNumber: 'AA3383', depAirport: 'BNA', arrAirport: 'ORD', depTime: '1933', arrTime: '2130', blockMinutes: 117, equipment: 'E75', tailNumber: 'N338AA', isDeadhead: false },
          { flightNumber: 'AA3945', depAirport: 'ORD', arrAirport: 'MEM', depTime: '2230', arrTime: '0018', blockMinutes: 108, actualDepTime: '2226', actualArrTime: '0011', actualBlockMinutes: 105, equipment: 'E75', tailNumber: 'N394AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '1745',
        releaseTime: '2323',
        dutyMinutes: 338,
        payCreditMinutes: 200,
        layoverCity: 'BMI',
        layoverHotelInfo: 'DoubleTree by Hilton Bloomington (309-664-6446)',
        legs: [
          { flightNumber: 'AA3677', depAirport: 'MEM', arrAirport: 'DFW', depTime: '1830', arrTime: '2022', blockMinutes: 112, actualDepTime: '2137', actualArrTime: '2325', actualBlockMinutes: 108, equipment: 'E75', tailNumber: 'N367AA', isDeadhead: false },
          { flightNumber: 'AA4254', depAirport: 'DFW', arrAirport: 'BMI', depTime: '2101', arrTime: '2308', blockMinutes: 127, actualDepTime: '0004', actualArrTime: '0240', actualBlockMinutes: 156, equipment: 'E75', tailNumber: 'N425AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '1545',
        releaseTime: '1903',
        dutyMinutes: 198,
        payCreditMinutes: 138,
        layoverCity: 'DFW',
        layoverHotelInfo: 'Hyatt Regency DFW International Airport (972-453-1234)',
        legs: [
          { flightNumber: 'AA3434', depAirport: 'BMI', arrAirport: 'DFW', depTime: '1630', arrTime: '1848', blockMinutes: 138, actualDepTime: '1809', actualArrTime: '2011', actualBlockMinutes: 122, equipment: 'E75', tailNumber: 'N343AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 3,
        reportTime: '1548',
        releaseTime: '2200',
        dutyMinutes: 372,
        payCreditMinutes: 274,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3803', depAirport: 'DFW', arrAirport: 'SGF', depTime: '1633', arrTime: '1804', blockMinutes: 91, actualDepTime: '1703', actualArrTime: '1823', actualBlockMinutes: 80, equipment: 'E75', tailNumber: 'N380AA', isDeadhead: false },
          { flightNumber: 'AA3626', depAirport: 'SGF', arrAirport: 'ORD', depTime: '1953', arrTime: '2145', blockMinutes: 112, actualDepTime: '1954', actualArrTime: '2124', actualBlockMinutes: 90, equipment: 'E75', tailNumber: 'N362AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 4. Seq 17475 (11JUL - 14JUL) Dropped
  {
    id: 'seq-17475-20260711-drp',
    rank: 'CA',
    sequenceNumber: '17475',
    startDate: '2026-07-11',
    endDate: '2026-07-14',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 810,
    totalCreditMinutes: 810,
    statusTag: 'DROP',
    colorTag: 'rose',
    isDropped: true,
    dropReason: 'Direct Trade Swap for 18080',
    layoverCities: ['RIC', 'GRK', 'MAF'],
    dutyPeriods: []
  },

  // 5. Seq 21514 (15JUL) Day Turn
  {
    id: 'seq-21514-20260715',
    rank: 'CA',
    sequenceNumber: '21514',
    startDate: '2026-07-15',
    endDate: '2026-07-15',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 282,
    totalCreditMinutes: 308, // 5.08h
    expTafbHours: 6.39,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: [],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '0915',
        releaseTime: '1554',
        dutyMinutes: 399,
        payCreditMinutes: 308,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3862', depAirport: 'ORD', arrAirport: 'HHH', depTime: '1000', arrTime: '1333', blockMinutes: 153, actualDepTime: '1354', actualArrTime: '1515', actualBlockMinutes: 81, equipment: 'E75', tailNumber: 'N386AA', isDeadhead: false },
          { flightNumber: 'AA3862', depAirport: 'HHH', arrAirport: 'ORD', depTime: '1403', arrTime: '1539', blockMinutes: 156, actualDepTime: '1540', actualArrTime: '1705', actualBlockMinutes: 85, equipment: 'E75', tailNumber: 'N386AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 6. Seq 21614 (17JUL) Day Turn
  {
    id: 'seq-21614-20260717',
    rank: 'CA',
    sequenceNumber: '21614',
    startDate: '2026-07-17',
    endDate: '2026-07-17',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 400,
    totalCreditMinutes: 460, // 7.40h
    expTafbHours: 10.45,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: [],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '0715',
        releaseTime: '1745',
        dutyMinutes: 630,
        payCreditMinutes: 460,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3712', depAirport: 'ORD', arrAirport: 'MQT', depTime: '0800', arrTime: '1020', blockMinutes: 80, actualDepTime: '0758', actualArrTime: '1015', actualBlockMinutes: 77, equipment: 'E75', tailNumber: 'N371AA', isDeadhead: false },
          { flightNumber: 'AA3712', depAirport: 'MQT', arrAirport: 'ORD', depTime: '1050', arrTime: '1115', blockMinutes: 85, actualDepTime: '1048', actualArrTime: '1110', actualBlockMinutes: 82, equipment: 'E75', tailNumber: 'N371AA', isDeadhead: false },
          { flightNumber: 'AA3827', depAirport: 'ORD', arrAirport: 'TUL', depTime: '1245', arrTime: '1445', blockMinutes: 120, actualDepTime: '1240', actualArrTime: '1438', actualBlockMinutes: 118, equipment: 'E75', tailNumber: 'N382AA', isDeadhead: false },
          { flightNumber: 'AA3827', depAirport: 'TUL', arrAirport: 'ORD', depTime: '1515', arrTime: '1715', blockMinutes: 120, actualDepTime: '1512', actualArrTime: '1708', actualBlockMinutes: 116, equipment: 'E75', tailNumber: 'N382AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 7. Seq 17495 (18JUL - 21JUL) 4-Day Pairing
  {
    id: 'seq-17495-20260718',
    rank: 'CA',
    sequenceNumber: '17495',
    startDate: '2026-07-18',
    endDate: '2026-07-21',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 890,
    totalCreditMinutes: 1172, // 19.53h
    expTafbHours: 68.32,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['SPI', 'HPN', 'YYZ'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1215',
        releaseTime: '1424',
        dutyMinutes: 129,
        payCreditMinutes: 67,
        actualDutyMinutes: 129,
        layoverCity: 'SPI',
        layoverHotelInfo: 'President Abraham Lincoln Springfield (217-544-8800)',
        legs: [
          { flightNumber: 'AA4330', depAirport: 'ORD', arrAirport: 'SPI', depTime: '1300', arrTime: '1409', blockMinutes: 69, actualDepTime: '1312', actualArrTime: '1424', actualBlockMinutes: 72, equipment: 'E75', tailNumber: 'N433AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '0515',
        releaseTime: '1614',
        dutyMinutes: 659,
        payCreditMinutes: 380,
        actualDutyMinutes: 659,
        layoverCity: 'HPN',
        layoverHotelInfo: 'Sonesta White Plains Downtown (914-682-0050)',
        legs: [
          { flightNumber: 'AA4328', depAirport: 'SPI', arrAirport: 'ORD', depTime: '0600', arrTime: '0718', blockMinutes: 78, actualDepTime: '0551', actualArrTime: '0705', actualBlockMinutes: 74, equipment: 'E75', tailNumber: 'N432AA', isDeadhead: false },
          { flightNumber: 'AA3491', depAirport: 'ORD', arrAirport: 'CWA', depTime: '0806', arrTime: '0927', blockMinutes: 81, actualDepTime: '0948', actualArrTime: '1106', actualBlockMinutes: 78, equipment: 'E75', tailNumber: 'N349AA', isDeadhead: false },
          { flightNumber: 'AA3491', depAirport: 'CWA', arrAirport: 'ORD', depTime: '0957', arrTime: '1124', blockMinutes: 87, equipment: 'E75', tailNumber: 'N349AA', isDeadhead: false },
          { flightNumber: 'AA4200', depAirport: 'ORD', arrAirport: 'HPN', depTime: '1241', arrTime: '1559', blockMinutes: 138, actualDepTime: '1236', actualArrTime: '1531', actualBlockMinutes: 115, equipment: 'E75', tailNumber: 'N420AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '0625',
        releaseTime: '1252',
        dutyMinutes: 387,
        payCreditMinutes: 240,
        actualDutyMinutes: 387,
        layoverCity: 'YYZ',
        layoverHotelInfo: 'Sheraton Gateway Hotel Toronto Pearson (905-672-7000)',
        legs: [
          { flightNumber: 'AA3496', depAirport: 'HPN', arrAirport: 'ORD', depTime: '0710', arrTime: '0851', blockMinutes: 161, actualDepTime: '0706', actualArrTime: '0826', actualBlockMinutes: 140, equipment: 'E75', tailNumber: 'N349AA', isDeadhead: false },
          { flightNumber: 'AA3606', depAirport: 'ORD', arrAirport: 'YYZ', depTime: '0945', arrTime: '1237', blockMinutes: 112, actualDepTime: '0941', actualArrTime: '1218', actualBlockMinutes: 97, equipment: 'E75', tailNumber: 'N360AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 3,
        reportTime: '0632',
        releaseTime: '0842',
        dutyMinutes: 130,
        payCreditMinutes: 126,
        actualDutyMinutes: 130,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3524', depAirport: 'YYZ', arrAirport: 'ORD', depTime: '0717', arrTime: '0827', blockMinutes: 130, actualDepTime: '0712', actualArrTime: '0816', actualBlockMinutes: 124, equipment: 'E75', tailNumber: 'N352AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 8. Seq 21566 (23JUL) Day Turn
  {
    id: 'seq-21566-20260723',
    rank: 'CA',
    sequenceNumber: '21566',
    startDate: '2026-07-23',
    endDate: '2026-07-23',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 204,
    totalCreditMinutes: 238, // 3.58h
    expTafbHours: 5.28,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: [],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1351',
        releaseTime: '1919',
        dutyMinutes: 328,
        payCreditMinutes: 238,
        actualDutyMinutes: 300,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA4151', depAirport: 'ORD', arrAirport: 'MHK', depTime: '1436', arrTime: '1630', blockMinutes: 114, actualDepTime: '1428', actualArrTime: '1606', actualBlockMinutes: 98, equipment: 'E75', tailNumber: 'N415AA', isDeadhead: false },
          { flightNumber: 'AA4151', depAirport: 'MHK', arrAirport: 'ORD', depTime: '1700', arrTime: '1904', blockMinutes: 124, actualDepTime: '1650', actualArrTime: '1836', actualBlockMinutes: 106, equipment: 'E75', tailNumber: 'N415AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 9. Seq 17333 (24JUL - 26JUL) 3-Day Pairing
  {
    id: 'seq-17333-20260724',
    rank: 'CA',
    sequenceNumber: '17333',
    startDate: '2026-07-24',
    endDate: '2026-07-26',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 750,
    totalCreditMinutes: 892, // 14.52h
    expTafbHours: 53.39,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['AVP', 'MLI'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '0715',
        releaseTime: '1819',
        dutyMinutes: 664,
        payCreditMinutes: 367,
        actualDutyMinutes: 578,
        layoverCity: 'AVP',
        layoverHotelInfo: 'Mohegan Pennsylvania Wilkes-Barre (570-831-2100)',
        legs: [
          { flightNumber: 'AA3625', depAirport: 'ORD', arrAirport: 'LIT', depTime: '0800', arrTime: '0959', blockMinutes: 119, actualDepTime: '0757', actualArrTime: '0941', actualBlockMinutes: 104, equipment: 'E75', tailNumber: 'N362AA', isDeadhead: false },
          { flightNumber: 'AA3625', depAirport: 'LIT', arrAirport: 'ORD', depTime: '1029', arrTime: '1232', blockMinutes: 123, actualDepTime: '1020', actualArrTime: '1220', actualBlockMinutes: 120, equipment: 'E75', tailNumber: 'N362AA', isDeadhead: false },
          { flightNumber: 'AA3407', depAirport: 'ORD', arrAirport: 'AVP', depTime: '1459', arrTime: '1804', blockMinutes: 125, actualDepTime: '1454', actualArrTime: '1738', actualBlockMinutes: 104, equipment: 'E75', tailNumber: 'N340AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '0515',
        releaseTime: '1113',
        dutyMinutes: 358,
        payCreditMinutes: 224,
        actualDutyMinutes: 407,
        layoverCity: 'MLI',
        layoverHotelInfo: 'Radisson On John Deere Commons-Moline (309-764-1000)',
        legs: [
          { flightNumber: 'AA3587', depAirport: 'AVP', arrAirport: 'ORD', depTime: '0600', arrTime: '0731', blockMinutes: 151, actualDepTime: '0559', actualArrTime: '0710', actualBlockMinutes: 131, equipment: 'E75', tailNumber: 'N358AA', isDeadhead: false },
          { flightNumber: 'AA3698', depAirport: 'ORD', arrAirport: 'MLI', depTime: '0945', arrTime: '1058', blockMinutes: 73, actualDepTime: '0942', actualArrTime: '1047', actualBlockMinutes: 65, equipment: 'E75', tailNumber: 'N369AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '0523',
        releaseTime: '1254',
        dutyMinutes: 451,
        payCreditMinutes: 301,
        actualDutyMinutes: 434,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3445', depAirport: 'MLI', arrAirport: 'ORD', depTime: '0608', arrTime: '0730', blockMinutes: 82, actualDepTime: '0558', actualArrTime: '0656', actualBlockMinutes: 58, equipment: 'E75', tailNumber: 'N344AA', isDeadhead: false },
          { flightNumber: 'AA3439', depAirport: 'ORD', arrAirport: 'BNA', depTime: '0830', arrTime: '1013', blockMinutes: 103, actualDepTime: '0825', actualArrTime: '0949', actualBlockMinutes: 84, equipment: 'E75', tailNumber: 'N343AA', isDeadhead: false },
          { flightNumber: 'AA3439', depAirport: 'BNA', arrAirport: 'ORD', depTime: '1043', arrTime: '1239', blockMinutes: 116, actualDepTime: '1043', actualArrTime: '1222', actualBlockMinutes: 99, equipment: 'E75', tailNumber: 'N343AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 10. Seq 17894 (27JUL - 28JUL) 2-Day Pairing
  {
    id: 'seq-17894-20260727',
    rank: 'CA',
    sequenceNumber: '17894',
    startDate: '2026-07-27',
    endDate: '2026-07-28',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 478,
    totalCreditMinutes: 478, // 7.58h
    expTafbHours: 28.38,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['CAE'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1421',
        releaseTime: '2334',
        dutyMinutes: 553,
        payCreditMinutes: 327,
        layoverCity: 'CAE',
        layoverHotelInfo: 'Hilton Columbia Center (803-744-7800)',
        legs: [
          { flightNumber: 'AA3980', depAirport: 'ORD', arrAirport: 'DTW', depTime: '1506', arrTime: '1741', blockMinutes: 95, actualDepTime: '1506', actualArrTime: '1741', actualBlockMinutes: 95, equipment: 'E75', tailNumber: 'N398AA', isDeadhead: false },
          { flightNumber: 'AA3980', depAirport: 'DTW', arrAirport: 'ORD', depTime: '1811', arrTime: '1858', blockMinutes: 107, actualDepTime: '1811', actualArrTime: '1858', actualBlockMinutes: 107, equipment: 'E75', tailNumber: 'N398AA', isDeadhead: false },
          { flightNumber: 'AA4275', depAirport: 'ORD', arrAirport: 'CAE', depTime: '2014', arrTime: '2319', blockMinutes: 125, actualDepTime: '2014', actualArrTime: '2319', actualBlockMinutes: 125, equipment: 'E75', tailNumber: 'N427AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '1628',
        releaseTime: '1859',
        dutyMinutes: 151,
        payCreditMinutes: 151,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA4183', depAirport: 'CAE', arrAirport: 'ORD', depTime: '1713', arrTime: '1844', blockMinutes: 151, actualDepTime: '1713', actualArrTime: '1844', actualBlockMinutes: 151, equipment: 'E75', tailNumber: 'N418AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 11. Seq 17270 (30JUL - 31JUL) 2-Day Pairing
  {
    id: 'seq-17270-20260730',
    rank: 'CA',
    sequenceNumber: '17270',
    startDate: '2026-07-30',
    endDate: '2026-07-31',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 476,
    totalCreditMinutes: 565, // 9.25h
    expTafbHours: 29.23,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['SPI'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '0606',
        releaseTime: '1439',
        dutyMinutes: 513,
        payCreditMinutes: 300,
        layoverCity: 'SPI',
        layoverHotelInfo: 'President Abraham Lincoln Springfield (217-544-8800)',
        legs: [
          { flightNumber: 'AA3446', depAirport: 'ORD', arrAirport: 'BWI', depTime: '0651', arrTime: '0958', blockMinutes: 127, actualDepTime: '0651', actualArrTime: '0958', actualBlockMinutes: 127, equipment: 'E75', tailNumber: 'N344AA', isDeadhead: false },
          { flightNumber: 'AA3446', depAirport: 'BWI', arrAirport: 'ORD', depTime: '1028', arrTime: '1143', blockMinutes: 135, actualDepTime: '1028', actualArrTime: '1143', actualBlockMinutes: 135, equipment: 'E75', tailNumber: 'N344AA', isDeadhead: false },
          { flightNumber: 'AA4330', depAirport: 'ORD', arrAirport: 'SPI', depTime: '1315', arrTime: '1424', blockMinutes: 69, actualDepTime: '1315', actualArrTime: '1424', actualBlockMinutes: 69, equipment: 'E75', tailNumber: 'N433AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '0515',
        releaseTime: '1126',
        dutyMinutes: 371,
        payCreditMinutes: 265,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA4328', depAirport: 'SPI', arrAirport: 'ORD', depTime: '0600', arrTime: '0718', blockMinutes: 78, actualDepTime: '0600', actualArrTime: '0718', actualBlockMinutes: 78, equipment: 'E75', tailNumber: 'N432AA', isDeadhead: false },
          { flightNumber: 'AA3546', depAirport: 'ORD', arrAirport: 'GRB', depTime: '0805', arrTime: '0921', blockMinutes: 76, actualDepTime: '0805', actualArrTime: '0921', actualBlockMinutes: 76, equipment: 'E75', tailNumber: 'N354AA', isDeadhead: false },
          { flightNumber: 'AA3546', depAirport: 'GRB', arrAirport: 'ORD', depTime: '0951', arrTime: '1111', blockMinutes: 80, actualDepTime: '0951', actualArrTime: '1111', actualBlockMinutes: 80, equipment: 'E75', tailNumber: 'N354AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 12. Seq 14731 (13AUG - 16AUG) 4-Day Pairing
  {
    id: 'seq-14731-20260813',
    rank: 'CA',
    sequenceNumber: '14731',
    startDate: '2026-08-13',
    endDate: '2026-08-16',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 878,
    totalCreditMinutes: 1042, // 17.22h
    expTafbHours: 65.22,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['FAR', 'CMI', 'CLE'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1239',
        releaseTime: '2327',
        dutyMinutes: 648,
        payCreditMinutes: 438,
        layoverCity: 'FAR',
        layoverHotelInfo: 'Radisson Blu Fargo (701-232-7363)',
        legs: [
          { flightNumber: 'AA3602', depAirport: 'ORD', arrAirport: 'YUL', depTime: '1324', arrTime: '1650', blockMinutes: 146, actualDepTime: '1320', actualArrTime: '1644', actualBlockMinutes: 144, equipment: 'E75', tailNumber: 'N360AA', isDeadhead: false },
          { flightNumber: 'AA3602', depAirport: 'YUL', arrAirport: 'ORD', depTime: '1734', arrTime: '1919', blockMinutes: 165, actualDepTime: '1730', actualArrTime: '1912', actualBlockMinutes: 162, equipment: 'E75', tailNumber: 'N360AA', isDeadhead: false },
          { flightNumber: 'AA3377', depAirport: 'ORD', arrAirport: 'FAR', depTime: '2105', arrTime: '2312', blockMinutes: 127, actualDepTime: '2101', actualArrTime: '2305', actualBlockMinutes: 124, equipment: 'E75', tailNumber: 'N337AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '1141',
        releaseTime: '2043',
        dutyMinutes: 542,
        payCreditMinutes: 350,
        layoverCity: 'CMI',
        layoverHotelInfo: 'I Hotel and Conference Center Champaign (217-819-5000)',
        legs: [
          { flightNumber: 'AA3449', depAirport: 'FAR', arrAirport: 'ORD', depTime: '1226', arrTime: '1432', blockMinutes: 126, actualDepTime: '1222', actualArrTime: '1428', actualBlockMinutes: 126, equipment: 'E75', tailNumber: 'N344AA', isDeadhead: false },
          { flightNumber: 'AA3484', depAirport: 'ORD', arrAirport: 'CMI', depTime: '1521', arrTime: '1624', blockMinutes: 63, actualDepTime: '1519', actualArrTime: '1620', actualBlockMinutes: 61, equipment: 'E75', tailNumber: 'N348AA', isDeadhead: false },
          { flightNumber: 'AA3484', depAirport: 'CMI', arrAirport: 'ORD', depTime: '1654', arrTime: '1829', blockMinutes: 95, actualDepTime: '1650', actualArrTime: '1824', actualBlockMinutes: 94, equipment: 'E75', tailNumber: 'N348AA', isDeadhead: false },
          { flightNumber: 'AA3694', depAirport: 'ORD', arrAirport: 'CMI', depTime: '1922', arrTime: '2028', blockMinutes: 66, actualDepTime: '1920', actualArrTime: '2025', actualBlockMinutes: 65, equipment: 'E75', tailNumber: 'N369AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '1056',
        releaseTime: '1624',
        dutyMinutes: 328,
        payCreditMinutes: 163,
        layoverCity: 'CLE',
        layoverHotelInfo: 'The Westin Cleveland Downtown (216-771-7700)',
        legs: [
          { flightNumber: 'AA3492', depAirport: 'CMI', arrAirport: 'ORD', depTime: '1141', arrTime: '1255', blockMinutes: 74, actualDepTime: '1138', actualArrTime: '1250', actualBlockMinutes: 72, equipment: 'E75', tailNumber: 'N349AA', isDeadhead: false },
          { flightNumber: 'AA3749', depAirport: 'ORD', arrAirport: 'CLE', depTime: '1340', arrTime: '1609', blockMinutes: 89, actualDepTime: '1336', actualArrTime: '1602', actualBlockMinutes: 86, equipment: 'E75', tailNumber: 'N374AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 3,
        reportTime: '0430',
        releaseTime: '0601',
        dutyMinutes: 91,
        payCreditMinutes: 91,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3356', depAirport: 'CLE', arrAirport: 'ORD', depTime: '0515', arrTime: '0546', blockMinutes: 91, actualDepTime: '0512', actualArrTime: '0542', actualBlockMinutes: 90, equipment: 'E75', tailNumber: 'N335AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 13. Seq 14962 (20AUG - 23AUG) 4-Day Pairing
  {
    id: 'seq-14962-20260820',
    rank: 'CA',
    sequenceNumber: '14962',
    startDate: '2026-08-20',
    endDate: '2026-08-23',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 1162,
    totalCreditMinutes: 1349, // 22.29h
    expTafbHours: 73.44,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['RIC', 'FSM', 'MAF'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1420',
        releaseTime: '0021',
        dutyMinutes: 601,
        payCreditMinutes: 403,
        layoverCity: 'RIC',
        layoverHotelInfo: 'Omni Richmond Hotel (804-344-7000)',
        legs: [
          { flightNumber: 'AA4145', depAirport: 'ORD', arrAirport: 'GSP', depTime: '1505', arrTime: '1804', blockMinutes: 119, equipment: 'E75', tailNumber: 'N414AA', isDeadhead: false },
          { flightNumber: 'AA4145', depAirport: 'GSP', arrAirport: 'ORD', depTime: '1834', arrTime: '2004', blockMinutes: 150, equipment: 'E75', tailNumber: 'N414AA', isDeadhead: false },
          { flightNumber: 'AA3811', depAirport: 'ORD', arrAirport: 'RIC', depTime: '2052', arrTime: '0006', blockMinutes: 134, equipment: 'E75', tailNumber: 'N381AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '1058',
        releaseTime: '1700',
        dutyMinutes: 362,
        payCreditMinutes: 272,
        layoverCity: 'FSM',
        layoverHotelInfo: 'Courtyard Fort Smith Downtown (479-783-2100)',
        legs: [
          { flightNumber: 'AA3778', depAirport: 'RIC', arrAirport: 'DFW', depTime: '1143', arrTime: '1402', blockMinutes: 199, equipment: 'E75', tailNumber: 'N377AA', isDeadhead: false },
          { flightNumber: 'AA3859', depAirport: 'DFW', arrAirport: 'FSM', depTime: '1532', arrTime: '1645', blockMinutes: 73, equipment: 'E75', tailNumber: 'N385AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '0515',
        releaseTime: '1406',
        dutyMinutes: 531,
        payCreditMinutes: 289,
        layoverCity: 'MAF',
        layoverHotelInfo: 'DoubleTree by Hilton Midland Plaza (432-683-6131)',
        legs: [
          { flightNumber: 'AA4179', depAirport: 'FSM', arrAirport: 'DFW', depTime: '0600', arrTime: '0720', blockMinutes: 80, equipment: 'E75', tailNumber: 'N417AA', isDeadhead: false },
          { flightNumber: 'AA3873', depAirport: 'DFW', arrAirport: 'GRK', depTime: '0829', arrTime: '0929', blockMinutes: 60, equipment: 'E75', tailNumber: 'N387AA', isDeadhead: false },
          { flightNumber: 'AA3873', depAirport: 'GRK', arrAirport: 'DFW', depTime: '0959', arrTime: '1110', blockMinutes: 71, equipment: 'E75', tailNumber: 'N387AA', isDeadhead: false },
          { flightNumber: 'AA3512', depAirport: 'DFW', arrAirport: 'MAF', depTime: '1233', arrTime: '1351', blockMinutes: 78, equipment: 'E75', tailNumber: 'N351AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 3,
        reportTime: '0715',
        releaseTime: '1604',
        dutyMinutes: 529,
        payCreditMinutes: 385,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3352', depAirport: 'MAF', arrAirport: 'DFW', depTime: '0800', arrTime: '0925', blockMinutes: 85, equipment: 'E75', tailNumber: 'N335AA', isDeadhead: false },
          { flightNumber: 'AA3689', depAirport: 'DFW', arrAirport: 'RAP', depTime: '1018', arrTime: '1149', blockMinutes: 151, equipment: 'E75', tailNumber: 'N368AA', isDeadhead: false },
          { flightNumber: 'AA3573', depAirport: 'RAP', arrAirport: 'ORD', depTime: '1220', arrTime: '1549', blockMinutes: 149, equipment: 'E75', tailNumber: 'N357AA', isDeadhead: false },
        ]
      }
    ]
  },

  // 14. Seq 15101 (27AUG - 30AUG) 4-Day Pairing
  {
    id: 'seq-15101-20260827',
    rank: 'CA',
    sequenceNumber: '15101',
    startDate: '2026-08-27',
    endDate: '2026-08-30',
    base: 'ORD',
    equipment: 'E75',
    totalBlockMinutes: 864,
    totalCreditMinutes: 986, // 16.26h
    expTafbHours: 70.35,
    statusTag: 'RA',
    colorTag: 'sky',
    isDropped: false,
    layoverCities: ['SPI', 'MLI', 'GSO'],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: '1623',
        releaseTime: '0027',
        dutyMinutes: 484,
        payCreditMinutes: 288,
        layoverCity: 'SPI',
        layoverHotelInfo: 'President Abraham Lincoln Springfield (217-544-8800)',
        legs: [
          { flightNumber: 'AA3626', depAirport: 'ORD', arrAirport: 'SGF', depTime: '1708', arrTime: '1853', blockMinutes: 105, equipment: 'E75', tailNumber: 'N362AA', isDeadhead: false },
          { flightNumber: 'AA3594', depAirport: 'SGF', arrAirport: 'ORD', depTime: '2004', arrTime: '2200', blockMinutes: 116, equipment: 'E75', tailNumber: 'N359AA', isDeadhead: false },
          { flightNumber: 'AA3771', depAirport: 'ORD', arrAirport: 'SPI', depTime: '2305', arrTime: '0012', blockMinutes: 67, equipment: 'E75', tailNumber: 'N377AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 1,
        reportTime: '1406',
        releaseTime: '1826',
        dutyMinutes: 260,
        payCreditMinutes: 149,
        layoverCity: 'MLI',
        layoverHotelInfo: 'Radisson On John Deere Commons-Moline (309-764-1000)',
        legs: [
          { flightNumber: 'AA4330', depAirport: 'SPI', arrAirport: 'ORD', depTime: '1451', arrTime: '1609', blockMinutes: 78, equipment: 'E75', tailNumber: 'N433AA', isDeadhead: false },
          { flightNumber: 'AA3559', depAirport: 'ORD', arrAirport: 'MLI', depTime: '1700', arrTime: '1811', blockMinutes: 71, equipment: 'E75', tailNumber: 'N355AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 2,
        reportTime: '0515',
        releaseTime: '1301',
        dutyMinutes: 466,
        payCreditMinutes: 200,
        layoverCity: 'GSO',
        layoverHotelInfo: 'Grandover Resort & Spa Greensboro (336-294-1800)',
        legs: [
          { flightNumber: 'AA3708', depAirport: 'MLI', arrAirport: 'ORD', depTime: '0600', arrTime: '0719', blockMinutes: 79, equipment: 'E75', tailNumber: 'N370AA', isDeadhead: false },
          { flightNumber: 'AA4144', depAirport: 'ORD', arrAirport: 'GSO', depTime: '0945', arrTime: '1246', blockMinutes: 121, equipment: 'E75', tailNumber: 'N414AA', isDeadhead: false },
        ]
      },
      {
        dayIndex: 3,
        reportTime: '0704',
        releaseTime: '1458',
        dutyMinutes: 474,
        payCreditMinutes: 349,
        layoverCity: '',
        legs: [
          { flightNumber: 'AA3673', depAirport: 'GSO', arrAirport: 'ORD', depTime: '0749', arrTime: '0910', blockMinutes: 141, equipment: 'E75', tailNumber: 'N367AA', isDeadhead: false },
          { flightNumber: 'AA3552', depAirport: 'ORD', arrAirport: 'MSP', depTime: '1045', arrTime: '1227', blockMinutes: 102, equipment: 'E75', tailNumber: 'N355AA', isDeadhead: false },
          { flightNumber: 'AA3552', depAirport: 'MSP', arrAirport: 'ORD', depTime: '1257', arrTime: '1443', blockMinutes: 106, equipment: 'E75', tailNumber: 'N355AA', isDeadhead: false },
        ]
      }
    ]
  }
];

fs.writeFileSync('scratch/generated_sequences.json', JSON.stringify(julyAndAugustSequences, null, 2));
console.log('Successfully saved', julyAndAugustSequences.length, 'sequences.');
