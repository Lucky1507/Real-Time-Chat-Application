import React from 'react';
import Chat from './components/Chat';
import './App.css';

function App() {
  return (
    <div className="App" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Spring Boot + React Chat</h1>
      <Chat />
    </div>
  );
}

export default App;