import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { Howl } from "howler";
import { v4 as uuidv4 } from "uuid";
import SoundGroup from "./SoundGroup";
import SoundGroupSquare from "./SoundGroupSquare";
import "./Soundboard.css";
import {
  saveStateToFirestore,
  loadStateFromFirestore,
} from "../state/StateRestoration";
import { useAuth } from "../utils/AuthContext";

const Soundboard = () => {
  const [soundGroups, setSoundGroups] = useState([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState({});

  const [globalVolume, setGlobalVolume] = useState(1); // Default global volume

  const { currentUser } = useAuth();
  // You can access user ID using currentUser.uid
  const userId = currentUser && currentUser.uid;

// In Soundboard.js, adjusted useEffect for loading

useEffect(() => {
  if (currentUser) {
    const userId = currentUser.uid;
    loadStateFromFirestore(userId)
      .then((loadedData) => {
        if (!loadedData) {
          console.log('No data returned from Firestore');
          return;
        }
        
        // Ensure loadedData is an array, as expected.
        if(Array.isArray(loadedData)) {
          const groupsWithHowls = loadedData.map((group) => ({
            ...group,
            sounds: group.sounds.map((sound) => ({
              ...sound,
              howl: new Howl({
                src: [sound.url],
                volume: sound.volume,
                // Other Howl properties as needed
              }),
            })),
          }));
          setSoundGroups(groupsWithHowls);
        } else {
          // If data is not as expected, log or handle accordingly
          console.warn('Unexpected data structure:', loadedData);
        }
      })
      .catch((error) => {
        console.error('Error loading state from Firestore:', error);
      });
  }
}, [currentUser]);

  // Save state when `soundGroups` or `globalVolume` changes
  useEffect(() => {
    if (userId) {
      saveStateToFirestore(userId, soundGroups);
    }
  }, [soundGroups]);

  // Global update of group volumes when global volume is adjusted
  const updateAllGroupVolumes = (volume) => {
    setGlobalVolume(volume);

    setSoundGroups((prevGroups) =>
      prevGroups.map((group) => {
        group.sounds.forEach((sound) => {
          if (sound.howl.playing()) {
            // Adjust each sound's volume considering both the global and group volumes
            sound.howl.volume(sound.volume * group.groupVolume * volume);
          }
        });
        return group;
      })
    );
  };

  // Add a new sound group
  const addSoundGroup = () => {
    // Create a new group with a unique ID and a default name
    const newGroup = {
      id: uuidv4(),
      name: `Group ${soundGroups.length + 1}`,
      sounds: [], // Initial sounds inside the group
      groupVolume: 1, // Default group volume
      fadeDuration: 1000, // Default fade duration
    };
    setSoundGroups([...soundGroups, newGroup]);
  };

  // Set the volume for an entire sound group
  const updateGroupVolume = (groupIndex, volume) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) => {
        if (idx === groupIndex) {
          // Set Howl volume if the sounds are playing
          group.sounds.forEach((sound) => {
            if (sound.howl.playing()) {
              sound.howl.volume(sound.volume * volume); // Update the Howl volume here
            }
          });
          return { ...group, groupVolume: volume };
        }
        return group;
      })
    );
  };

  // Set the fade duration for an entire sound group
  const updateFadeDuration = (index, duration) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) =>
        idx === index ? { ...group, fadeDuration: duration } : group
      )
    );
  };

  // Update an individual sound's volume within a group
  const updateSoundVolume = (groupIndex, soundId, volume) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) => {
        if (idx === groupIndex) {
          const updatedSounds = group.sounds.map((sound) => {
            if (sound.id === soundId) {
              // Set Howl volume if the sound is playing
              if (sound.howl.playing()) {
                sound.howl.volume(volume * group.groupVolume); // Update the Howl volume here
              }
              return { ...sound, volume: volume };
            }
            return sound;
          });
          return { ...group, sounds: updatedSounds };
        }
        return group;
      })
    );
  };

  // Add a sound to a specified sound group
  const addSoundToGroup = (groupIndex, newSound) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) =>
        idx === groupIndex
          ? { ...group, sounds: [...group.sounds, newSound] }
          : group
      )
    );
  };

  // Remove a sound from a specified sound group
  const removeSoundFromGroup = (groupIndex, soundId) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) => {
        if (idx === groupIndex) {
          return {
            ...group,
            sounds: group.sounds.filter((sound) => sound.id !== soundId),
          };
        }
        return group;
      })
    );
  };

  // Function to play or pause a random sound from a group
  const togglePlayPauseFromGroup = (group) => {
    // Check if there is a currently playing sound, and if so, pause it
    if (currentlyPlaying[group.id]) {
      const playingSound = group.sounds.find(
        (sound) => sound.id === currentlyPlaying[group.id]
      );
      if (playingSound && playingSound.howl.playing()) {
        playingSound.howl.fade(
          playingSound.howl.volume(),
          0,
          group.fadeDuration
        );
        setTimeout(() => {
          playingSound.howl.pause();
        }, group.fadeDuration);
        // Remove the playing sound from the currently playing state
        setCurrentlyPlaying((current) => ({ ...current, [group.id]: null }));
        return; // We're done since we paused a playing sound
      }
    }

    // If no sound is currently playing, play a new random sound
    if (group.sounds.length === 0) return;

    // Get a random index to play
    const randomIndex = Math.floor(Math.random() * group.sounds.length);
    const soundToPlay = group.sounds[randomIndex];

    // Play the selected sound
    soundToPlay.howl.volume(0); // Start muted
    soundToPlay.howl.play(); // Play the sound
    soundToPlay.howl.fade(
      0,
      soundToPlay.volume * group.groupVolume * globalVolume,
      group.fadeDuration
    ); // Fade in

    // Update the currently playing state with the new playing sound
    setCurrentlyPlaying((current) => ({
      ...current,
      [group.id]: soundToPlay.id,
    }));
  };

  // Open the settings modal for a specific sound group
  const handleSettingsClick = (index) => {
    setSelectedGroupIndex(index); // Store the index of the selected group
  };

  const removeGroup = (groupId) => {
    // Find the group to be removed
    const groupToRemove = soundGroups.find((group) => group.id === groupId);

    if (groupToRemove) {
      // Stop all sounds in that group if they are playing
      groupToRemove.sounds.forEach((sound) => {
        if (sound.howl.playing()) {
          sound.howl.stop();
        }
      });

      // Remove the group from the state
      setSoundGroups(soundGroups.filter((group) => group.id !== groupId));
      setCurrentlyPlaying((current) => {
        const { [groupId]: _, ...rest } = current; // Omit the stopped group's state
        return rest;
      });
    }
  };

  return (
    <div className="soundboard">
      <div className="global-controls">
        <div>
          <label>Global Volume: {Math.round(globalVolume * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={globalVolume}
            onChange={(e) => updateAllGroupVolumes(Number(e.target.value))}
          />
        </div>
      </div>
      <button onClick={addSoundGroup}>Add Sound Group</button>

      <div className="sound-groups-grid">
        {soundGroups.map((group, index) => (
          <SoundGroupSquare
            key={group.id}
            group={group}
            onPlayPauseClick={() => togglePlayPauseFromGroup(group)}
            onSettingsClick={() => handleSettingsClick(index)}
            onRemoveGroup={() => removeGroup(group.id)}
          />
        ))}
      </div>

      <Modal
        isOpen={selectedGroupIndex !== null}
        onRequestClose={() => setSelectedGroupIndex(null)}
        contentLabel="Sound Group Controls"
        ariaHideApp={false}
      >
        {selectedGroupIndex !== null && soundGroups[selectedGroupIndex] && (
          <SoundGroup
            group={soundGroups[selectedGroupIndex]}
            onSoundsUpdate={(sounds) => {
              // Update sounds in a specific group
              const newSoundGroups = [...soundGroups];
              newSoundGroups[selectedGroupIndex].sounds = sounds;
              setSoundGroups(newSoundGroups);
            }}
            onGroupVolumeChange={(volume) => {
              updateGroupVolume(selectedGroupIndex, volume);
            }}
            onFadeDurationChange={(duration) => {
              updateFadeDuration(selectedGroupIndex, duration);
            }}
            onSoundVolumeChange={(soundId, volume) => {
              updateSoundVolume(selectedGroupIndex, soundId, volume);
            }}
            onAddSound={(newSound) => {
              addSoundToGroup(selectedGroupIndex, newSound);
            }}
            onRemoveSound={(soundId) => {
              removeSoundFromGroup(selectedGroupIndex, soundId);
            }}
            closeModal={() => setSelectedGroupIndex(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Soundboard;
