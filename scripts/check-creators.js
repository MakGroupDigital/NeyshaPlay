#!/usr/bin/env node

/**
 * Script pour vérifier les créateurs dans Firestore
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "studio-4725166594-b0358",
  appId: "1:42990010526:web:b2167b12a7cd9a233cfb8f",
  apiKey: "AIzaSyBVgR1qeDg_Z9eXc7mJ5WzprlvTCMhJr4o",
  authDomain: "studio-4725166594-b0358.firebaseapp.com",
  storageBucket: "studio-4725166594-b0358.appspot.com",
  messagingSenderId: "42990010526"
};

async function checkCreators() {
  console.log('🔍 Vérification des créateurs dans Firestore...\n');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // Vérifier tous les utilisateurs
    console.log('📊 Tous les utilisateurs:');
    const allUsersQuery = query(collection(db, 'users'), limit(20));
    const allUsersSnapshot = await getDocs(allUsersQuery);
    console.log(`Total: ${allUsersSnapshot.docs.length} utilisateurs trouvés\n`);
    
    allUsersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name || 'Sans nom'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Role: ${data.role || 'N/A'}`);
      console.log(`   Gender: ${data.gender || 'N/A'}`);
      console.log(`   Likes: ${data.likes || 0}`);
      console.log('');
    });

    // Vérifier les créateurs
    console.log('\n👥 Créateurs uniquement:');
    const creatorsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'creator'),
      orderBy('likes', 'desc'),
      limit(10)
    );
    const creatorsSnapshot = await getDocs(creatorsQuery);
    console.log(`Total: ${creatorsSnapshot.docs.length} créateurs trouvés\n`);
    
    if (creatorsSnapshot.docs.length === 0) {
      console.log('⚠️  AUCUN CRÉATEUR TROUVÉ!');
      console.log('💡 Assurez-vous que certains utilisateurs ont role="creator" dans Firestore');
    } else {
      creatorsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.name || 'Sans nom'}`);
        console.log(`   Gender: ${data.gender || 'N/A'}`);
        console.log(`   Likes: ${data.likes || 0}`);
        console.log('');
      });
    }

    // Vérifier les créateurs par genre
    console.log('\n♀️  Créatrices (female):');
    const femaleQuery = query(
      collection(db, 'users'),
      where('role', '==', 'creator'),
      where('gender', '==', 'female'),
      orderBy('likes', 'desc'),
      limit(5)
    );
    const femaleSnapshot = await getDocs(femaleQuery);
    console.log(`Total: ${femaleSnapshot.docs.length} créatrices\n`);

    console.log('♂️  Créateurs (male):');
    const maleQuery = query(
      collection(db, 'users'),
      where('role', '==', 'creator'),
      where('gender', '==', 'male'),
      orderBy('likes', 'desc'),
      limit(5)
    );
    const maleSnapshot = await getDocs(maleQuery);
    console.log(`Total: ${maleSnapshot.docs.length} créateurs\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'failed-precondition') {
      console.log('\n💡 L\'index Firestore est peut-être manquant.');
      console.log('Exécutez: npm run deploy:indexes');
    }
  }
}

checkCreators().then(() => {
  console.log('✅ Vérification terminée');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
