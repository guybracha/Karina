// src/lib/chatbotAnalytics.js
import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  updateDoc
} from "firebase/firestore";

/**
 * Save chat message to Firestore for analytics and learning
 */
export async function saveChatMessage(userMessage, botResponse, metadata = {}) {
  try {
    await addDoc(collection(db, "chatLogs"), {
      userMessage,
      botResponse,
      timestamp: Timestamp.now(),
      wasHelpful: null, // User can rate later
      category: metadata.category || "general",
      matchedKeywords: metadata.matchedKeywords || [],
      userId: metadata.userId || "anonymous",
      sessionId: metadata.sessionId || generateSessionId(),
    });
  } catch (error) {
    // Silent fail - don't spam console with permission errors
    if (error?.code !== 'permission-denied') {
      console.warn("Error saving chat log:", error.message);
    }
  }
}

/**
 * Get frequently asked questions from chat logs
 */
export async function getFrequentQuestions(limitCount = 10) {
  try {
    const q = query(
      collection(db, "chatLogs"),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    const messageCounts = {};
    
    snapshot.forEach(doc => {
      const msg = doc.data().userMessage.toLowerCase().trim();
      messageCounts[msg] = (messageCounts[msg] || 0) + 1;
    });
    
    return Object.entries(messageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitCount)
      .map(([question, count]) => ({ question, count }));
  } catch (error) {
    console.error("Error getting frequent questions:", error);
    return [];
  }
}

/**
 * Get unanswered questions (where bot didn't have a good match)
 */
export async function getUnansweredQuestions(limitCount = 20) {
  try {
    const q = query(
      collection(db, "chatLogs"),
      where("category", "==", "fallback"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    }));
  } catch (error) {
    console.error("Error getting unanswered questions:", error);
    return [];
  }
}

/**
 * Rate a chat response
 */
export async function rateChatResponse(messageId, isHelpful) {
  try {
    const messageRef = doc(db, "chatLogs", messageId);
    await updateDoc(messageRef, {
      wasHelpful: isHelpful,
      ratedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error rating chat response:", error);
  }
}

/**
 * Get chat analytics
 */
export async function getChatAnalytics(daysBack = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const q = query(
      collection(db, "chatLogs"),
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    const analytics = {
      totalChats: snapshot.size,
      byCategory: {},
      helpfulRatio: 0,
      peakHours: {},
    };
    
    let helpfulCount = 0;
    let ratedCount = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Category breakdown
      analytics.byCategory[data.category] = (analytics.byCategory[data.category] || 0) + 1;
      
      // Helpful ratio
      if (data.wasHelpful !== null) {
        ratedCount++;
        if (data.wasHelpful) helpfulCount++;
      }
      
      // Peak hours
      const hour = data.timestamp.toDate().getHours();
      analytics.peakHours[hour] = (analytics.peakHours[hour] || 0) + 1;
    });
    
    analytics.helpfulRatio = ratedCount > 0 ? (helpfulCount / ratedCount) * 100 : 0;
    
    return analytics;
  } catch (error) {
    console.error("Error getting chat analytics:", error);
    return null;
  }
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Search similar questions from history
 */
export async function findSimilarQuestions(userMessage, limitCount = 5) {
  try {
    const q = query(
      collection(db, "chatLogs"),
      where("wasHelpful", "==", true),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const similar = [];
    
    const userWords = userMessage.toLowerCase().split(/\s+/);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const msgWords = data.userMessage.toLowerCase().split(/\s+/);
      
      // Calculate word overlap
      const overlap = userWords.filter(word => 
        msgWords.some(mw => mw.includes(word) || word.includes(mw))
      ).length;
      
      if (overlap > 0) {
        similar.push({
          question: data.userMessage,
          answer: data.botResponse,
          similarity: overlap / userWords.length,
        });
      }
    });
    
    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limitCount);
  } catch (error) {
    // Silent fail for permission errors
    if (error?.code !== 'permission-denied') {
      console.warn("Error finding similar questions:", error.message);
    }
    return [];
  }
}
