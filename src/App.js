import logo from './logo.svg';
import './App.css';
import Soundboard from './components/Soundboard';
import SignIn from './state/SignIn';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>D&D Soundboard</h1>
        <SignIn/>
      </header>
      <main className='App-content'>
        <Soundboard/>
      </main>
      <footer className='App-footer'>
        <p>Created by Ziggy Badans</p>
      </footer>
    </div>
  );
}

export default App;
