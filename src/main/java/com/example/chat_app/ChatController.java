package com.example.chat_app;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final Set<String> connectedUsers = ConcurrentHashMap.newKeySet();

    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.register")
    @SendTo("/topic/public")
    public ChatMessage register(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String username = chatMessage.getSender();
        connectedUsers.add(username);
        headerAccessor.getSessionAttributes().put("username", username);

        // Notify all users about new connection
        messagingTemplate.convertAndSend("/topic/users", connectedUsers);

        chatMessage.setContent(username + " joined the chat!");
        chatMessage.setType(ChatMessage.MessageType.JOIN);
        return chatMessage;
    }

    @MessageMapping("/chat.send")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        return chatMessage;
    }

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver(),
                "/queue/private",
                chatMessage
        );
    }

    @MessageMapping("/chat.leave")
    @SendTo("/topic/public")
    public ChatMessage leave(@Payload ChatMessage chatMessage) {
        String username = chatMessage.getSender();
        connectedUsers.remove(username);

        // Notify all users about disconnection
        messagingTemplate.convertAndSend("/topic/users", connectedUsers);

        chatMessage.setContent(username + " left the chat!");
        chatMessage.setType(ChatMessage.MessageType.LEAVE);
        return chatMessage;
    }
}