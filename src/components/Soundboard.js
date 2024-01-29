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
import { storage } from "../firebaseConfig"; // Assuming storage is exported from firebaseConfig
import { ref, deleteObject } from "firebase/storage";
import Carousel from "./Carousel.js";

const Soundboard = () => {
  const [soundGroups, setSoundGroups] = useState([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState({});
  const [categories, setCategories] = useState(['Music', 'Sound Effects', 'Ambience']);

  const [globalVolume, setGlobalVolume] = useState(1); // Default global volume

  const { currentUser } = useAuth();
  // You can access user ID using currentUser.uid
  const userId = currentUser && currentUser.uid;

  // In Soundboard.js, adjusted useEffect for loading

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.uid;
      loadStateFromFirestore(userId)
        .then((loadedCategories) => {
          if (!loadedCategories) {
            console.log("No data returned from Firestore");
            return;
          }
        
          const newSoundGroups = [];
          const newCategories = [];
          
          // Convert loaded categories back to sound groups
          Object.entries(loadedCategories).forEach(([categoryName, soundGroups]) => {
            newCategories.push(categoryName);
            soundGroups.forEach(group => {
              newSoundGroups.push({
                ...group,
                category: categoryName,
                sounds: group.sounds.map(sound => ({
                  ...sound,
                  howl: new Howl({
                    src: [sound.url],
                    volume: sound.volume,
                  }),
                })),
              });
            });
          });
          
          setSoundGroups(newSoundGroups);
          setCategories(newCategories);
        })
        .catch((error) => {
          console.error("Error loading state from Firestore:", error);
        });
    }
  }, [currentUser]);

  // Save state when `soundGroups` or `globalVolume` changes
  useEffect(() => {
    if (userId && soundGroups.length > 0) {
      const groupedByCategory = groupByCategory(soundGroups);
      saveStateToFirestore(userId, groupedByCategory);
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
  const addSoundGroup = (category) => {
    // Create a new group with a unique ID and a default name
    const newGroup = {
      id: uuidv4(),
      name: `Group ${soundGroups.length + 1}`,
      sounds: [], // Initial sounds inside the group
      groupVolume: 1, // Default group volume
      fadeDuration: 1000, // Default fade duration
      category: category,
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
    const group = soundGroups[groupIndex];
    const sound = group.sounds.find((s) => s.id === soundId);
    if (sound) {
      const soundRef = ref(storage, sound.url); // sound.url should be the path to the file in storage
      deleteObject(soundRef)
        .then(() => {
          console.log(`File deleted successfully: ${sound.url}`);
        })
        .catch((error) => {
          console.error("Error removing file:", error);
        });
    }

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

  const renameSoundGroup = (groupIndex, newName) => {
    setSoundGroups((currentGroups) =>
      currentGroups.map((group, index) =>
        index === groupIndex ? { ...group, name: newName } : group
      )
    );
  };

  const removeGroup = (groupId) => {
    // Find the group to be removed
    const groupToRemove = soundGroups.find((group) => group.id === groupId);

    if (groupToRemove) {
      // Stop all sounds in that group if they are playing
      groupToRemove.sounds.forEach((sound) => {
        const soundRef = ref(storage, sound.url);
        deleteObject(soundRef)
          .then(() => console.log(`Deleted sound file: ${sound.url}`))
          .catch((error) => console.error("Error deleting sound file:", error));
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

  const groupByCategory = (groups) => {
    return groups.reduce((acc, group) => {
      if (!acc[group.category]) {
        acc[group.category] = [];
      }
      acc[group.category].push(group);
      return acc;
    }, {});
  };

  const handleCategorySelect = (category) => {
    // Implement logic to add a new sound group to the selected category
    addSoundGroup(category);
  };

  const handleAddCategory = (newCategoryName) => {
    // Add the new category to the list of categories if not already present
    if (!categories.includes(newCategoryName)) {
      setCategories([...categories, newCategoryName]);
    }
  };

  const handleRemoveCategory = (categoryToRemove) => {
    // Optional: Confirm with the user that they want to remove the category
    if (window.confirm(`Are you sure you want to remove the category "${categoryToRemove}" and all associated sound groups?`)) {
      // Remove the category from the categories array
      setCategories(categories.filter(category => category !== categoryToRemove));
      
      // Remove or handle sound groups associated with the removed category
      // For instance, removing all sound groups in this category:
      setSoundGroups(soundGroups.filter(group => group.category !== categoryToRemove));
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
      <Carousel
        categories={categories}
        onCategorySelect={handleCategorySelect}
        onAddCategory={handleAddCategory}
        onRemoveCategory={handleRemoveCategory}
      />

      {Object.entries(groupByCategory(soundGroups)).map(([category, groupsInCategory]) => (
      <div key={category}>
        <h2>{category}</h2> {/* Display the category name */}
        <div className="sound-groups-row" style={{ marginBottom: '20px' }}> {/* Adjust styles as needed */}
          {groupsInCategory.map((group, index) => (
            <SoundGroupSquare
              key={group.id}
              group={group}
              onPlayPauseClick={() => togglePlayPauseFromGroup(group)}
              onSettingsClick={() => handleSettingsClick(index)}
              onRenameGroup={(newName) => renameSoundGroup(index, newName)}
              onRemoveGroup={() => removeGroup(group.id)}
            />
          ))}
        </div>
      </div>
    ))}

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
