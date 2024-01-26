import React from 'react';
import "./SoundGroupSquare.css"

const SoundGroupSquare = ({ group, onSettingsClick, onPlayPauseClick, onRemoveGroup }) => {
  return (
    <div className="sound-group-square">
      <div className="sound-group-square-title">{group.name}</div>
      <button onClick={() => onPlayPauseClick(group)}>Play/Pause</button>
      <button onClick={() => onSettingsClick(group)}>Settings</button>
      <button onClick={() => onRemoveGroup(group.id)}>Remove Group</button>
      {/* Other group details */}
    </div>
  );
};

export default SoundGroupSquare;