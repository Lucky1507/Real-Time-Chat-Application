import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './Chat.css';

const Chat = () => {
    // State management
    const [messages, setMessages] = useState([]); // Stores public chat messages
    const [privateMessages, setPrivateMessages] = useState([]); // Stores private messages
    const [input, setInput] = useState(""); // Current message input
    const [username, setUsername] = useState(""); // Current user's username
    const [isConnected, setIsConnected] = useState(false); // WebSocket connection status
    const [activeChat, setActiveChat] = useState("public"); // Current chat (public or private)
    const [usersOnline, setUsersOnline] = useState([]); // List of online users
    const stompClient = useRef(null); // Reference to STOMP client

    // WebSocket connection and subscription management
    useEffect(() => {
        if (!username) return; // Don't connect without username

        // Initialize SockJS connection
        const socket = new SockJS('https://ink-encounter-fails-www.trycloudflare.comgt/ws');

        // Configure STOMP client
        stompClient.current = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log('[STOMP DEBUG]', str), // Enhanced debugging
            reconnectDelay: 5000, // Reconnect after 5 seconds if disconnected
            heartbeatIncoming: 4000, // Heartbeat settings for connection stability
            heartbeatOutgoing: 4000,

            // Connection established callback
            onConnect: () => {
                console.log('Successfully connected to WebSocket');
                setIsConnected(true);

                // Register user with the server
                stompClient.current.publish({
                    destination: '/app/chat.register',
                    body: JSON.stringify({
                        sender: username,
                        type: 'JOIN',
                        timestamp: new Date().toISOString()
                    })
                });

                // Subscribe to public messages channel
                stompClient.current.subscribe('/topic/public', (message) => {
                    const newMessage = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMessage]);
                });

                // Subscribe to private messages queue
                stompClient.current.subscribe('/user/queue/private', (message) => {
                    const newMessage = JSON.parse(message.body);
                    setPrivateMessages(prev => [...prev, newMessage]);
                });

                // Subscribe to online users updates
                stompClient.current.subscribe('/topic/users', (message) => {
                    const onlineUsers = JSON.parse(message.body);
                    setUsersOnline(onlineUsers);
                    console.log('Online users updated:', onlineUsers);
                });
            },

            // Connection lost callback
            onDisconnect: () => {
                console.log('WebSocket connection lost');
                setIsConnected(false);

                // Notify server about user leaving (if possible)
                if (username && stompClient.current) {
                    try {
                        stompClient.current.publish({
                            destination: '/app/chat.leave',
                            body: JSON.stringify({
                                sender: username,
                                type: 'LEAVE',
                                timestamp: new Date().toISOString()
                            })
                        });
                    } catch (e) {
                        console.error('Failed to send leave message:', e);
                    }
                }
            },

            // STOMP protocol errors
            onStompError: (error) => {
                console.error('STOMP protocol error:', error);
                setIsConnected(false);
            }
        });

        // Handle underlying WebSocket errors
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
        };

        // Activate the STOMP client
        stompClient.current.activate();

        // Cleanup function for component unmount
        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [username]); // Re-run effect when username changes

    // Handle user login
    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            // Connection will be established in useEffect
            console.log('User logging in:', username);
        }
    };

    // Send chat message
    const sendMessage = () => {
        if (!isConnected || !input.trim()) {
            console.warn('Cannot send message - not connected or empty input');
            return;
        }

        try {
            const message = {
                sender: username,
                content: input,
                type: activeChat === 'public' ? 'CHAT' : 'PRIVATE',
                receiver: activeChat === 'public' ? null : activeChat,
                timestamp: new Date().toISOString()
            };

            const destination = activeChat === 'public'
                ? '/app/chat.send'
                : '/app/chat.private';

            stompClient.current.publish({
                destination,
                body: JSON.stringify(message)
            });

            setInput(""); // Clear input field after sending
            console.log('Message sent:', message);
        } catch (error) {
            console.error('Error sending message:', error);
            setIsConnected(false);
        }
    };

    // Handle user logout
    const handleLogout = () => {
        console.log('User logging out:', username);
        if (stompClient.current) {
            stompClient.current.deactivate();
        }
        setUsername("");
        setIsConnected(false);
        setMessages([]);
        setPrivateMessages([]);
    };

    // Handle pressing Enter key to send message
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Filter messages for the current chat
    const getFilteredMessages = () => {
        if (activeChat === 'public') {
            return messages;
        }
        return privateMessages.filter(msg =>
            msg.sender === activeChat || msg.receiver === activeChat
        );
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
                            autoFocus
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
                            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                {isConnected ? 'Online' : 'Offline'}
                            </div>
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
                            <h3>
                                {activeChat === 'public'
                                    ? 'Public Chat'
                                    : `Private Chat with ${activeChat}`}
                            </h3>
                        </div>
                        <div className="messages">
                            {getFilteredMessages().map((msg, i) => (
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
                                onKeyPress={handleKeyPress}
                                disabled={!isConnected}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!isConnected || !input.trim()}
                            >
                                {isConnected ? 'Send' : 'Connecting...'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;