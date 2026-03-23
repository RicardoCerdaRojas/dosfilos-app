const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const PLAN_PRICES = { pro: 9.99, team: 24.99, basic: 4.99 };
const PLAN_NORMALIZED = { free: 'free', pro: 'pro', basic: 'pro', team: 'team' };

function getTodayString() {
    const today = new Date();
    return today.getFullYear() + '-' + 
        String(today.getMonth()+1).padStart(2,'0') + '-' + 
        String(today.getDate()).padStart(2,'0');
}

async function run() {
    const today = getTodayString();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log('Recalculating for', today);

    const usersSnap = await db.collection('users').get();
    let totalUsers = 0, newUsersToday = 0, mrr = 0, paidUsers = 0;
    const planDist = { free: 0, pro: 0, team: 0 };
    usersSnap.forEach(doc => {
        const user = doc.data();
        totalUsers++;
        const createdAt = user.createdAt ? user.createdAt.toDate() : null;
        if (createdAt && createdAt >= todayStart) newUsersToday++;
        const rawPlan = user.subscription && user.subscription.planId ? user.subscription.planId : 'free';
        const norm = PLAN_NORMALIZED[rawPlan] || 'free';
        planDist[norm]++;
        const status = user.subscription && user.subscription.status;
        if (rawPlan !== 'free' && (status === 'active' || status === 'trialing')) {
            mrr += PLAN_PRICES[rawPlan] || 0;
            paidUsers++;
        }
    });

    const dauSnap = await db.collection('user_activities')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(todayStart)).get();
    const dauSet = new Set();
    dauSnap.forEach(doc => dauSet.add(doc.data().userId));
    const dau = dauSet.size;

    const mauSnap = await db.collection('user_activities')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get();
    const mauSet = new Set();
    mauSnap.forEach(doc => mauSet.add(doc.data().userId));
    const mau = mauSet.size;

    const sermonsSnap = await db.collection('sermons').get();
    let totalSermons = 0, publishedSermons = 0, draftSermons = 0, sermonsCreatedToday = 0;
    sermonsSnap.forEach(doc => {
        const s = doc.data();
        totalSermons++;
        if (s.status === 'published') publishedSermons++;
        else draftSermons++;
        const ca = s.createdAt ? s.createdAt.toDate() : null;
        if (ca && ca >= todayStart) sermonsCreatedToday++;
    });

    const existingAgg = await db.doc('global_metrics/aggregate').get();
    let totalGreekSessions = existingAgg.exists ? (existingAgg.data().allTime.greekSessions || 0) : 0;
    let totalSeries = existingAgg.exists ? (existingAgg.data().allTime.series || 0) : 0;

    for (const col of ['aiChatSessions', 'greekSessions', 'facultySessions']) {
        const snap = await db.collection(col).get();
        if (!snap.empty) { totalGreekSessions = snap.size; console.log('Found sessions in', col, snap.size); break; }
    }

    const batch = db.batch();
    batch.set(db.doc('global_metrics/aggregate'), {
        allTime: { users: totalUsers, sermons: totalSermons, published: publishedSermons, drafts: draftSermons, greekSessions: totalGreekSessions, series: totalSeries, plans: 0 },
        currentMonth: { dau, mau, mrr: Math.round(mrr*100)/100, paidUsers },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });

    batch.set(db.doc('global_metrics_daily/' + today), {
        date: today,
        users: { new: newUsersToday, total: totalUsers, paidUsers, byPlan: { free: planDist.free, pro: planDist.pro, team: planDist.team } },
        totalLogins: dau,
        sermons: { created: sermonsCreatedToday },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });

    await batch.commit();

    console.log('SUCCESS!');
    console.log('totalUsers:', totalUsers, '| DAU:', dau, '| MAU:', mau);
    console.log('Plans:', JSON.stringify(planDist), '| MRR:', mrr.toFixed(2), '| paidUsers:', paidUsers);
    console.log('Sermons:', totalSermons, '| Greek Sessions:', totalGreekSessions, '| Series:', totalSeries);
    process.exit(0);
}

run().catch(function(e) { console.error(e.message); process.exit(1); });
