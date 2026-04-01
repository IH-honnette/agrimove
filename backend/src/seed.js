require('dotenv').config();
const pool = require('./db');

const DRIVERS = [
  // Kigali area — within 10 km of city centre (-1.9441, 30.0619)
  { name: 'Jean-Pierre Nkurunziza', initials: 'JP', vehicle: 'Isuzu Truck (5T)',      type: 'truck',  capacity: '5 tonnes',   rating: 4.9, trips: 312, rate: 600, available: true,  location: 'Kigali',    crops: 'All types',          phone: '+250 788 101 001', latitude: -1.9441,  longitude: 30.0619,  location_address: 'KG 7 Ave, Kinyinya, Kigali' },
  { name: 'Théophile Gasana',       initials: 'TG', vehicle: 'Ford Transit Van',      type: 'van',    capacity: '1.5 tonnes', rating: 4.5, trips: 143, rate: 460, available: true,  location: 'Kigali',    crops: 'Dairy, Vegetables',  phone: '+250 788 107 007', latitude: -1.9536,  longitude: 30.0606,  location_address: 'KN 3 Rd, Nyamirambo, Kigali' },
  { name: 'Claudine Nzeyimana',     initials: 'CN', vehicle: 'Hino Truck (3T)',       type: 'truck',  capacity: '3 tonnes',   rating: 4.8, trips: 276, rate: 550, available: true,  location: 'Kigali',    crops: 'Livestock, Grains',  phone: '+250 788 106 006', latitude: -1.9295,  longitude: 30.0835,  location_address: 'KG 200 St, Remera, Kigali' },
  // Musanze — ~100 km north-west
  { name: 'Amélie Uwimana',         initials: 'AU', vehicle: 'Toyota Hilux Pickup',   type: 'pickup', capacity: '1 tonne',    rating: 4.7, trips: 184, rate: 450, available: true,  location: 'Musanze',   crops: 'Vegetables, Dairy',  phone: '+250 788 102 002', latitude: -1.4990,  longitude: 29.6344,  location_address: 'RN4, Musanze Town, Northern Province' },
  // Huye — ~130 km south
  { name: 'Emmanuel Habimana',      initials: 'EH', vehicle: 'Mitsubishi Van (1.5T)', type: 'van',    capacity: '1.5 tonnes', rating: 4.8, trips: 229, rate: 480, available: true,  location: 'Huye',      crops: 'Grains, Cereals',    phone: '+250 788 103 003', latitude: -2.5967,  longitude: 29.7395,  location_address: 'Avenue de la Paix, Huye, Southern Province' },
  // Rubavu — ~160 km north-west (unavailable, still has location)
  { name: 'Solange Mukamana',       initials: 'SM', vehicle: 'Mercedes Actros (10T)', type: 'truck',  capacity: '10 tonnes',  rating: 5.0, trips: 415, rate: 750, available: false, location: 'Rubavu',    crops: 'All types',          phone: '+250 788 104 004', latitude: -1.6832,  longitude: 29.2609,  location_address: 'Boulevard du Lac, Rubavu, Western Province' },
  // No live location (offline drivers)
  { name: 'Patrick Bizimana',       initials: 'PB', vehicle: 'Nissan Navara Pickup',  type: 'pickup', capacity: '1 tonne',    rating: 4.6, trips: 97,  rate: 420, available: true,  location: 'Nyanza',    crops: 'Fruits, Vegetables', phone: '+250 788 105 005', latitude: null,     longitude: null,     location_address: null },
  { name: 'Immaculée Ingabire',     initials: 'II', vehicle: 'Fuso Canter (2T)',      type: 'truck',  capacity: '2 tonnes',   rating: 4.7, trips: 188, rate: 520, available: false, location: 'Kayonza',   crops: 'All types',          phone: '+250 788 108 008', latitude: null,     longitude: null,     location_address: null },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM drivers');
    await client.query('ALTER SEQUENCE drivers_id_seq RESTART WITH 1');

    for (const d of DRIVERS) {
      await client.query(
        `INSERT INTO drivers
           (name,initials,vehicle,type,capacity,rating,trips,rate,available,location,crops,phone,
            latitude,longitude,location_address,location_updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          d.name, d.initials, d.vehicle, d.type, d.capacity, d.rating, d.trips, d.rate,
          d.available, d.location, d.crops, d.phone,
          d.latitude, d.longitude, d.location_address,
          d.latitude != null ? new Date() : null,
        ]
      );
    }
    console.log('Seeded', DRIVERS.length, 'drivers.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
