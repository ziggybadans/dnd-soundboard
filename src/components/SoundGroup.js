import React, { useState, useEffect } from "react";
import { Howl } from "howler";
import { v4 as uuidv4 } from "uuid";
import { useDropzone } from "react-dropzone";
import "./SoundGroup.css";
import { db, storage } from "../firebaseConfig.js"; // Assuming you have setup Firebase Storage in your config
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../utils/AuthContext.js";

const SoundGroup = ({
  group,
  closeModal,
  onSoundsUpdate,
  onGroupVolumeChange,
  onFadeDurationChange,
  onSoundVolumeChange,
  onAddSound,
  onRemoveSound,
}) => {
  const { currentUser } = useAuth();
  // You can access user ID using currentUser.uid
  const userId = currentUser ? currentUser.uid : null;

  const [uploadProgresses, setUploadProgresses] = useState({});
  const [uploads, setUploads] = useState({});

  const onDrop = (acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      const uniqueFileId = uuidv4();
      setUploads((prevUploads) => ({
        ...prevUploads,
        [uniqueFileId]: { name: file.name, progress: 0, isUploading: true },
      }));

      const fileRef = ref(storage, `sounds/${userId}/${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      // Listen for state changes, errors, and completion of the upload.
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploads((prevUploads) => ({
            ...prevUploads,
            [uniqueFileId]: { ...prevUploads[uniqueFileId], progress },
          }));
        },
        (error) => {
          setUploads((prevUploads) => {
            const newUploads = { ...prevUploads };
            delete newUploads[uniqueFileId];
            return newUploads;
          });
        },
        () => {
          setUploads((prevUploads) => {
            const newUploads = { ...prevUploads };
            delete newUploads[uniqueFileId];
            return newUploads;
          });
          
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            const soundData = {
              name: file.name,
              url: downloadURL,
              volume: 1,
            };
            addDoc(collection(db, "users", userId, "sounds"), soundData).then(
              () => {
                const newSound = {
                  ...soundData,
                  id: uuidv4(),
                  howl: new Howl({
                    src: [downloadURL],
                    format: ["mp3", "ogg", "wav"],
                    volume: soundData.volume,
                  }),
                };
                onAddSound(newSound);
                setUploadProgresses((prevProgresses) => {
                  const updatedProgresses = { ...prevProgresses };
                  delete updatedProgresses[uniqueFileId];
                  return updatedProgresses;
                });
              }
            );
          });
        }
      );
    });
  };

  // Function to play/pause a sound with fade in/out
  const togglePlayPause = (soundId) => {
    const sound = group.sounds.find((sound) => sound.id === soundId);
    if (sound && sound.howl) {
      if (sound.howl.playing()) {
        sound.howl.fade(sound.howl.volume(), 0, group.fadeDuration);
        setTimeout(() => {
          sound.howl.pause();
        }, group.fadeDuration);
      } else {
        sound.howl.volume(0);
        sound.howl.play();
        sound.howl.fade(
          0,
          sound.volume * group.groupVolume,
          group.fadeDuration
        );
      }
    }
  };

  // Handle changing group volume
  const handleGroupVolumeChange = (event) => {
    const volume = Number(event.target.value);
    onGroupVolumeChange(volume);
  };

  // Handle individual sound volume change
  const handleSoundVolumeChange = (soundId, event) => {
    const volume = Number(event.target.value);
    onSoundVolumeChange(soundId, volume);
  };

  // Handle changing of the global fade duration
  const handleFadeDurationChange = (event) => {
    const duration = Number(event.target.value);
    onFadeDurationChange(duration);
  };

  // Function to remove a sound from the list
  const removeSound = (soundId) => {
    onRemoveSound(soundId); // This will call the function passed via props to remove the sound
  };

  // Get root props and input props from `useDropzone`
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: "audio/*",
  });

  return (
    <div className="sound-group">
      <div className="settings">
        <div className="fade-control">
          <label htmlFor="fadeDuration">Fade Duration:</label>
          <input
            type="range"
            id="fadeDuration"
            min="100"
            max="5000"
            value={group.fadeDuration}
            onChange={handleFadeDurationChange}
          />
        </div>
        <div className="volume-control">
          <label htmlFor="groupVolume">
            Global Volume: {Math.round(group.groupVolume * 100)}%
          </label>
          <input
            type="range"
            id="groupVolume"
            min="0"
            max="1"
            step="0.01"
            value={group.groupVolume}
            onChange={handleGroupVolumeChange}
          />
        </div>
      </div>
      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        <p>Drag 'n' drop some files here, or click to select files</p>
      </div>
      <ul className="upload-list">
        {Object.entries(uploads).map(
          ([id, upload]) =>
            upload.isUploading && (
              <li key={id} className="upload-item">
                {upload.name}
                <div>
                  <progress value={upload.progress} max="100"></progress>
                  <span>{upload.progress.toFixed(0)}%</span>
                </div>
              </li>
            )
        )}
      </ul>
      <ul className="sound-list">
        {group.sounds.map((sound) => {
          const isUploading = uploadProgresses.hasOwnProperty(sound.id);

          return (
            <li key={sound.id} className="sound-item">
              {sound.name}
              <button
                onClick={() => togglePlayPause(sound.id)}
                disabled={isUploading}
              >
                Play/Pause
              </button>
              <label htmlFor={`volume-${sound.id}`}>
                Volume: {Math.round(sound.volume * 100)}%
              </label>
              <input
                type="range"
                id={`volume-${sound.id}`}
                min="0"
                max="1"
                step="0.01"
                value={sound.volume}
                onChange={(e) => handleSoundVolumeChange(sound.id, e)}
                disabled={isUploading}
              />
              <button
                onClick={() => removeSound(sound.id)}
                disabled={isUploading}
              >
                Remove
              </button>
              {uploadProgresses[sound.id] && (
                <div>
                  <label>
                    Uploading: {uploadProgresses[sound.id].toFixed(0)}%
                  </label>
                  <progress value={uploadProgresses[sound.id]} max="100" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button onClick={closeModal}>Close</button>
    </div>
  );
};

export default SoundGroup;
