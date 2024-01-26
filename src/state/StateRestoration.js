import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const saveStateToFirestore = async (userId, soundGroups) => {
  const docRef = doc(db, 'soundboardStates', userId);

  // Prepare soundGroups for saving by removing non-serializable properties
  const preparedSoundGroups = soundGroups.map(group => ({
    ...group,
    sounds: group.sounds.map(({ id, name, url, volume }) => ({
      id, name, url, volume // Only save these properties
    }))
  }));

  try {
    await setDoc(docRef, { soundGroups: preparedSoundGroups });
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
      return docSnap.data().soundGroups; // Assuming soundGroups is what you want to retrieve
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