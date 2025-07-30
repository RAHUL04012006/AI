/**
 * Main Chat Application JavaScript
 * Handles UI interactions and coordinates with Puter.js integration
 */

class ChatApp {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.currentStreamingDiv = null;
        this.generatedImages = [];
        this.chatHistory = [];
        this.messageCount = 0;
        this.fileCount = 0;
        this.imageCount = 0;
        
        this.init();
    }
    
    updateAuthStatus() {
        const authStatus = document.getElementById('auth-status');
        const authBtn = document.getElementById('auth-btn');
        
        if (puterIntegration.getAuthStatus()) {
            authStatus.textContent = '● Authenticated';
            authStatus.className = 'text-xs text-green-400';
            authBtn.classList.add('hidden');
        } else {
            authStatus.textContent = '● Sign In Required';
            authStatus.className = 'text-xs text-red-400';
            authBtn.classList.remove('hidden');
        }
    }
    
    init() {
        this.setupEventListeners();
        this.setupFileHandling();
        this.setupModelSelector();
        this.setupAutoResize();
        this.setupMobileMenu();
        
        // Update authentication status
        setTimeout(() => {
            this.updateAuthStatus();
        }, 1000);
        
        console.log('✅ Chat App initialized');
    }
    
    setupEventListeners() {
        // Send message
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        

        
        // Authentication button
        document.getElementById('auth-btn').addEventListener('click', async () => {
            try {
                await puterIntegration.authenticate();
                this.updateAuthStatus();
            } catch (error) {
                console.error('Authentication failed:', error);
            }
        });
        
        // Image generation
        document.getElementById('generate-image-btn').addEventListener('click', () => {
            this.generateImage();
        });
        
        // Image gallery
        document.getElementById('close-gallery-btn').addEventListener('click', () => {
            document.getElementById('image-gallery-modal').classList.add('hidden');
        });
    }
    
    setupAutoResize() {
        const textarea = document.getElementById('message-input');
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 128) + 'px';
        });
    }
    
    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-open');
            sidebarOverlay.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('sidebar-open');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    setupFileHandling() {
        const dropZone = document.getElementById('file-drop-zone');
        const fileInput = document.getElementById('file-input');
        
        // Click to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
    }
    
    setupModelSelector() {
        const modelSelector = document.getElementById('model-selector');
        
        modelSelector.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            this.switchModel(selectedModel);
        });
        
        // Initialize with default model
        this.switchModel('claude-sonnet-4');
    }
    
    switchModel(modelName) {
        puterIntegration.setCurrentModel(modelName);
        
        const config = puterIntegration.getModelConfig(modelName);
        
        // Update UI
        document.getElementById('current-model').textContent = this.getModelDisplayName(modelName);
        document.getElementById('model-provider').textContent = config.provider;
        document.getElementById('model-capabilities').textContent = config.capabilities;
        
        // Add system message about model switch
        this.addMessage({
            type: 'system',
            content: `Switched to ${this.getModelDisplayName(modelName)} (${config.provider})`,
            timestamp: new Date().toISOString()
        });
    }
    
    getModelDisplayName(modelName) {
        const displayNames = {
            'gpt-4o': 'GPT-4o',
            'gpt-4.1': 'GPT-4.1',
            'o1': 'o1',
            'o3-mini': 'o3-mini',
            'claude-sonnet-4': 'Claude Sonnet 4',
            'deepseek-chat': 'DeepSeek Chat V3',
            'deepseek-reasoner': 'DeepSeek Reasoner R1'
        };
        
        return displayNames[modelName] || modelName;
    }
    
    async handleFiles(files) {
        const dropContent = document.getElementById('drop-content');
        const uploadProgress = document.getElementById('upload-progress');
        const uploadedFilesContainer = document.getElementById('uploaded-files');
        
        // Show progress
        dropContent.classList.add('hidden');
        uploadProgress.classList.remove('hidden');
        
        try {
            for (const file of files) {
                console.log(`Processing file: ${file.name}`);
                
                const fileInfo = await puterIntegration.uploadFile(file);
                
                // Create file preview
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-item file-preview';
                
                const isImage = file.type.startsWith('image/');
                
                fileDiv.innerHTML = `
                    <div class="flex items-center space-x-2 flex-1">
                        <i class="fas ${isImage ? 'fa-image' : 'fa-file-alt'} text-chat-turquoise"></i>
                        <div class="flex-1 min-w-0">
                            <p class="text-white text-sm truncate">${file.name}</p>
                            <p class="text-gray-400 text-xs">${this.formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${isImage ? '<button class="analyze-btn text-purple-400 hover:text-purple-300 text-xs"><i class="fas fa-eye"></i></button>' : ''}
                        <button class="remove-btn text-red-400 hover:text-red-300 text-xs"><i class="fas fa-times"></i></button>
                    </div>
                `;
                
                // Add event listeners
                const removeBtn = fileDiv.querySelector('.remove-btn');
                removeBtn.addEventListener('click', () => {
                    fileDiv.remove();
                    // Remove from uploaded files array
                    const index = puterIntegration.uploadedFiles.findIndex(f => f.name === file.name);
                    if (index > -1) {
                        puterIntegration.uploadedFiles.splice(index, 1);
                        this.fileCount = Math.max(0, this.fileCount - 1);
                        this.updateStats();
                    }
                });
                
                if (isImage) {
                    const analyzeBtn = fileDiv.querySelector('.analyze-btn');
                    analyzeBtn.addEventListener('click', () => {
                        this.analyzeImage(fileInfo);
                    });
                }
                
                uploadedFilesContainer.appendChild(fileDiv);
                this.fileCount++;
            }
            
            this.updateStats();
            this.addMessage({
                type: 'system',
                content: `✅ Uploaded ${files.length} file(s) successfully`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('File upload error:', error);
            this.showError(`Failed to upload files: ${error.message}`);
        } finally {
            // Hide progress
            dropContent.classList.remove('hidden');
            uploadProgress.classList.add('hidden');
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async analyzeImage(fileInfo) {
        try {
            this.showLoading('Analyzing image...');
            
            const analysis = await puterIntegration.analyzeImage(fileInfo.data);
            
            this.addMessage({
                type: 'ai',
                content: `**Image Analysis for "${fileInfo.name}":**\n\n${analysis}`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Image analysis error:', error);
            this.showError(`Failed to analyze image: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message || this.isProcessing) return;
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Add user message
        const userMessage = {
            type: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        this.addMessage(userMessage);
        this.addToChatHistory(userMessage);
        
        // Get uploaded files
        const attachments = puterIntegration.getUploadedFiles();
        
        try {
            this.isProcessing = true;
            this.showTyping();
            this.updateSendButton(false);
            
            // Include chat history in the request for context
            const response = await puterIntegration.sendMessage(message, attachments, this.chatHistory);
            
            if (response.type === 'stream') {
                await this.handleStreamingResponse(response.stream);
            } else {
                const aiMessage = {
                    type: 'ai',
                    content: response.content,
                    timestamp: new Date().toISOString()
                };
                this.addMessage(aiMessage);
                this.addToChatHistory(aiMessage);
            }
            
        } catch (error) {
            console.error('Send message error:', error);
            
            // Handle different error types
            if (error.message.includes('Usage limit reached') || error.message.includes('Permission denied')) {
                this.addMessage({
                    type: 'system',
                    content: `⚠️ Usage Limit Reached: The free tier of Puter.js has usage limitations.

Possible solutions:
• Wait a few minutes and try again
• Visit https://puter.com to upgrade your account for more usage
• Try switching to a different AI model in the sidebar
• Use shorter messages to conserve usage

This is a limitation of the free AI service, not the website itself.`,
                    timestamp: new Date().toISOString()
                });
            } else if (error.message.includes('sign in') || error.message.includes('authentication')) {
                this.addMessage({
                    type: 'system',
                    content: `🔐 Authentication Required: Please sign in to Puter.js to use AI models. 

If you see a popup window, please complete the sign-in process. If no popup appears, your browser might be blocking popups - please allow popups for this site and try again.

You can also visit https://puter.com to create a free account first, then refresh this page.`,
                    timestamp: new Date().toISOString()
                });
            } else {
                this.showError(`Failed to send message: ${error.message}`);
            }
        } finally {
            this.isProcessing = false;
            this.hideTyping();
            this.updateSendButton(true);
        }
    }
    
    async handleStreamingResponse(stream) {
        // Create AI message container
        const messageId = 'msg-' + Date.now();
        this.addMessage({
            type: 'ai',
            content: '',
            timestamp: new Date().toISOString(),
            id: messageId
        });
        
        const messageDiv = document.getElementById(messageId);
        const contentDiv = messageDiv.querySelector('.message-content');
        
        let fullResponse = '';
        
        try {
            for await (const part of stream) {
                if (part?.text) {
                    fullResponse += part.text;
                    contentDiv.innerHTML = this.formatMessage(fullResponse);
                    this.scrollToBottom();
                }
            }
            
            puterIntegration.lastResponse = fullResponse;
            
            // Save complete AI response to chat history
            const aiMessage = {
                type: 'ai',
                content: fullResponse,
                timestamp: new Date().toISOString()
            };
            this.addToChatHistory(aiMessage);
            
        } catch (error) {
            console.error('Streaming error:', error);
            contentDiv.innerHTML = this.formatMessage('❌ Error receiving response: ' + error.message);
        }
    }
    
    addMessage(message) {
        this.messages.push(message);
        
        const messagesContainer = document.getElementById('messages-container');
        
        // Create message wrapper
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'w-full';
        
        // Create message content
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-enter flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`;
        if (message.id) {
            messageDiv.id = message.id;
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = `max-w-3xl px-4 py-3 rounded-lg ${this.getMessageClasses(message.type)}`;
        
        // Add message header for AI and system messages
        if (message.type !== 'user') {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'flex items-center space-x-2 mb-2';
            
            const icon = message.type === 'ai' ? 'fa-robot' : 'fa-info-circle';
            const color = message.type === 'ai' ? 'text-chat-turquoise' : 'text-yellow-400';
            
            headerDiv.innerHTML = `
                <i class="fas ${icon} ${color}"></i>
                <span class="text-sm font-medium text-gray-300">${this.getMessageTypeLabel(message.type)}</span>
                <span class="text-xs text-gray-500">${new Date(message.timestamp).toLocaleTimeString()}</span>
            `;
            contentDiv.appendChild(headerDiv);
        }
        
        // Add message content
        const messageContentDiv = document.createElement('div');
        messageContentDiv.className = 'message-content';
        messageContentDiv.innerHTML = this.formatMessage(message.content);
        contentDiv.appendChild(messageContentDiv);
        
        messageDiv.appendChild(contentDiv);
        messageWrapper.appendChild(messageDiv);
        messagesContainer.appendChild(messageWrapper);
        
        this.scrollToBottom();
        
        // Update message count
        if (message.type === 'user' || message.type === 'ai') {
            this.messageCount++;
            this.updateStats();
        }
    }
    
    getMessageClasses(type) {
        switch (type) {
            case 'user':
                return 'bg-chat-accent text-white';
            case 'ai':
                return 'bg-chat-light text-white border border-chat-border';
            case 'system':
                return 'bg-green-900 text-green-100 border border-green-700';
            case 'error':
                return 'bg-red-900 text-red-100 border border-red-700';
            default:
                return 'bg-chat-light text-white';
        }
    }
    
    getMessageTypeLabel(type) {
        switch (type) {
            case 'ai':
                return 'AI Assistant';
            case 'system':
                return 'System';
            case 'error':
                return 'Error';
            default:
                return 'Message';
        }
    }
    
    formatMessage(content) {
        if (!content) return '';
        
        // Split content by code blocks to handle text and code separately
        const parts = [];
        let lastIndex = 0;
        
        // Find all code blocks
        const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                const textBefore = content.substring(lastIndex, match.index);
                if (textBefore.trim()) {
                    parts.push({
                        type: 'text',
                        content: textBefore
                    });
                }
            }
            
            // Add code block
            const language = match[1] || 'text';
            const code = match[2].trim();
            parts.push({
                type: 'code',
                language: language,
                content: code
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < content.length) {
            const remainingText = content.substring(lastIndex);
            if (remainingText.trim()) {
                parts.push({
                    type: 'text',
                    content: remainingText
                });
            }
        }
        
        // If no code blocks found, treat entire content as text
        if (parts.length === 0) {
            parts.push({
                type: 'text',
                content: content
            });
        }
        
        // Format each part
        let formatted = '';
        parts.forEach(part => {
            if (part.type === 'text') {
                // Format text with markdown
                let textFormatted = part.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
                    .replace(/\n/g, '<br>');
                formatted += `<div class="text-content mb-4">${textFormatted}</div>`;
            } else if (part.type === 'code') {
                // Format code block
                formatted += `<div class="code-block-container mb-4">
                    <pre data-language="${part.language}"><code>${this.escapeHtml(part.content)}</code></pre>
                    <button class="copy-code-btn" onclick="chatApp.copyToClipboard(\`${part.content.replace(/`/g, '\\`')}\`)">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>`;
            }
        });
        
        return formatted;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    addToChatHistory(message) {
        this.chatHistory.push(message);
        
        // Keep only last 50 messages to prevent memory issues
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(-50);
        }
    }
    
    showTyping() {
        document.getElementById('typing-indicator').classList.remove('hidden');
        this.scrollToBottom();
    }
    
    hideTyping() {
        document.getElementById('typing-indicator').classList.add('hidden');
    }
    
    updateSendButton(enabled) {
        const sendBtn = document.getElementById('send-btn');
        sendBtn.disabled = !enabled;
        
        if (enabled) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        } else {
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    }
    
    showLoading(message = 'Processing...') {
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-overlay').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }
    
    showError(message) {
        this.addMessage({
            type: 'error',
            content: message,
            timestamp: new Date().toISOString()
        });
    }
    
    scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    updateStats() {
        document.getElementById('message-count').textContent = this.messageCount;
        document.getElementById('file-count').textContent = this.fileCount;
        document.getElementById('image-count').textContent = this.imageCount;
    }
    
    async generateImage() {
        const prompt = document.getElementById('image-prompt').value.trim();
        
        if (!prompt) {
            this.showError('Please enter an image description');
            return;
        }
        
        try {
            this.showLoading('Generating image...');
            
            const result = await puterIntegration.generateImage(prompt);
            
            this.generatedImages.push(result);
            this.imageCount++;
            this.updateStats();
            
            // Add to chat
            this.addMessage({
                type: 'ai',
                content: `🎨 **Generated Image:** "${prompt}"\n\n<img src="${result.url}" alt="Generated image" class="max-w-full rounded-lg shadow-lg" onclick="openImageModal('${result.url}', '${prompt}')">`,
                timestamp: new Date().toISOString()
            });
            
            // Clear prompt
            document.getElementById('image-prompt').value = '';
            
        } catch (error) {
            console.error('Image generation error:', error);
            this.showError(`Failed to generate image: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    clearChat() {
        this.messages = [];
        this.chatHistory = [];
        this.messageCount = 0;
        
        // Clear uploaded files
        puterIntegration.clearUploadedFiles();
        document.getElementById('uploaded-files').innerHTML = '';
        this.fileCount = 0;
        
        // Clear generated images
        this.generatedImages = [];
        this.imageCount = 0;
        
        // Clear UI
        document.getElementById('messages-container').innerHTML = `
            <div class="text-center py-8">
                <div class="w-16 h-16 bg-gradient-to-r from-chat-turquoise to-chat-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-robot text-white text-2xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">Chat Cleared</h2>
                <p class="text-gray-400 mb-6">Start a new conversation!</p>
            </div>
        `;
        
        this.updateStats();
    }
    
    exportChat() {
        if (this.messages.length === 0) {
            this.showError('No messages to export');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            model: puterIntegration.currentModel,
            messageCount: this.messageCount,
            messages: this.messages.map(msg => ({
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.addMessage({
            type: 'system',
            content: '✅ Chat exported successfully',
            timestamp: new Date().toISOString()
        });
    }
}

// Add copy functionality to ChatApp class
ChatApp.prototype.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary feedback
        console.log('Code copied to clipboard');
        
        // Show visual feedback
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50 transition-opacity';
        toast.textContent = 'Code copied to clipboard!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
};

function openImageModal(url, prompt) {
    // Simple image modal (can be enhanced)
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="max-w-4xl max-h-4xl p-4">
            <img src="${url}" alt="${prompt}" class="max-w-full max-h-full rounded-lg">
            <div class="text-center mt-4">
                <p class="text-white text-sm">${prompt}</p>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Initialize the app
const chatApp = new ChatApp();
