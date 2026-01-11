/**
 * Phase 1: Seed Plan Translations
 * 
 * Creates plan_translations collection with translations for:
 * - Plan names
 * - Plan descriptions  
 * - Feature labels
 * 
 * Languages: English (en) and Spanish (es)
 * Plans: basic, pro, team (only public plans)
 */

const admin = require('firebase-admin');

// Use existing app instance or initialize
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Translation data
const translations = {
    basic: {
        planId: 'basic',
        translations: {
            en: {
                name: 'Basic',
                description: 'Start your preaching ministry',
                features: {
                    'sermon:create': 'Create unlimited sermons',
                    'sermon:export_pdf': 'Export to PDF',
                    'library:upload': 'Upload resources to your library',
                }
            },
            es: {
                name: 'Básico',
                description: 'Comienza tu ministerio de predicación',
                features: {
                    'sermon:create': 'Crear sermones ilimitados',
                    'sermon:export_pdf': 'Exportar a PDF',
                    'library:upload': 'Subir recursos a tu biblioteca',
                }
            }
        }
    },
    pro: {
        planId: 'pro',
        translations: {
            en: {
                name: 'Pro',
                description: 'For pastors who preach regularly',
                features: {
                    'sermon:create': 'Create unlimited sermons',
                    'sermon:ai_assistant': 'AI-powered sermon assistant',
                    'sermon:export_pdf': 'Export to PDF',
                    'library:upload': 'Upload resources to your library',
                    'library:semantic_search': 'Semantic search in your library',
                }
            },
            es: {
                name: 'Pro',
                description: 'Para pastores que predican regularmente',
                features: {
                    'sermon:create': 'Crear sermones ilimitados',
                    'sermon:ai_assistant': 'Asistente de sermones con IA',
                    'sermon:export_pdf': 'Exportar a PDF',
                    'library:upload': 'Subir recursos a tu biblioteca',
                    'library:semantic_search': 'Búsqueda semántica en tu biblioteca',
                }
            }
        }
    },
    team: {
        planId: 'team',
        translations: {
            en: {
                name: 'Team',
                description: 'For pastoral teams and churches',
                features: {
                    'sermon:create': 'Create unlimited sermons',
                    'sermon:ai_assistant': 'AI-powered sermon assistant',
                    'sermon:advanced_homiletics': 'Advanced homiletical analysis',
                    'sermon:export_pdf': 'Export to PDF',
                    'sermon:custom_templates': 'Custom sermon templates',
                    'library:upload': 'Upload resources to your library',
                    'library:semantic_search': 'Semantic search in your library',
                }
            },
            es: {
                name: 'Equipo',
                description: 'Para equipos pastorales e iglesias',
                features: {
                    'sermon:create': 'Crear sermones ilimitados',
                    'sermon:ai_assistant': 'Asistente de sermones con IA',
                    'sermon:advanced_homiletics': 'Análisis homilético avanzado',
                    'sermon:export_pdf': 'Exportar a PDF',
                    'sermon:custom_templates': 'Plantillas de sermones personalizadas',
                    'library:upload': 'Subir recursos a tu biblioteca',
                    'library:semantic_search': 'Búsqueda semántica en tu biblioteca',
                }
            }
        }
    },
    // Legacy plans - include translations for existing users
    free: {
        planId: 'free',
        translations: {
            en: {
                name: 'Free (Legacy)',
                description: 'Legacy plan - upgrade to Basic',
                features: {
                    'sermon:create': 'Create unlimited sermons',
                    'sermon:export_pdf': 'Export to PDF',
                    'library:upload': 'Upload resources to your library',
                }
            },
            es: {
                name: 'Gratis (Legacy)',
                description: 'Plan legacy - actualizar a Básico',
                features: {
                    'sermon:create': 'Crear sermones ilimitados',
                    'sermon:export_pdf': 'Exportar a PDF',
                    'library:upload': 'Subir recursos a tu biblioteca',
                }
            }
        }
    }
};

async function seedTranslations() {
    console.log('🌐 Starting Plan Translations Seeding...\n');

    try {
        const translationsRef = db.collection('plan_translations');

        for (const [planId, data] of Object.entries(translations)) {
            console.log(`📝 Seeding translations for: ${planId}`);

            await translationsRef.doc(planId).set(data);

            const languages = Object.keys(data.translations);
            const featureCount = Object.keys(data.translations[languages[0]].features).length;

            console.log(`   ✅ Saved`);
            console.log(`      - Languages: ${languages.join(', ')}`);
            console.log(`      - Features: ${featureCount}`);
            console.log('');
        }

        // Verify
        console.log('\n' + '='.repeat(60));
        console.log('VERIFICATION - Translations');
        console.log('='.repeat(60));

        const snapshot = await translationsRef.get();
        console.log(`\n✅ Total translations: ${snapshot.size}`);

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const languages = Object.keys(data.translations);
            console.log(`   - ${doc.id}: ${languages.join(', ')}`);
        });

        console.log('\n✅ Translation seeding completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Update Firestore security rules for plan_translations');
        console.log('2. Implement domain layer (Plan models, interfaces)');
        console.log('3. Implement infrastructure layer (FirestorePlanRepository)');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run seeding
seedTranslations();
