#!/usr/bin/env node
/**
 * Populate Geographic Events with Sample Data
 * 
 * This script creates sample geo events to populate the geographic dashboard
 * Run with: node scripts/populateGeoEvents.js
 */

const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

// Sample countries for testing
const SAMPLE_COUNTRIES = [
    { country: 'Chile', countryCode: 'CL', city: 'Santiago', region: 'Región Metropolitana' },
    { country: 'Mexico', countryCode: 'MX', city: 'Ciudad de México', region: 'CDMX' },
    { country: 'Argentina', countryCode: 'AR', city: 'Buenos Aires', region: 'CABA' },
    { country: 'Colombia', countryCode: 'CO', city: 'Bogotá', region: 'Cundinamarca' },
    { country: 'Peru', countryCode: 'PE', city: 'Lima', region: 'Lima' },
    { country: 'Spain', countryCode: 'ES', city: 'Madrid', region: 'Madrid' },
    { country: 'United States', countryCode: 'US', city: 'Miami', region: 'Florida' },
];

async function populateGeoEvents() {
    console.log('🌎 Starting geographic events population...\n');

    try {
        // Get existing users
        const usersSnap = await db.collection('users').limit(10).get();
        const userIds = usersSnap.docs.map(doc => doc.id);

        if (userIds.length === 0) {
            console.error('No users found. Cannot populate geo events.');
            process.exit(1);
        }

        console.log(`Found ${userIds.length} users\n`);

        const batch = db.batch();
        let eventCount = 0;

        // Create events for the last 30 days
        const now = new Date();
        for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
            const eventDate = new Date(now);
            eventDate.setDate(eventDate.getDate() - daysAgo);

            // Random number of events per day (1-10)
            const eventsPerDay = Math.floor(Math.random() * 10) + 1;

            for (let i = 0; i < eventsPerDay; i++) {
                const country = SAMPLE_COUNTRIES[Math.floor(Math.random() * SAMPLE_COUNTRIES.length)];
                const userId = userIds[Math.floor(Math.random() * userIds.length)];

                // Create a registration event (30% chance)
                if (Math.random() < 0.3) {
                    const eventRef = db.collection('geo_events').doc();
                    batch.set(eventRef, {
                        type: 'registration',
                        userId,
                        location: country,
                        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0`,
                        userAgent: 'Mozilla/5.0',
                        timestamp: Timestamp.fromDate(eventDate),
                        createdAt: Timestamp.fromDate(eventDate),
                    });
                    eventCount++;
                }

                // Create a login event (70% chance)
                if (Math.random() < 0.7) {
                    const eventRef = db.collection('geo_events').doc();
                    batch.set(eventRef, {
                        type: 'login',
                        userId,
                        location: country,
                        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0`,
                        userAgent: 'Mozilla/5.0',
                        timestamp: Timestamp.fromDate(eventDate),
                        createdAt: Timestamp.fromDate(eventDate),
                    });
                    eventCount++;
                }

                // Create landing_visit events more frequently
                if (Math.random() < 0.5) {
                    const eventRef = db.collection('geo_events').doc();
                    batch.set(eventRef, {
                        type: 'landing_visit',
                        userId: null,
                        location: country,
                        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0`,
                        userAgent: 'Mozilla/5.0',
                        timestamp: Timestamp.fromDate(eventDate),
                        createdAt: Timestamp.fromDate(eventDate),
                    });
                    eventCount++;
                }
            }
        }

        console.log(`Creating ${eventCount} geographic events...`);
        await batch.commit();

        console.log('\n✅ Geographic events population complete!');
        console.log(`\nCreated ${eventCount} events across ${SAMPLE_COUNTRIES.length} countries`);
        console.log('\nCountries included:');
        SAMPLE_COUNTRIES.forEach(c => console.log(`  - ${c.country} (${c.countryCode})`));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error populating geo events:', error);
        process.exit(1);
    }
}

populateGeoEvents();
