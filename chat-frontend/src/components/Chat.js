import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './Chat.css';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState([]);
    const [input, setInput] = useState("");
    const [username, setUsername] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [activeChat, setActiveChat] = useState("public");
    const [usersOnline, setUsersOnline] = useState([]);
    const stompClient = useRef(null);

    useEffect(() => {
        if (!username) return;

        const socket = new SockJS('http://localhost:8080/ws');
        stompClient.current = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            onConnect: () => {
                setIsConnected(true);

                // Register user
                stompClient.current.publish({
                    destination: '/app/chat.register',
                    body: JSON.stringify({ sender: username, type: 'JOIN' })
                });

                // Subscribe to public messages
                stompClient.current.subscribe('/topic/public', (message) => {
                    const newMessage = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMessage]);
                });

                // Subscribe to private messages
                stompClient.current.subscribe(`/user/queue/private`, (message) => {
                    const newMessage = JSON.parse(message.body);
                    setPrivateMessages(prev => [...prev, newMessage]);
                });

                // Subscribe to online users updates
                stompClient.current.subscribe('/topic/users', (message) => {
                    setUsersOnline(JSON.parse(message.body));
                });
            },
            onDisconnect: () => {
                if (username) {
                    stompClient.current.publish({
                        destination: '/app/chat.leave',
                        body: JSON.stringify({ sender: username, type: 'LEAVE' })
                    });
                }
                setIsConnected(false);
            }
        });

        stompClient.current.activate();

        // Cleanup on component unmount
        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [username]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            setIsConnected(true);
        }
    };

    const sendMessage = () => {
        if (!isConnected || !input.trim()) return;

        const message = {
            sender: username,
            content: input,
            type: activeChat === 'public' ? 'CHAT' : 'PRIVATE',
            receiver: activeChat === 'public' ? null : activeChat
        };

        const destination = activeChat === 'public'
            ? '/app/chat.send'
            : '/app/chat.private';

        stompClient.current.publish({
            destination,
            body: JSON.stringify(message)
        });
        setInput("");
    };

    const handleLogout = () => {
        if (stompClient.current) {
            stompClient.current.deactivate();
        }
        setUsername("");
        setIsConnected(false);
        setMessages([]);
        setPrivateMessages([]);
    };

    return (
        <div className="chat-container">
            {!username ? (
                <div className="login-form">
                    <h2>Welcome to Real-Time Chat</h2>
                    <form onSubmit={handleLogin}>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <button type="submit">Join Chat</button>
                    </form>
                </div>
            ) : (
                <div className="chat-app">
                    <div className="sidebar">
                        <div className="user-info">
                            <span>Hello, {username}!</span>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                        <div className="online-users">
                            <h3>Online Users ({usersOnline.length})</h3>
                            <div
                                className={`user ${activeChat === 'public' ? 'active' : ''}`}
                                onClick={() => setActiveChat('public')}
                            >
                                Public Chat
                            </div>
                            {usersOnline
                                .filter(user => user !== username)
                                .map(user => (
                                    <div
                                        key={user}
                                        className={`user ${activeChat === user ? 'active' : ''}`}
                                        onClick={() => setActiveChat(user)}
                                    >
                                        {user}
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="chat-area">
                        <div className="chat-header">
                            <h3>{activeChat === 'public' ? 'Public Chat' : `Private Chat with ${activeChat}`}</h3>
                        </div>
                        <div className="messages">
                            {(activeChat === 'public' ? messages : privateMessages
                                .filter(msg =>
                                    activeChat === 'public' ||
                                    msg.sender === activeChat ||
                                    msg.receiver === activeChat))
                                .map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`message ${msg.sender === username ? 'sent' : 'received'}`}
                                    >
                                        <div className="message-sender">{msg.sender}</div>
                                        <div className="message-content">{msg.content}</div>
                                        <div className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                        </div>
                        <div className="message-input">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={`Message ${activeChat === 'public' ? 'everyone' : activeChat}`}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage} disabled={!isConnected}>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;