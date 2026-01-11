/**
 * Seed Plan Translations V2
 * 
 * Enhanced version that includes:
 * - Features translations (existing)
 * - Modules translations (NEW)
 * - Limits translations with templates (NEW)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const planTranslationsData = {
    basic: {
        en: {
            name: "Basic",
            description: "Perfect for getting started with sermon preparation",

            features: {
                "sermon:create": "Create unlimited sermons",
                "sermon:export_pdf": "Export sermons to PDF",
                "library:upload": "Upload resources to your library"
            },

            modules: {
                "module:dashboard": "Dashboard",
                "module:sermones": "Sermons",
                "module:biblioteca": "Library",
                "module:greek_tutor": "Greek Tutor"
            },

            limits: {
                "sermonsPerMonth": "{count} sermons/month",
                "sermonsPerMonth_unlimited": "Unlimited sermons",
                "libraryStorageMB": "{count} MB of storage",
                "libraryStorageMB_GB": "{count} GB of storage",
                "greekSessionsPerMonth": "{count} Greek study sessions/month",
                "greekSessionsPerMonth_unlimited": "Unlimited Greek sessions",
                "maxPreachingPlansPerMonth": "{count} preaching plans/month",
                "maxPreachingPlansPerMonth_unlimited": "Unlimited preaching plans",
                "maxMembers": "{count} team member",
                "maxMembers_plural": "{count} team members"
            }
        },
        es: {
            name: "Básico",
            description: "Para comenzar tu ministerio de predicación",

            features: {
                "sermon:create": "Crea sermones ilimitados",
                "sermon:export_pdf": "Exporta sermones a PDF",
                "library:upload": "Sube recursos a tu biblioteca"
            },

            modules: {
                "module:dashboard": "Panel",
                "module:sermones": "Sermones",
                "module:biblioteca": "Biblioteca",
                "module:greek_tutor": "Tutor de Griego"
            },

            limits: {
                "sermonsPerMonth": "{count} sermones/mes",
                "sermonsPerMonth_unlimited": "Sermones ilimitados",
                "libraryStorageMB": "{count} MB de almacenamiento",
                "libraryStorageMB_GB": "{count} GB de almacenamiento",
                "greekSessionsPerMonth": "{count} sesiones de griego/mes",
                "greekSessionsPerMonth_unlimited": "Sesiones de griego ilimitadas",
                "maxPreachingPlansPerMonth": "{count} planes de predicación/mes",
                "maxPreachingPlansPerMonth_unlimited": "Planes de predicación ilimitados",
                "maxMembers": "{count} miembro del equipo",
                "maxMembers_plural": "{count} miembros del equipo"
            }
        }
    },

    pro: {
        en: {
            name: "Pro",
            description: "For pastors who preach regularly",

            features: {
                "sermon:create": "Create unlimited sermons",
                "sermon:ai_assistant": "AI-powered sermon assistant",
                "sermon:export_pdf": "Export sermons to PDF",
                "library:upload": "Upload resources to your library",
                "library:semantic_search": "Semantic search in your library"
            },

            modules: {
                "module:dashboard": "Dashboard",
                "module:sermones": "Sermons",
                "module:planes": "Preaching Plans",
                "module:generar": "Sermon Generator",
                "module:biblioteca": "Library",
                "module:configuracion": "Settings",
                "module:greek_tutor": "Greek Tutor"
            },

            limits: {
                "sermonsPerMonth": "{count} sermons/month",
                "sermonsPerMonth_unlimited": "Unlimited sermons",
                "libraryStorageMB": "{count} MB of storage",
                "libraryStorageMB_GB": "{count} GB of storage",
                "greekSessionsPerMonth": "{count} Greek study sessions/month",
                "greekSessionsPerMonth_unlimited": "Unlimited Greek sessions",
                "maxPreachingPlansPerMonth": "{count} preaching plans/month",
                "maxPreachingPlansPerMonth_unlimited": "Unlimited preaching plans",
                "maxMembers": "{count} team member",
                "maxMembers_plural": "{count} team members"
            }
        },
        es: {
            name: "Pro",
            description: "Para pastores que predican regularmente",

            features: {
                "sermon:create": "Crea sermones ilimitados",
                "sermon:ai_assistant": "Asistente de sermones con IA",
                "sermon:export_pdf": "Exporta sermones a PDF",
                "library:upload": "Sube recursos a tu biblioteca",
                "library:semantic_search": "Búsqueda semántica en tu biblioteca"
            },

            modules: {
                "module:dashboard": "Panel",
                "module:sermones": "Sermones",
                "module:planes": "Planes de Predicación",
                "module:generar": "Generador de Sermones",
                "module:biblioteca": "Biblioteca",
                "module:configuracion": "Configuración",
                "module:greek_tutor": "Tutor de Griego"
            },

            limits: {
                "sermonsPerMonth": "{count} sermones/mes",
                "sermonsPerMonth_unlimited": "Sermones ilimitados",
                "libraryStorageMB": "{count} MB de almacenamiento",
                "libraryStorageMB_GB": "{count} GB de almacenamiento",
                "greekSessionsPerMonth": "{count} sesiones de griego/mes",
                "greekSessionsPerMonth_unlimited": "Sesiones de griego ilimitadas",
                "maxPreachingPlansPerMonth": "{count} planes de predicación/mes",
                "maxPreachingPlansPerMonth_unlimited": "Planes de predicación ilimitados",
                "maxMembers": "{count} miembro del equipo",
                "maxMembers_plural": "{count} miembros del equipo"
            }
        }
    },

    team: {
        en: {
            name: "Team",
            description: "For ministry teams and larger churches",

            features: {
                "sermon:create": "Create unlimited sermons",
                "sermon:ai_assistant": "AI-powered sermon assistant",
                "sermon:advanced_homiletics": "Advanced homiletical analysis",
                "sermon:export_pdf": "Export sermons to PDF",
                "sermon:custom_templates": "Custom sermon templates",
                "library:upload": "Upload resources to your library",
                "library:semantic_search": "Semantic search in your library"
            },

            modules: {
                "module:dashboard": "Dashboard",
                "module:sermones": "Sermons",
                "module:planes": "Preaching Plans",
                "module:generar": "Sermon Generator",
                "module:biblioteca": "Library",
                "module:configuracion": "Settings",
                "module:greek_tutor": "Greek Tutor"
            },

            limits: {
                "sermonsPerMonth": "{count} sermons/month",
                "sermonsPerMonth_unlimited": "Unlimited sermons",
                "libraryStorageMB": "{count} MB of storage",
                "libraryStorageMB_GB": "{count} GB of storage",
                "greekSessionsPerMonth": "{count} Greek study sessions/month",
                "greekSessionsPerMonth_unlimited": "Unlimited Greek sessions",
                "maxPreachingPlansPerMonth": "{count} preaching plans/month",
                "maxPreachingPlansPerMonth_unlimited": "Unlimited preaching plans",
                "maxMembers": "{count} team member",
                "maxMembers_plural": "{count} team members"
            }
        },
        es: {
            name: "Team",
            description: "Para equipos ministeriales e iglesias grandes",

            features: {
                "sermon:create": "Crea sermones ilimitados",
                "sermon:ai_assistant": "Asistente de sermones con IA",
                "sermon:advanced_homiletics": "Análisis homilético avanzado",
                "sermon:export_pdf": "Exporta sermones a PDF",
                "sermon:custom_templates": "Plantillas de sermón personalizadas",
                "library:upload": "Sube recursos a tu biblioteca",
                "library:semantic_search": "Búsqueda semántica en tu biblioteca"
            },

            modules: {
                "module:dashboard": "Panel",
                "module:sermones": "Sermones",
                "module:planes": "Planes de Predicación",
                "module:generar": "Generador de Sermones",
                "module:biblioteca": "Biblioteca",
                "module:configuracion": "Configuración",
                "module:greek_tutor": "Tutor de Griego"
            },

            limits: {
                "sermonsPerMonth": "{count} sermones/mes",
                "sermonsPerMonth_unlimited": "Sermones ilimitados",
                "libraryStorageMB": "{count} MB de almacenamiento",
                "libraryStorageMB_GB": "{count} GB de almacenamiento",
                "greekSessionsPerMonth": "{count} sesiones de griego/mes",
                "greekSessionsPerMonth_unlimited": "Sesiones de griego ilimitadas",
                "maxPreachingPlansPerMonth": "{count} planes de predicación/mes",
                "maxPreachingPlansPerMonth_unlimited": "Planes de predicación ilimitados",
                "maxMembers": "{count} miembro del equipo",
                "maxMembers_plural": "{count} miembros del equipo"
            }
        }
    },

    free: {
        en: {
            name: "Free",
            description: "Start your journey with basic features",

            features: {
                "sermon:create": "Create unlimited sermons",
                "library:upload": "Upload resources to your library"
            },

            modules: {
                "module:dashboard": "Dashboard",
                "module:sermones": "Sermons",
                "module:biblioteca": "Library"
            },

            limits: {
                "sermonsPerMonth": "{count} sermons/month",
                "sermonsPerMonth_unlimited": "Unlimited sermons",
                "libraryStorageMB": "{count} MB of storage",
                "libraryStorageMB_GB": "{count} GB of storage",
                "greekSessionsPerMonth": "{count} Greek study sessions/month",
                "greekSessionsPerMonth_unlimited": "Unlimited Greek sessions",
                "maxPreachingPlans": "{count} preaching plans total",
                "maxPreachingPlansPerMonth": "{count} preaching plans/month",
                "maxMembers": "{count} team member",
                "maxMembers_plural": "{count} team members"
            }
        },
        es: {
            name: "Gratis",
            description: "Comienza tu viaje con funciones básicas",

            features: {
                "sermon:create": "Crea sermones ilimitados",
                "library:upload": "Sube recursos a tu biblioteca"
            },

            modules: {
                "module:dashboard": "Panel",
                "module:sermones": "Sermones",
                "module:biblioteca": "Biblioteca"
            },

            limits: {
                "sermonsPerMonth": "{count} sermones/mes",
                "sermonsPerMonth_unlimited": "Sermones ilimitados",
                "libraryStorageMB": "{count} MB de almacenamiento",
                "libraryStorageMB_GB": "{count} GB de almacenamiento",
                "greekSessionsPerMonth": "{count} sesiones de griego/mes",
                "greekSessionsPerMonth_unlimited": "Sesiones de griego ilimitadas",
                "maxPreachingPlans": "{count} planes de predicación total",
                "maxPreachingPlansPerMonth": "{count} planes de predicación/mes",
                "maxMembers": "{count} miembro del equipo",
                "maxMembers_plural": "{count} miembros del equipo"
            }
        }
    }
};

async function seedPlanTranslationsV2() {
    console.log('🌱 Starting plan_translations v2 seeding...\n');

    try {
        const translationsRef = db.collection('plan_translations');

        for (const [planId, translations] of Object.entries(planTranslationsData)) {
            console.log(`📝 Updating ${planId}...`);

            await translationsRef.doc(planId).set({
                planId,
                translations
            }, { merge: true });

            console.log(`✅ ${planId} updated successfully`);
        }

        console.log('\n✨ All plan translations updated with modules and limits!');
        console.log('\n📊 Summary:');
        console.log(`  - Plans updated: ${Object.keys(planTranslationsData).length}`);
        console.log(`  - Languages: 2 (en, es)`);
        console.log(`  - New fields: modules, limits`);

    } catch (error) {
        console.error('❌ Error seeding plan translations:', error);
        throw error;
    }
}

// Run the script
seedPlanTranslationsV2()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
