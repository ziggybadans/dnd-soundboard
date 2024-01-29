import React, { useState } from "react";
import "./Carousel.css";
import { FiX } from "react-icons/fi";

const Carousel = ({
  categories,
  onCategorySelect,
  onAddCategory,
  onRemoveCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleNewCategorySubmit = () => {
    if (newCategoryName.trim() !== "") {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName(""); // Reset input after submission
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleNewCategorySubmit();
    }
  };

  return (
    <div className="carousel-container">
      {categories.map((category) => (
        <div key={category} className="carousel-item">
          <span onClick={() => onCategorySelect(category)} className="category-name">Add {category}</span>
          <span
            className="remove-category"
            onClick={() => onRemoveCategory(category)}
            title="Remove category"
          >
            <FiX />
          </span>
        </div>
      ))}
      <div className="carousel-item add-category">
        <input
          type="text"
          placeholder="New Category"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleNewCategorySubmit}>Add</button>
      </div>
    </div>
  );
};

export default Carousel;
