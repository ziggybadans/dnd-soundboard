// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Imagine adding a new value to context to signal a load state action - for demonstration purposes
  const [shouldLoadState, setShouldLoadState] = useState(false);

  useEffect(() => {
    if (currentUser && !loading) {
      // Use this flag to indicate the state should be loaded now
      setShouldLoadState(true);
    }
  }, [currentUser, loading]);

  // Reset the flag after it's been used
  const resetShouldLoadState = () => setShouldLoadState(false);

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, shouldLoadState, resetShouldLoadState }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
