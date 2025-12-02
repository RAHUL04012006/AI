
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
        this.currentProvider = 'pollinations'; // Default to free models
        this.currentModel = 'openai';

        this.init();
    }

    updateAuthStatus() {
        const authStatus = document.getElementById('auth-status');
        const authBtn = document.getElementById('auth-btn');
        const mobileAuthBtn = document.getElementById('mobile-auth-btn');
        const isMobile = window.innerWidth < 768;

        if (puterIntegration.getAuthStatus()) {
            authStatus.textContent = '● Authenticated';
            authStatus.className = 'text-xs text-green-600';
            authBtn.classList.add('hidden');
            if (mobileAuthBtn) {
                mobileAuthBtn.innerHTML = '<i class="fas fa-sign-out-alt mr-3 w-5"></i>Sign Out';
            }
        } else {
            authStatus.textContent = '● Sign In Required';
            authStatus.className = 'text-xs text-red-600';

            // Only show desktop button if NOT on mobile
            if (!isMobile) {
                authBtn.classList.remove('hidden');
            } else {
                authBtn.classList.add('hidden');
            }

            if (mobileAuthBtn) {
                mobileAuthBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-3 w-5"></i>Sign In';
            }
        }
    }

    init() {
        console.log('🚀 ChatApp initializing...');
        this.setupEventListeners();
        this.setupFileHandling();
        this.setupModelSelector();
        this.setupAutoResize();

        // Handle resize for responsive auth button
        window.addEventListener('resize', () => {
            this.updateAuthStatus();
        });

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

        // Mobile Authentication button
        const mobileAuthBtn = document.getElementById('mobile-auth-btn');
        if (mobileAuthBtn) {
            mobileAuthBtn.addEventListener('click', async () => {
                try {
                    // If already signed in, sign out (optional, but good UX)
                    if (puterIntegration.getAuthStatus()) {
                        // Puter doesn't have a direct signOut method exposed easily in v2 without clearing tokens
                        // So we'll just reload or show status. For now, let's assume it's for sign-in mainly.
                        // But if we want to support sign out:
                        // puter.auth.signOut(); 
                        // For now, let's just authenticate if not authenticated
                        alert('You are already signed in!');
                    } else {
                        await puterIntegration.authenticate();
                        this.updateAuthStatus();

                        // Close sidebar after sign in
                        const sidebar = document.getElementById('sidebar');
                        const sidebarOverlay = document.getElementById('sidebar-overlay');
                        if (sidebar && sidebarOverlay) {
                            sidebar.classList.remove('sidebar-open');
                            sidebar.classList.add('-translate-x-full');
                            sidebarOverlay.classList.add('hidden');
                        }
                    }
                } catch (error) {
                    console.error('Mobile authentication failed:', error);
                }
            });
        }

        // Mobile Menu Logic - Toggle Sidebar
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        // Optimize placeholder for mobile
        const updatePlaceholder = () => {
            if (window.innerWidth < 768) {
                messageInput.placeholder = 'Type a message...';
            } else {
                messageInput.placeholder = 'Type your message... (Shift+Enter for new line)';
            }
        };

        // Initial check and event listener
        updatePlaceholder();
        window.addEventListener('resize', updatePlaceholder);

        if (mobileMenuBtn && sidebar && sidebarOverlay) {
            console.log('✅ Mobile menu button found, setting up sidebar toggle');
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔘 Mobile menu button clicked');

                // Simple toggle
                sidebar.classList.toggle('sidebar-open');
                sidebar.classList.toggle('-translate-x-full');
                sidebarOverlay.classList.toggle('hidden');

                console.log('Sidebar has sidebar-open?', sidebar.classList.contains('sidebar-open'));
            });

            // Close sidebar when clicking overlay
            sidebarOverlay.addEventListener('click', () => {
                console.log('🔘 Overlay clicked, closing sidebar');
                sidebar.classList.remove('sidebar-open');
                sidebar.classList.add('-translate-x-full');
                sidebarOverlay.classList.add('hidden');
            });
        } else {
            console.error('❌ Mobile menu elements not found:', {
                mobileMenuBtn: !!mobileMenuBtn,
                sidebar: !!sidebar,
                sidebarOverlay: !!sidebarOverlay
            });
        }





        // Image generation
        document.getElementById('generate-image-btn').addEventListener('click', () => {
            this.generateImage();
        });

        // Image gallery
        document.getElementById('close-gallery-btn').addEventListener('click', () => {
            document.getElementById('image-gallery-modal').classList.add('hidden');
        });

        // Copy code buttons - use event delegation for both click and touch
        const handleCopy = (e) => {
            const copyBtn = e.target.closest('.copy-code-btn');
            if (copyBtn) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📋 Copy button clicked/touched');
                const codeId = copyBtn.getAttribute('data-code-id');
                console.log('Code ID:', codeId);
                const codeElement = document.getElementById(codeId);
                if (codeElement && window.copyToClipboard) {
                    console.log('Copying code...');
                    window.copyToClipboard(codeElement.textContent);
                } else {
                    console.error('Code element not found or copyToClipboard missing', {
                        codeElement: !!codeElement,
                        copyToClipboard: !!window.copyToClipboard
                    });
                }
            }
        };

        document.addEventListener('click', handleCopy);
        document.addEventListener('touchstart', handleCopy, { passive: false });
    }

    setupAutoResize() {
        const textarea = document.getElementById('message-input');
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 128) + 'px';
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
        this.switchModel('openai');
    }

    switchModel(modelName) {
        this.currentModel = modelName;

        // Determine which provider to use
        const pollinationsModels = pollinationsIntegration.getModels();

        if (pollinationsModels[modelName]) {
            // Free model - use Pollinations
            this.currentProvider = 'pollinations';
            pollinationsIntegration.setCurrentModel(modelName);
            const config = pollinationsIntegration.getModelConfig(modelName);

            // Update UI
            document.getElementById('current-model').textContent = config.name;
            document.getElementById('model-provider').textContent = config.provider + ' (Free)';
            document.getElementById('model-capabilities').textContent = config.capabilities;

            // Add system message about model switch
            this.addMessage({
                type: 'system',
                content: `✅ Switched to ${config.name} - No login required!`,
                timestamp: new Date().toISOString()
            });
        } else {
            // Premium model - use Puter.js
            this.currentProvider = 'puter';
            puterIntegration.setCurrentModel(modelName);
            const config = puterIntegration.getModelConfig(modelName);

            // Update UI
            document.getElementById('current-model').textContent = this.getModelDisplayName(modelName);
            document.getElementById('model-provider').textContent = config.provider + ' (Premium)';
            document.getElementById('model-capabilities').textContent = config.capabilities;

            // Add system message about model switch
            this.addMessage({
                type: 'system',
                content: `🔐 Switched to ${this.getModelDisplayName(modelName)} - Login required for premium models`,
                timestamp: new Date().toISOString()
            });
        }
    }

    getModelDisplayName(modelName) {
        const displayNames = {
            'gpt-4o': 'GPT-4o',
            'gpt-4.1': 'GPT-4.1',
            'o1': 'o1',
            'o3-mini': 'o3-mini',
            'claude-sonnet-4': 'Claude Sonnet 4',
            'deepseek-chat': 'DeepSeek Chat V3',
            'deepseek-reasoner': 'DeepSeek Reasoner R1',
            'deepseek/deepseek-chat-v3.1:free': 'DeepSeek: DeepSeek V3.1',
            'nousresearch/deephermes-3-llama-3-8b-preview:free': 'Nous: DeepHermes 3 Llama 3 8B Preview',
            'deepseek/deepseek-r1-0528-qwen3-8b:free': 'DeepSeek: R1 0528 Qwen3 8B',
            'deepseek/deepseek-r1-0528:free': 'DeepSeek: R1 0528',
            'deepseek/deepseek-chat-v3-0324:free': 'DeepSeek: DeepSeek V3 0324',
            'deepseek/deepseek-r1-distill-llama-70b:free': 'DeepSeek: R1 Distill Llama 70B',
            'deepseek/deepseek-r1:free': 'DeepSeek: R1',
            'openai': 'OpenAI (GPT-4o-mini)'
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

            // Use appropriate provider based on current model
            let response;

            if (this.currentProvider === 'pollinations') {
                response = await pollinationsIntegration.sendMessage(message, attachments, this.chatHistory);
            } else {
                // Try Puter.js first, fallback to Pollinations if it fails
                try {
                    response = await puterIntegration.sendMessage(message, attachments, this.chatHistory);
                } catch (puterError) {
                    console.log('Puter.js failed, falling back to Pollinations:', puterError);

                    // Show fallback message
                    this.addMessage({
                        type: 'system',
                        content: `⚠️ Puter.js limit reached. Switching to OpenAI (Free) for this message.`,
                        timestamp: new Date().toISOString()
                    });

                    // Temporarily switch to free model
                    const originalModel = this.currentModel;
                    this.currentProvider = 'pollinations';
                    pollinationsIntegration.setCurrentModel('openai');

                    response = await pollinationsIntegration.sendMessage(message, attachments, this.chatHistory);

                    // Note: Keep using free model for subsequent messages
                    this.currentModel = 'openai';
                    document.getElementById('model-selector').value = 'openai';
                    this.switchModel('openai');
                }
            }

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
                    type: 'error',
                    content: `⚠️ Usage Limit Reached: The current model has usage limitations.\n\nSolutions:\n• Switch to a free model (OpenAI, Llama, etc.)\n• Wait a few minutes and try again\n• Use shorter messages to conserve usage`,
                    timestamp: new Date().toISOString()
                });
            } else if (error.message.includes('sign in') || error.message.includes('authentication')) {
                this.addMessage({
                    type: 'error',
                    content: `🔐 Authentication Required: Premium models require Puter.js login.\n\nOptions:\n• Use free models (no login required)\n• Sign in to Puter.js for premium models\n• Visit https://puter.com to create a free account`,
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
                    // Use simple formatting during stream for performance
                    contentDiv.innerHTML = this.formatMessage(fullResponse);
                    this.scrollToBottom();
                }
            }

            puterIntegration.lastResponse = fullResponse;

            // Final render with Prism.js highlighting
            contentDiv.innerHTML = this.formatMessage(fullResponse);

            // Trigger Prism highlight
            if (window.Prism) {
                Prism.highlightAllUnder(contentDiv);
            }

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
            const color = message.type === 'ai' ? 'text-chat-turquoise' : 'text-yellow-600';

            headerDiv.innerHTML = `
                <i class="fas ${icon} ${color}"></i>
                <span class="text-sm font-medium text-gray-700">${this.getMessageTypeLabel(message.type)}</span>
                <span class="text-xs text-gray-500">${new Date(message.timestamp).toLocaleTimeString()}</span>
            `;
            contentDiv.appendChild(headerDiv);
        }

        // Add message content
        const messageContentDiv = document.createElement('div');
        messageContentDiv.className = 'message-content';

        if (message.type === 'image') {
            // For image messages, render content directly (it contains HTML)
            messageContentDiv.innerHTML = message.content;
        } else {
            // For text messages, format and escape
            messageContentDiv.innerHTML = this.formatMessage(message.content);
        }

        contentDiv.appendChild(messageContentDiv);

        messageDiv.appendChild(contentDiv);
        messageWrapper.appendChild(messageDiv);
        messagesContainer.appendChild(messageWrapper);

        // Trigger Prism highlight
        if (window.Prism) {
            Prism.highlightAllUnder(messageContentDiv);
        }

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
                return 'message-user bg-chat-accent text-white';
            case 'ai':
            case 'image':
                return 'bg-white text-gray-900 border border-chat-border shadow-sm';
            case 'system':
                return 'bg-gray-100 text-gray-700 border border-gray-200';
            case 'error':
                return 'bg-red-50 text-red-800 border border-red-200';
            default:
                return 'bg-white text-gray-900';
        }
    }

    getMessageTypeLabel(type) {
        switch (type) {
            case 'ai':
            case 'image':
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
        // Find all code blocks
        const codeBlockRegex = /```\s*([\w\-\+]*)\s*\n?([\s\S]*?)```/g;
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
                // Escape HTML first to prevent rendering of raw HTML
                let safeContent = this.escapeHtml(part.content);

                let textFormatted = safeContent
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
                    .replace(/\n/g, '<br>');
                formatted += `<div class="text-content mb-4">${textFormatted}</div>`;
            } else if (part.type === 'code') {
                // Format code block with unique ID for copy button
                const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                // Use Prism.js compatible structure with absolute positioned copy button
                formatted += `<div class="code-block-wrapper mb-6 border border-gray-200 rounded-lg shadow-sm bg-white relative">
                    <!-- Language label -->
                    <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">${part.language || 'text'}</span>
                    </div>
                    <!-- Copy button - absolutely positioned top right -->
                    <button class="copy-code-btn absolute top-2 right-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all z-10 flex items-center gap-1.5" 
                            style="background-color: #ec4899; color: white; border: 2px solid #ec4899; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" 
                            data-code-id="${codeId}">
                        <i class="fas fa-copy"></i> COPY
                    </button>
                    <!-- Code content -->
                    <div class="overflow-x-auto">
                        <pre class="!m-0 !p-4 !bg-white"><code id="${codeId}" class="language-${part.language || 'plaintext'}">${this.escapeHtml(part.content)}</code></pre>
                    </div>
                </div>`;
            }
        });
        return formatted;
    }
    initMonacoEditors(container) {
        // Ensure Monaco loader is available
        if (typeof require === 'undefined') {
            console.error('Monaco loader not found');
            return;
        }

        // Use the standard AMD require pattern to ensure editor is loaded
        require(['vs/editor/editor.main'], () => {
            const editors = container.querySelectorAll('.monaco-editor-container');
            editors.forEach(editorDiv => {
                if (editorDiv.getAttribute('data-initialized') === 'true') return;

                const codeId = editorDiv.id;
                const rawTextarea = document.getElementById(`raw-${codeId}`);
                if (!rawTextarea) return;

                // Get value from textarea
                const code = rawTextarea.value;
                const language = rawTextarea.getAttribute('data-language') || 'plaintext';

                console.log(`Initializing Monaco for ${codeId}, length: ${code.length}`);

                // Calculate height
                const lineCount = code.split('\n').length;
                const height = Math.max(100, Math.min(600, lineCount * 19 + 30));
                editorDiv.style.height = `${height}px`;

                try {
                    // Create editor instance
                    const editor = monaco.editor.create(editorDiv, {
                        value: code,
                        language: this.mapLanguage(language),
                        theme: 'vs', // Light theme
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        automaticLayout: true, // This handles most resize events
                        renderLineHighlight: 'none',
                        contextmenu: false,
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false
                        }
                    });

                    editorDiv.setAttribute('data-initialized', 'true');

                    // Force a layout update after a short delay to ensure rendering
                    // This is critical for preventing "empty" editors
                    setTimeout(() => {
                        editor.layout();
                    }, 100);

                } catch (e) {
                    console.error('Failed to initialize Monaco:', e);
                    // Fallback: show raw code if Monaco fails
                    editorDiv.innerHTML = `<pre class="p-4 text-sm overflow-auto">${this.escapeHtml(code)}</pre>`;
                }
            });
        });
    }

    mapLanguage(lang) {
        const map = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'c++': 'cpp',
            'cpp': 'cpp',
            'c#': 'csharp',
            'cs': 'csharp',
            'java': 'java',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell'
        };
        return map[lang.toLowerCase()] || lang;
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

    showLoading(message = 'Thinking...') {
        // Remove any existing loading indicator
        this.hideLoading();

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.className = 'flex items-center space-x-3 p-4 bg-white rounded-lg max-w-xs mx-auto my-4 border border-chat-border/30 animate-pulse shadow-md';
        loadingDiv.innerHTML = `
            <div class="w-5 h-5 border-2 border-chat-accent border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-700 text-sm font-medium">${message}</span>
        `;

        document.getElementById('messages-container').appendChild(loadingDiv);
        this.scrollToBottom();
    }

    hideLoading() {
        const existing = document.getElementById('loading-indicator');
        if (existing) {
            existing.remove();
        }
        // Also try to hide overlay if it exists, just in case
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
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
        const generateBtn = document.getElementById('generate-image-btn');

        if (!prompt) {
            this.showError('Please enter an image description');
            return;
        }

        // Set button loading state
        const originalBtnText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Generating...';
        generateBtn.classList.add('opacity-75', 'cursor-not-allowed');

        try {
            this.showLoading('Generating image...');

            // Always use Pollinations for image generation
            const imageUrl = await pollinationsIntegration.generateImage(prompt);

            this.addMessage({
                type: 'image',
                content: `🎨 <strong>Generated Image:</strong> "${prompt}"<br><br>
                <div class="relative group min-h-[256px] bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                    <!-- Loading Spinner (Visible until image loads) -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-pink-500 transition-opacity duration-300" id="loader-${Date.now()}">
                        <i class="fas fa-circle-notch fa-spin text-3xl mb-2"></i>
                        <span class="text-sm font-medium text-gray-500">Loading image...</span>
                    </div>
                    
                    <!-- Image (Hidden until loaded) -->
                    <img src="${imageUrl}" 
                         alt="Generated image" 
                         class="relative z-10 max-w-full rounded-lg shadow-lg cursor-pointer transition-all duration-500 opacity-0 hover:scale-[1.01]" 
                         onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.opacity = '0'; setTimeout(() => this.previousElementSibling.remove(), 300);"
                         onerror="this.previousElementSibling.innerHTML = '<div class=\'flex flex-col items-center text-red-500\'><i class=\'fas fa-exclamation-circle text-3xl mb-2\'></i><span class=\'text-sm\'>Failed to load image</span></div>'; this.style.display='none';"
                         onclick="openImageModal('${imageUrl}', '${prompt}')">
                         
                    <button onclick="chatApp.downloadImage('${imageUrl}')" class="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20" title="Download Image">
                        <i class="fas fa-download"></i>
                    </button>
                </div>`,
                timestamp: new Date().toISOString()
            });

            // Clear prompt
            document.getElementById('image-prompt').value = '';

        } catch (error) {
            console.error('Image generation error:', error);
            this.showError(`Failed to generate image: ${error.message}`);
        } finally {
            this.hideLoading();
            // Restore button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalBtnText;
            generateBtn.classList.remove('opacity-75', 'cursor-not-allowed');
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
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Chat Cleared</h2>
                <p class="text-gray-500 mb-6">Start a new conversation!</p>
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
ChatApp.prototype.copyToClipboard = function (text) {
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


ChatApp.prototype.downloadImage = async function (url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `generated-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download image. Opening in new tab instead.');
        window.open(url, '_blank');
    }
};

// Copy to clipboard function
// Copy to clipboard function with fallback
window.copyToClipboard = function (text) {
    // Try Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback();
        }).catch(err => {
            console.error('Clipboard API failed:', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        fallbackCopyTextToClipboard(text);
    }
};

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure textarea is not visible but part of DOM
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback();
        } else {
            console.error('Fallback copy failed');
            alert('Unable to copy code. Please select and copy manually.');
        }
    } catch (err) {
        console.error('Fallback copy error:', err);
        alert('Unable to copy code. Please select and copy manually.');
    }

    document.body.removeChild(textArea);
}

function showCopyFeedback() {
    console.log('Code copied to clipboard');

    // Show visual feedback
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50 transition-opacity shadow-lg';
    toast.innerHTML = '<i class="fas fa-check mr-2"></i>Code copied!';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Initialize the app
const chatApp = new ChatApp();
