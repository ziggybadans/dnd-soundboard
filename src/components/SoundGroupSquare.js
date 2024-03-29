import React, { useState } from "react";
import "./SoundGroupSquare.css";
import { FiTool, FiPlay, FiTrash2, FiTag } from "react-icons/fi"

const SoundGroupSquare = ({
  group,
  onSettingsClick,
  onPlayPauseClick,
  onRenameGroup,
  onRemoveGroup,
}) => {
  // State to manage edit mode
  const [isEditing, setIsEditing] = useState(false);
  // State to hold the temporary new group name
  const [newName, setNewName] = useState(group.name);

  const handleRename = () => {
    if (newName.trim() && newName !== group.name) {
      onRenameGroup(newName.trim());
      setIsEditing(false); // Exit editing mode
    }
  };

  return (
    <div>
      {isEditing ? (
        <div className="sound-group-square">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              // Save on enter key
              if (e.key === "Enter") {
                handleRename();
              }
            }}
            onBlur={handleRename} // Also save when input loses focus
          />
          <button
            className="rename-group-button"
            onClick={handleRename}
          >
            Confirm Rename
          </button>
        </div>
      ) : (
        <div className="sound-group-square">
          <div
            className="sound-group-square-title"
            onDoubleClick={() => setIsEditing(true)}
          >
            {group.name}
          </div>
          <button
            className="play-pause-button"
            onClick={() => onPlayPauseClick(group)}
          >
            <FiPlay size={25}/>
          </button>
          <button
            className="settings-button"
            onClick={() => onSettingsClick(group)}
          >
            <FiTool size={25}/>
          </button>
          <button
            className="remove-group-button"
            onClick={() => onRemoveGroup(group.id)}
          >
            <FiTrash2 size={25}/>
          </button>
          <button
            className="rename-group-button"
            onClick={() => setIsEditing(true)}
          >
            <FiTag size={25}/>
          </button>
        </div>
      )}
      </div>
  );
};

export default SoundGroupSquare;
