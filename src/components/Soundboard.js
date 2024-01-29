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
  saveSceneToFirestore,
  loadScenesFromFirestore,
  loadSceneByIdFromFirestore,
} from "../state/StateRestoration";
import { useAuth } from "../utils/AuthContext";
import { storage } from "../firebaseConfig"; // Assuming storage is exported from firebaseConfig
import { ref, deleteObject } from "firebase/storage";
import Carousel from "./Carousel.js";
import { initializeSounds } from "../state/Sounds.js";

const Soundboard = () => {
  const [soundGroups, setSoundGroups] = useState([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState({});

  const [categories, setCategories] = useState([
    "Music",
    "Sound Effects",
    "Ambience",
  ]);

  const [scenes, setScenes] = useState({});
  const [currentScene, setCurrentScene] = useState(null);

  const [globalVolume, setGlobalVolume] = useState(1);

  const { currentUser } = useAuth();
  const userId = currentUser && currentUser.uid;


  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.uid;
      loadScenesFromFirestore(userId).then((loadedScenes) => {
        if (!loadedScenes || Object.keys(loadedScenes).length === 0) {
          // No scenes loaded from Firestore, so create the default one
          const newDefaultScene = defaultSceneData();
          sceneToState(newDefaultScene);
          setCurrentScene('defaultScene');
          saveSceneToFirestore(userId, 'defaultScene', newDefaultScene).then(() => {
            setScenes({ 'defaultScene': newDefaultScene });
            console.log('Default scene created and saved to Firestore.');
          });
        } else {
          // Scenes loaded, including possibly the Default one
          setScenes(loadedScenes);
          if (loadedScenes['defaultScene']) {
            // If there is a default scene, load it
            sceneToState(loadedScenes['defaultScene']);
            setCurrentScene('defaultScene');
          } else {
            // If no default scene is found amongst the loaded scenes
            const newDefaultScene = defaultSceneData();
            sceneToState(newDefaultScene);
            setCurrentScene('defaultScene');
            saveSceneToFirestore(userId, 'defaultScene', newDefaultScene).then(() => {
              setScenes({ ...loadedScenes, 'defaultScene': newDefaultScene });
              console.log('Default scene created and added to the sidebar.');
            });
          }
        }
      }).catch((error) => {
        console.error("Error loading scenes from Firestore:", error);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (userId && soundGroups.length > 0) {
      const groupedByCategory = groupByCategory(soundGroups);
      saveStateToFirestore(userId, groupedByCategory);
    }
  }, [soundGroups]);

  const stateToScene = () => {
    const scene = {
      soundGroups: soundGroups.map((group) => ({
        id: group.id,
        name: group.name,
        sounds: group.sounds.map((sound) => ({
          id: sound.id,
          url: sound.url,
          volume: sound.volume,
        })),
        groupVolume: group.groupVolume,
        fadeDuration: group.fadeDuration,
        category: group.category,
      })),
      categories: categories,
      globalVolume: globalVolume,
    };
    return scene;
  };

  const sceneToState = (scene) => {
    const newSoundGroups = scene.soundGroups.map((group) => ({
      ...group,
      sounds: group.sounds.map((sound) => ({
        ...sound,
        howl: new Howl({
          src: [sound.url],
          volume: sound.volume,
        }),
      })),
    }));

    for (const group of newSoundGroups) {
      for (const sound of group.sounds) {
        const originalSound = scene.soundGroups
          .find((ogGroup) => ogGroup.id === group.id)
          .sounds.find((ogSound) => ogSound.id === sound.id);
        if (originalSound) {
          sound.name = originalSound.name;
        }
      }
    }

    setSoundGroups(newSoundGroups);
    setCategories(scene.categories);
    setGlobalVolume(scene.globalVolume);
  };

  const createNewScene = async () => {
    const sceneId = uuidv4();
    const newScene = stateToScene();
    setScenes({ ...scenes, [sceneId]: newScene });
    await saveSceneToFirestore(currentUser.uid, sceneId, newScene);
  };

  const updateScene = async () => {
    if (currentScene) {
      const updatedScene = stateToScene();
      setScenes({ ...scenes, [currentScene]: updatedScene });
      // Call saveSceneToFirestore to persist the updated scene in Firestore
      await saveSceneToFirestore(currentUser.uid, currentScene, updatedScene);
      console.log(`Scene ${currentScene} updated successfully`);
    }
  };

  const loadScene = (sceneId) => {
    const sceneState = scenes[sceneId];
    if (sceneState) {
      sceneToState(sceneState);
      setCurrentScene(sceneId);
    }
  };

  const loadAllScenes = () => {
    loadScenesFromFirestore(currentUser.uid)
      .then((loadedScenes) => {
        setScenes(loadedScenes);
      })
      .catch((error) => {
        console.error("Error loading scenes:", error);
      });
  };

  const updateAllGroupVolumes = (volume) => {
    setGlobalVolume(volume);

    setSoundGroups((prevGroups) =>
      prevGroups.map((group) => {
        group.sounds.forEach((sound) => {
          if (sound.howl.playing()) {
            sound.howl.volume(sound.volume * group.groupVolume * volume);
          }
        });
        return group;
      })
    );
  };

  const addSoundGroup = (category) => {
    const newGroup = {
      id: uuidv4(),
      name: `Group ${soundGroups.length + 1}`,
      sounds: [],
      groupVolume: 1,
      fadeDuration: 1000,
      category: category,
    };
    setSoundGroups([...soundGroups, newGroup]);
  };

  const updateGroupVolume = (groupIndex, volume) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) => {
        if (idx === groupIndex) {
          group.sounds.forEach((sound) => {
            if (sound.howl.playing()) {
              sound.howl.volume(sound.volume * volume);
            }
          });
          return { ...group, groupVolume: volume };
        }
        return group;
      })
    );
  };

  const updateFadeDuration = (index, duration) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) =>
        idx === index ? { ...group, fadeDuration: duration } : group
      )
    );
  };

  const updateSoundVolume = (groupIndex, soundId, volume) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) => {
        if (idx === groupIndex) {
          const updatedSounds = group.sounds.map((sound) => {
            if (sound.id === soundId) {
              if (sound.howl.playing()) {
                sound.howl.volume(volume * group.groupVolume);
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

  const addSoundToGroup = (groupIndex, newSound) => {
    setSoundGroups((prevGroups) =>
      prevGroups.map((group, idx) =>
        idx === groupIndex
          ? { ...group, sounds: [...group.sounds, newSound] }
          : group
      )
    );
  };

  const removeSoundFromGroup = (groupIndex, soundId) => {
    const group = soundGroups[groupIndex];
    const sound = group.sounds.find((s) => s.id === soundId);
    if (sound) {
      const soundRef = ref(storage, sound.url);
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

  const togglePlayPauseFromGroup = (group) => {
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
        setCurrentlyPlaying((current) => ({ ...current, [group.id]: null }));
      }
    }

    if (group.sounds.length === 0) return;

    const randomIndex = Math.floor(Math.random() * group.sounds.length);
    const soundToPlay = group.sounds[randomIndex];

    soundToPlay.howl.volume(0);
    soundToPlay.howl.play();
    soundToPlay.howl.fade(
      0,
      soundToPlay.volume * group.groupVolume * globalVolume,
      group.fadeDuration
    );

    setCurrentlyPlaying((current) => ({
      ...current,
      [group.id]: soundToPlay.id,
    }));
  };

  const handleSettingsClick = (groupId) => {
    const groupIndex = soundGroups.findIndex((group) => group.id === groupId);
    setSelectedGroupIndex(groupIndex);
  };

  const renameSoundGroup = (groupId, newName) => {
    setSoundGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, name: newName } : group
      )
    );
  };

  const removeGroup = (groupId) => {
    const groupToRemove = soundGroups.find((group) => group.id === groupId);

    if (groupToRemove) {
      groupToRemove.sounds.forEach((sound) => {
        const soundRef = ref(storage, sound.url);
        deleteObject(soundRef)
          .then(() => console.log(`Deleted sound file: ${sound.url}`))
          .catch((error) => console.error("Error deleting sound file:", error));
        if (sound.howl.playing()) {
          sound.howl.stop();
        }
      });

      setSoundGroups(soundGroups.filter((group) => group.id !== groupId));
      setCurrentlyPlaying((current) => {
        const { [groupId]: _, ...rest } = current;
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
    addSoundGroup(category);
  };

  const handleAddCategory = (newCategoryName) => {
    if (!categories.includes(newCategoryName)) {
      setCategories([...categories, newCategoryName]);
    }
  };

  const handleRemoveCategory = (categoryToRemove) => {
    if (
      window.confirm(
        `Are you sure you want to remove the category "${categoryToRemove}" and all associated sound groups?`
      )
    ) {
      setCategories(
        categories.filter((category) => category !== categoryToRemove)
      );
      setSoundGroups(
        soundGroups.filter((group) => group.category !== categoryToRemove)
      );
    }
  };

  const defaultSceneData = () => ({
    soundGroups: [
      // Add default sound groups with properties such as id, name, sounds, groupVolume, fadeDuration, and the category they belong to.
      // Since we don't have actual sound data, we'll use placeholders here.
      {
        id: uuidv4(),
        name: "Default Music Group",
        sounds: [], // Add default sounds here
        groupVolume: 1,
        fadeDuration: 1000,
        category: "Music",
      },
      {
        id: uuidv4(),
        name: "Default SFX Group",
        sounds: [], // Add default sounds here
        groupVolume: 1,
        fadeDuration: 1000,
        category: "Sound Effects",
      },
      {
        id: uuidv4(),
        name: "Default Ambience Group",
        sounds: [], // Add default sounds here
        groupVolume: 1,
        fadeDuration: 1000,
        category: "Ambience",
      },
    ],
    categories: ["Music", "Sound Effects", "Ambience"],
    globalVolume: 1,
  });

  return (
    <div className="main">
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

        <div className="category-container">
          <Carousel
            categories={categories}
            onCategorySelect={handleCategorySelect}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
          />
        </div>

        <div className="sound-groups-panel">
          {Object.entries(groupByCategory(soundGroups)).map(
            ([category, groupsInCategory]) => (
              <div key={category} className="sound-group">
                <h2 className="sound-group-title">{category}</h2>
                <div className="sound-group-grid">
                  {groupsInCategory.map((group, index) => (
                    <SoundGroupSquare
                      key={group.id}
                      group={group}
                      onPlayPauseClick={() => togglePlayPauseFromGroup(group)}
                      onSettingsClick={() => handleSettingsClick(group.id)}
                      onRenameGroup={(newName) =>
                        renameSoundGroup(group.id, newName)
                      }
                      onRemoveGroup={() => removeGroup(group.id)}
                    />
                  ))}
                </div>
              </div>
            )
          )}
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
      </div>
      <div className="scene-sidebar">
        <div className="scene-management">
          <h3>Scenes</h3>
          <div>
            <button onClick={createNewScene}>New Scene</button>
            <button onClick={updateScene} disabled={!currentScene}>
              Save Scene
            </button>
          </div>
        </div>

        <div className="scenes">
          {Object.keys(scenes).map((sceneId) => (
            <button
              key={sceneId}
              className={
                currentScene === sceneId
                  ? "scene-button active"
                  : "scene-button"
              }
              disabled={currentScene === sceneId}
              onClick={() => loadScene(sceneId)}
            >
              Scene {sceneId.slice(0, 8)}{" "}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Soundboard;