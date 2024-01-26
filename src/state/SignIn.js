import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from '../firebaseConfig';
import { useAuth } from "../utils/AuthContext.js";

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSignIn, setIsSignIn] = useState(true); // Toggle between SignIn and SignUp

  const { currentUser } = useAuth();
  // You can access user ID using currentUser.uid
  const userId = currentUser ? currentUser.uid : null;

  const handleAuth = async () => {
    try {
      const userCredential = isSignIn
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('User authenticated:', userCredential.user);
      setFeedback(isSignIn ? 'Signed in successfully!' : 'Account created successfully!');
    } catch (err) {
      console.error('Error authenticating user:', err);
      setFeedback(err.message);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
      setFeedback('Signed out successfully!');
    } catch (error) {
      console.error('Error signing out:', error);
      setFeedback(error.message);
    }
  };

  const toggleForm = () => {
    setIsSignIn(!isSignIn);
    setFeedback('');
  };

  return (
    <div>
      <h2>{isSignIn ? 'Sign In' : 'Register'}</h2>
      <input 
        type="email" 
        placeholder="Email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
      />
      <button onClick={handleAuth}>{isSignIn ? 'Sign In' : 'Register'}</button>

      {feedback && <p>{feedback}</p>}

      <button onClick={toggleForm}>
        {isSignIn ? 'Need to register?' : 'Already have an account?'}
      </button>

      {currentUser && (
        <button onClick={handleLogout}>Logout</button>
      )}
    </div>
  );
}

export default SignIn;