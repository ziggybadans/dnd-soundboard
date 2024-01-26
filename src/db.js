// db.js
const openDatabase = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SoundboardDB', 1);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('sounds')) {
          db.createObjectStore('sounds', { keyPath: 'id' });
        }
      };
  
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.errorCode);
        reject(event.target.errorCode);
      };
  
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  };
  
  const saveFileToDB = async (file, soundId) => {
    const db = await openDatabase();
    const transaction = db.transaction(['sounds'], 'readwrite');
    const store = transaction.objectStore('sounds');
  
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = () => {
      const soundData = {
        id: soundId,
        content: fileReader.result,
        name: file.name
      };
  
      store.add(soundData);
    };
  };
  
  const loadFileFromDB = async (soundId) => {
    const db = await openDatabase();
    const transaction = db.transaction(['sounds']);
    const store = transaction.objectStore('sounds');

    return new Promise((resolve, reject) => {
      const request = store.get(soundId);
      
      request.onerror = (event) => {
        reject('Failed to retrieve sound from IndexedDB');
      };
      
      request.onsuccess = (event) => {
        const { content, name } = event.target.result;
        const blob = new Blob([content]);
        const url = URL.createObjectURL(blob);
        resolve({ url, name });
      };
    });
};
  
  export { openDatabase, saveFileToDB, loadFileFromDB };