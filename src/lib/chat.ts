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
  currentUser: User,
  otherUser: User,
  relatedNeedId?: string
): Promise<string> => {
  if (!currentUser?.uid || !otherUser?.uid) {
    throw new Error("Missing user IDs to create conversation");
  }

  const isCurrentNGO = currentUser.role === 'ngo_admin' || currentUser.role === 'ngo';
  const ngoId = isCurrentNGO ? String(currentUser.uid) : String(otherUser.uid);
  const volunteerId = isCurrentNGO ? String(otherUser.uid) : String(currentUser.uid);

  // Use the format: needId_ngoId_volunteerId
  const convId = relatedNeedId 
    ? `${relatedNeedId}_${ngoId}_${volunteerId}` 
    : `${[String(currentUser.uid), String(otherUser.uid)].sort().join('_')}`;

  const convRef = doc(db, 'conversations', convId);
  const convSnap = await getDoc(convRef);

  if (convSnap.exists()) {
    if (relatedNeedId && convSnap.data().relatedNeedId !== relatedNeedId) {
      await updateDoc(convRef, { relatedNeedId });
    }
    return convId;
  }

  let otherName = otherUser?.name as string;
  let otherRole = otherUser?.role as string;
  let otherPhoto = otherUser?.profileImage as string;

  // Try to fetch if missing
  if (!otherName) {
    try {
      const uSnap = await getDoc(doc(db, 'users', String(otherUser.uid)));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        otherName = uData.name || "Unknown User";
        otherRole = uData.role || "volunteer";
        otherPhoto = uData.profileImage || "";
      }
    } catch (err) {
      console.warn("Failed to fetch other user details", err);
    }
  }

  // Create new conversation document
  await setDoc(convRef, {
    participants: [currentUser.uid, otherUser.uid],
    participantNames: {
      [String(currentUser.uid)]: currentUser?.name || "Sender",
      [String(otherUser.uid)]: otherName || "Unknown User",
    },
    participantPhotos: {
      [String(currentUser.uid)]: currentUser?.profileImage || '',
      [String(otherUser.uid)]: otherPhoto || '',
    },
    participantRoles: {
      [String(currentUser.uid)]: currentUser?.role || 'volunteer',
      [String(otherUser.uid)]: otherRole || 'ngo',
    },
    lastMessage: '',
    updatedAt: serverTimestamp(),
    lastMessageSenderId: '',
    unreadCount: {
      [String(currentUser.uid)]: 0,
      [String(otherUser.uid)]: 0,
    },
    relatedNeedId: relatedNeedId || null,
    createdAt: serverTimestamp(),
  });
  
  return convId;
}

export const sendMessage = async (
  convId: string,
  sender: User,
  text: string,
  otherUid: string,
  imageUrl: string | null = null
): Promise<void> => {
  if (!convId || !sender?.uid || !text?.trim()) {
    throw new Error("Invalid message parameters");
  }

  try {
    // Add message to top-level collection
    await addDoc(
      collection(db, 'messages'),
      {
        conversationId: convId,
        senderId: sender.uid,
        senderName: sender.name || "User",
        senderPhoto: sender.profileImage || '',
        text: text.trim(),
        type: imageUrl ? 'image' : 'text',
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        read: false,
        readAt: null,
      }
    );

    // Update conversation metadata
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: imageUrl ? 'Sent an image' : text.trim(),
      updatedAt: serverTimestamp(),
      lastMessageSenderId: sender.uid,
      [`unreadCount.${otherUid}`]: increment(1),
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
    collection(db, 'messages'),
    where('conversationId', '==', convId),
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
    const q = query(collection(db, 'messages'), where('conversationId', '==', convId));
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

