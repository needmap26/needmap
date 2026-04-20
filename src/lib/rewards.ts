import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const awardCoins = async (uid: string, amount: number, reason: string) => {
  try {
    // Increment coins
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      coins: increment(amount),
    });

    // Log transaction
    await addDoc(collection(db, 'users', uid, 'coinTransactions'), {
      amount,
      reason,
      timestamp: serverTimestamp(),
    });
    
    // We update 'level' elsewhere upon receiving snapshot, or we could compute it here by fetching user.
  } catch (error) {
    console.error('Error awarding coins:', error);
  }
};
