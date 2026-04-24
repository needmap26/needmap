import {
  collection, query, where, orderBy, limit,
  addDoc, updateDoc, doc, onSnapshot,
  serverTimestamp, getDocs,
  increment, setDoc, getDoc, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { User } from '@/types'

// Find existing conversation between two users
// or create a new one
export const getOrCreateConversation = async (
  currentUser: any,
  otherUser: any,
  relatedNeedId?: string
): Promise<string> => {
  if (!currentUser?.uid || !otherUser?.uid) {
    throw new Error("Missing user IDs to create conversation");
  }

  const convId = [String(currentUser.uid), String(otherUser.uid)].sort().join('_');

  const convRef = doc(db, 'conversations', convId);
  const convSnap = await getDoc(convRef);

  if (convSnap.exists()) {
    return convId;
  }

  // Create new conversation document
  await setDoc(convRef, {
    id: convId,
    participants: [currentUser.uid, otherUser.uid],
    participantNames: {
      [currentUser.uid]: currentUser.displayName || currentUser.name || "Unknown User",
      [otherUser.uid]: otherUser.displayName || otherUser.name || "Unknown User"
    },
    lastMessage: '',
    lastMessageSenderId: '',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    relatedNeedId: relatedNeedId || null
  });
  
  return convId;
}

export const sendMessage = async (
  convId: string,
  sender: any,
  text: string,
  otherUid: string,
  imageUrl: string | null = null
): Promise<void> => {
  if (!convId || !sender?.uid || !text?.trim()) {
    throw new Error("Invalid message parameters");
  }

  try {
    // Add message to subcollection
    await addDoc(
      collection(db, 'conversations', convId, 'messages'),
      {
        senderId: sender.uid,
        senderName: sender.displayName || sender.name || "Unknown User",
        text: text.trim(),
        createdAt: serverTimestamp()
      }
    );

    // Update conversation metadata
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: text.trim(),
      lastMessageSenderId: sender.uid,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to send message:", error);
    throw new Error("Failed to send message");
  }
}

// Mark messages as read
export const markAsRead = async (
  convId: string,
  uid: string
): Promise<void> => {
  await updateDoc(doc(db, 'conversations', convId), {
    [`unreadCount.${uid}`]: 0,
  })
}

export const subscribeToMessages = (
  convId: string,
  callback: (messages: Record<string, any>[]) => void,
  onError?: (error: Error | unknown) => void
) => {
  if (!convId) return () => {};
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  )
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))
    callback(msgs)
  }, (err) => {
    console.error("subscribeToMessages error:", err);
    if (onError) onError(err);
  })
}

// Listen to all conversations for a user
export const subscribeToConversations = (
  uid: string,
  callback: (convs: Record<string, any>[]) => void,
  onError?: (error: Error | unknown) => void
) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const convs = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))
    callback(convs)
  }, (err) => {
    console.error("subscribeToConversations error:", err);
    if (onError) onError(err);
  })
}

export const clearChat = async (convId: string): Promise<void> => {
  if (!convId) throw new Error("Invalid conversation ID");
  try {
    const q = query(collection(db, 'conversations', convId, 'messages'));
    const snap = await getDocs(q);
    
    if (snap.docs.length > 0) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }

    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: '',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to clear chat:", error);
    throw new Error("Failed to clear chat");
  }
}

