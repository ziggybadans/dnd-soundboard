import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const saveStateToFirestore = async (userId, soundGroups) => {
  const docRef = doc(db, 'soundboardStates', userId);

  try {
    await setDoc(docRef, { soundGroups });
    console.log('State saved successfully');
  } catch (error) {
    console.error("Error saving state: ", error);
  }
};

export { saveStateToFirestore };