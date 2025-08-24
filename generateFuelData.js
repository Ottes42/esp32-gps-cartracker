#!/usr/bin/env node

// Create test fuel data for development/testing
import Database from 'better-sqlite3'

const DATA_PATH = process.env.DATA_PATH || './data/gps/'
const DB_FILE = DATA_PATH + 'cartracker.db'

const db = new Database(DB_FILE)

// Sample fuel data based on the example drives timeline
const testFuelData = [
  {
    ts: '2025-08-18T07:45:00Z', // Before the first trip
    liters: 45.2,
    price_per_l: 1.659,
    amount_fuel: 45.2 * 1.659,
    amount_total: 45.2 * 1.659,
    station_name: 'Shell',
    station_zip: '60311',
    station_city: 'Frankfurt',
    station_address: 'Hauptstraße 123',
    full_tank: true,
    lat: 50.226800,
    lon: 8.618400,
    user: 'gps-cartracker-dev'
  },
  {
    ts: '2025-08-17T16:30:00Z', // Previous day
    liters: 38.7,
    price_per_l: 1.649,
    amount_fuel: 38.7 * 1.649,
    amount_total: 38.7 * 1.649,
    station_name: 'Aral',
    station_zip: '60329',
    station_city: 'Frankfurt',
    station_address: 'Bockenheimer Landstraße 45',
    full_tank: true,
    lat: 50.223456,
    lon: 8.621234,
    user: 'gps-cartracker-dev'
  },
  {
    ts: '2025-08-16T10:15:00Z', // Two days before
    liters: 42.1,
    price_per_l: 1.672,
    amount_fuel: 42.1 * 1.672,
    amount_total: 42.1 * 1.672 + 1.50, // Add some shop items
    station_name: 'Esso',
    station_zip: '60325',
    station_city: 'Frankfurt',
    station_address: 'Zeil 100',
    full_tank: true,
    lat: 50.228900,
    lon: 8.615600,
    user: 'gps-cartracker-dev'
  }
]

console.log('Inserting test fuel data...')

const insertStmt = db.prepare(`
  INSERT INTO fuel (
    ts, liters, price_per_l, amount_fuel, amount_total,
    station_name, station_zip, station_city, station_address,
    full_tank, lat, lon, user
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`)

for (const fuel of testFuelData) {
  insertStmt.run(
    fuel.ts, fuel.liters, fuel.price_per_l, fuel.amount_fuel, fuel.amount_total,
    fuel.station_name, fuel.station_zip, fuel.station_city, fuel.station_address,
    fuel.full_tank ? 1 : 0, fuel.lat, fuel.lon, fuel.user
  )
  console.log(`✓ Added fuel record: ${fuel.station_name} - ${fuel.liters}L - ${fuel.amount_total.toFixed(2)}€`)
}

// Verify insertion
const count = db.prepare('SELECT COUNT(*) as count FROM fuel').get()
console.log(`\n✓ Total fuel records in database: ${count.count}`)

// Show sample data
console.log('\nSample fuel records:')
const samples = db.prepare('SELECT ts, station_name, liters, amount_total FROM fuel ORDER BY ts DESC LIMIT 3').all()
samples.forEach(row => {
  console.log(`  ${row.ts} - ${row.station_name} - ${row.liters}L - ${row.amount_total.toFixed(2)}€`)
})

db.close()
console.log('\n✓ Test fuel data created successfully!')
