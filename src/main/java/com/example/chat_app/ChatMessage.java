package com.example.chat_app;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ChatMessage {
    private String sender;
    private String content;
    private String receiver;  // Add this field
    private MessageType type;
    private LocalDateTime timestamp = LocalDateTime.now();

    // Add getter and setter if not using Lombok
    // public String getReceiver() { return receiver; }
    // public void setReceiver(String receiver) { this.receiver = receiver; }

    public enum MessageType {
        CHAT, JOIN, LEAVE, PRIVATE
    }
}