import {
  collection, query, where, orderBy, limit,
  addDoc, updateDoc, doc, onSnapshot,
  serverTimestamp, getDocs,
  increment
} from 'firebase/firestore'
import { db } from './firebase'

// Find existing conversation between two users
// or create a new one
export const getOrCreateConversation = async (
  currentUser: Record<string, unknown>,
  otherUser: Record<string, unknown>,
  relatedNeedId?: string
): Promise<string> => {
  // Query for existing conversation
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', currentUser.uid)
  )
  const snap = await getDocs(q)
  const existing = snap.docs.find(d =>
    d.data().participants.includes(otherUser.uid)
  )
  if (existing) return existing.id

  // Create new conversation
  const convRef = await addDoc(collection(db, 'conversations'), {
    participants: [currentUser.uid, otherUser.uid],
    participantNames: {
      [currentUser.uid as string]: currentUser.name,
      [otherUser.uid as string]: otherUser.name,
    },
    participantPhotos: {
      [currentUser.uid as string]: currentUser.profileImage || '',
      [otherUser.uid as string]: otherUser.profileImage || '',
    },
    participantRoles: {
      [currentUser.uid as string]: currentUser.role,
      [otherUser.uid as string]: otherUser.role,
    },
    lastMessage: '',
    updatedAt: serverTimestamp(),
    lastMessageSenderId: '',
    unreadCount: {
      [currentUser.uid as string]: 0,
      [otherUser.uid as string]: 0,
    },
    relatedNeedId: relatedNeedId || null,
    createdAt: serverTimestamp(),
  })
  return convRef.id
}

export const sendMessage = async (
  convId: string,
  sender: Record<string, unknown>,
  text: string,
  otherUid: string,
  imageUrl: string | null = null
): Promise<void> => {
  // Add message to top-level collection
  await addDoc(
    collection(db, 'messages'),
    {
      conversationId: convId,
      senderId: sender.uid,
      senderName: sender.name,
      senderPhoto: sender.profileImage || '',
      text: text.trim(),
      type: imageUrl ? 'image' : 'text',
      imageUrl: imageUrl,
      createdAt: serverTimestamp(),
      read: false,
      readAt: null,
    }
  )
  // Update conversation metadata
  await updateDoc(doc(db, 'conversations', convId), {
    lastMessage: imageUrl ? 'Sent an image' : text.trim(),
    updatedAt: serverTimestamp(),
    lastMessageSenderId: sender.uid,
    [`unreadCount.${otherUid}`]: increment(1),
  })
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
  callback: (messages: Record<string, unknown>[]) => void,
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
  callback: (convs: Record<string, unknown>[]) => void,
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
