import React, { useState } from "react";
import { Howl } from "howler";
import { v4 as uuidv4 } from "uuid";
import { useDropzone } from "react-dropzone";
import "./SoundGroup.css"; // Adjust the path according to your file structure

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
  // Function to handle files dropped into the dropzone
  const onDrop = (acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      // Handle file drop
      const reader = new FileReader();
      reader.onload = () => {
        // Create Howl instance and update state
        const audioSrc = URL.createObjectURL(new Blob([reader.result]));
        const newSound = {
          id: uuidv4(),
          name: file.name,
          howl: new Howl({
            src: [audioSrc],
            format: ["mp3", "ogg", "wav"],
            volume: group.groupVolume,
          }),
          volume: 1,
        };

        onAddSound(newSound); // Update the parent state with the new sound
      };
      // Read in file as ArrayBuffer
      reader.readAsArrayBuffer(file);
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
      <ul className="sound-list">
        {group.sounds.map((sound) => (
          <li key={sound.id} className="sound-item">
            {sound.name}
            <button onClick={() => togglePlayPause(sound.id)}>
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
            />
            <button onClick={() => removeSound(sound.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={closeModal}>Close</button>
    </div>
  );
};

export default SoundGroup;
