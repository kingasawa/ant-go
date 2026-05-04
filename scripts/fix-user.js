const admin = require('./node_modules/firebase-admin');
const creds = require('./firebase-credentials.json');

admin.initializeApp({ credential: admin.credential.cert(creds) });

const EMAIL = 'trancatkhanh@gmail.com';

admin.auth().getUserByEmail(EMAIL).then(user => {
  console.log('UID:', user.uid);
  const db = admin.firestore();
  const now = new Date();
  const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    plan: 'free',
    builds: 0,
    credits: 15,
    planCredits: 15,
    creditsResetAt: resetAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}).then(() => {
  console.log('Done: profile created with 15 credits');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

