import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const saveStateToFirestore = async (userId, categories) => {
  const docRef = doc(db, 'soundboardStates', userId);

  // Here we assume categories is a map with category names as key and sound groups arrays as value.
  try {
    await setDoc(docRef, { categories });
    console.log('State saved successfully');
  } catch (error) {
    console.error("Error saving state to Firestore:", error);
  }
};

const loadStateFromFirestore = async (userId) => {
  const docRef = doc(db, 'soundboardStates', userId);

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('State loaded successfully');
      return docSnap.data().categories; // Assuming categories is what you want to retrieve
    } else {
      console.log("No such document!");
      return null; // Or any default state
    }
  } catch (error) {
    console.error("Error loading state: ", error);
    return null; // Handle this gracefully in your UI
  }
};

export { saveStateToFirestore, loadStateFromFirestore };