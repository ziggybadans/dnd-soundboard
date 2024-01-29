import { db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { initializeSounds } from "./Sounds";

const saveStateToFirestore = async (userId, categories) => {
  const docRef = doc(db, "soundboardStates", userId);

  const serializableCategories = {};
  for (const [categoryName, soundGroups] of Object.entries(categories)) {
    serializableCategories[categoryName] = soundGroups.map((group) => {
      // Return a new object with the non-serializable properties removed
      return {
        ...group,
        sounds: group.sounds.map((sound) => {
          return {
            name: sound.name, // retain other properties as needed, except 'howl'
            url: sound.url,
            volume: sound.volume,
            id: sound.id,
            // Do not include 'howl' property
          };
        }),
      };
    });
  }

  // Here we assume categories is a map with category names as key and sound groups arrays as value.
  try {
    await setDoc(docRef, { categories: serializableCategories });
    console.log("State saved successfully");
  } catch (error) {
    console.error("Error saving state to Firestore:", error);
  }
};

const loadStateFromFirestore = async (userId) => {
  const docRef = doc(db, "soundboardStates", userId);

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("State loaded successfully");
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

const saveSceneToFirestore = async (userId, sceneId, sceneData) => {
  const sceneDocRef = doc(
    collection(db, "soundboardStates", userId, "scenes"),
    sceneId
  );

  try {
    await setDoc(sceneDocRef, sceneData);
    console.log(`Scene ${sceneId} saved successfully`);
  } catch (error) {
    console.error(`Error saving scene ${sceneId} to Firestore:`, error);
  }
};

const loadScenesFromFirestore = async (userId) => {
  const scenesCollectionRef = collection(
    db,
    "soundboardStates",
    userId,
    "scenes"
  );

  try {
    const querySnapshot = await getDocs(scenesCollectionRef);
    const scenes = {};
    querySnapshot.forEach((doc) => {
      scenes[doc.id] = doc.data();
    });
    console.log("Scenes loaded successfully: ", scenes);
    return scenes;
  } catch (error) {
    console.error("Error loading scenes from Firestore:", error);
    return {};
  }
};

const loadSceneByIdFromFirestore = async (userId, sceneId) => {
  const sceneDocRef = doc(db, "soundboardStates", userId, "scenes", sceneId);

  try {
    const docSnap = await getDoc(sceneDocRef);

    if (docSnap.exists()) {
      console.log(`Scene ${sceneId} loaded successfully`);
      return docSnap.data();
    } else {
      console.log(`No such scene: ${sceneId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error loading scene ${sceneId}:`, error);
    return null;
  }
};

const deleteSceneFromFirestore = async (userId, sceneId) => {
  const sceneDocRef = doc(db, "soundboardStates", userId, "scenes", sceneId);

  try {
    await deleteDoc(sceneDocRef);
    console.log(`Scene ${sceneId} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting scene ${sceneId} from Firestore:`, error);
  }
};

const renameSceneInFirestore = async (userId, sceneId, newName) => {
  const sceneDocRef = doc(db, 'soundboardStates', userId, 'scenes', sceneId);

  try {
    // Merge the new name into the existing document data
    await updateDoc(sceneDocRef, { name: newName });
    console.log(`Scene ${sceneId} renamed successfully in Firestore`);
  } catch (error) {
    console.error(`Error renaming scene ${sceneId} in Firestore:`, error);
  }
};

export {
  saveStateToFirestore,
  loadStateFromFirestore,
  saveSceneToFirestore,
  loadScenesFromFirestore,
  loadSceneByIdFromFirestore,
  deleteSceneFromFirestore,
  renameSceneInFirestore
};
