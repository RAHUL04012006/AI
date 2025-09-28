
class PuterIntegration {
    constructor() {
        this.currentModel = 'deepseek/deepseek-chat';
        this.currentProvider = 'openrouter'; // Default to OpenRouter
        this.uploadedFiles = [];
        this.lastResponse = '';
        this.isAuthenticated = false;
        this.streamingResponse = null;
        this.fallbackEnabled = true;
        
        // Model configurations
        this.modelConfigs = {
            'gpt-4o': {
                provider: 'OpenAI',
                capabilities: 'Text, Vision, Audio',
                multimodal: true,
                streaming: true
            },
            'gpt-4.1': {
                provider: 'OpenAI',
                capabilities: 'Text, Code, Analysis',
                multimodal: false,
                streaming: true
            },
            'o1': {
                provider: 'OpenAI',
                capabilities: 'Advanced Reasoning',
                multimodal: false,
                streaming: false
            },
            'o3-mini': {
                provider: 'OpenAI',
                capabilities: 'Fast Reasoning',
                multimodal: false,
                streaming: true
            },
            'claude-sonnet-4': {
                provider: 'Anthropic',
                capabilities: 'Text, Code, Analysis',
                multimodal: true,
                streaming: true
            },
            'deepseek-chat': {
                provider: 'DeepSeek',
                capabilities: 'Text, Code, Math',
                multimodal: false,
                streaming: true
            },
            'deepseek-reasoner': {
                provider: 'DeepSeek',
                capabilities: 'Complex Reasoning',
                multimodal: false,
                streaming: true
            }
        };
        
        this.init();
    }
    
    async init() {
        // Wait a bit for Puter.js to load
        setTimeout(async () => {
            try {
                // Initialize Puter.js with authentication
                if (typeof puter !== 'undefined' && puter.auth) {
                    // Check if already authenticated
                    try {
                        const user = await puter.auth.getUser();
                        if (user && user.username) {
                            this.isAuthenticated = true;
                            console.log('✅ Puter.js initialized and authenticated as:', user.username);
                        } else {
                            this.isAuthenticated = false;
                            console.log('⚠️ Puter.js not authenticated - sign in required');
                        }
                    } catch (authError) {
                        this.isAuthenticated = false;
                        console.log('⚠️ Puter.js authentication check failed - this is normal if not signed in');
                    }
                } else {
                    console.log('⚠️ Puter.js not fully loaded - using OpenRouter as default');
                    this.isAuthenticated = false;
                }
            } catch (error) {
                console.log('⚠️ Puter.js initialization had issues - using OpenRouter as default');
                this.isAuthenticated = false;
            }
        }, 1000);
    }
    
    setCurrentModel(model) {
        this.currentModel = model;
        console.log(`🤖 Switched to model: ${model}`);
    }
    
    setCurrentProvider(provider) {
        this.currentProvider = provider;
        console.log(`🔄 Switched to provider: ${provider}`);
    }
    
    getCurrentProvider() {
        return this.currentProvider;
    }
    
    getModelConfig(model) {
        // Check OpenRouter models first
        if (this.currentProvider === 'openrouter' && openRouterIntegration) {
            const openRouterConfig = openRouterIntegration.getModelConfig(model);
            if (openRouterConfig) {
                return {
                    provider: openRouterConfig.provider,
                    capabilities: openRouterConfig.capabilities,
                    multimodal: false,
                    streaming: openRouterConfig.streaming
                };
            }
        }
        
        // Fallback to Puter.js models
        return this.modelConfigs[model] || {
            provider: 'Unknown',
            capabilities: 'General',
            multimodal: false,
            streaming: true
        };
    }
    
    getUploadedFiles() {
        return this.uploadedFiles;
    }
    
    async authenticate() {
        try {
            if (typeof puter === 'undefined') {
                throw new Error('Puter.js is not loaded. Please refresh the page.');
            }
            
            console.log('🔐 Starting Puter.js authentication...');
            const result = await puter.auth.signIn();
            
            if (result) {
                this.isAuthenticated = true;
                console.log('✅ Authentication successful');
                return true;
            } else {
                throw new Error('Authentication returned no result');
            }
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            this.isAuthenticated = false;
            
            // Handle specific error types
            let errorMessage = 'Authentication failed';
            if (error.error === 'auth_window_closed') {
                errorMessage = 'Authentication window was closed. Please try again.';
            } else if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            throw new Error(errorMessage);
        }
    }
    
    getAuthStatus() {
        return this.isAuthenticated;
    }
    
    async sendMessage(message, attachments = [], chatHistory = []) {
        try {
            // Route to appropriate provider
            if (this.currentProvider === 'openrouter') {
                console.log('🚀 Using OpenRouter API');
                return await openRouterIntegration.sendMessage(message, chatHistory);
            }
            
            // Puter.js flow
            console.log('🔐 Using Puter.js API');
            
            // Check authentication first
            if (!this.isAuthenticated) {
                try {
                    await puter.auth.signIn();
                    this.isAuthenticated = true;
                } catch (authError) {
                    // Fallback to OpenRouter if authentication fails
                    if (this.fallbackEnabled) {
                        console.log('⚠️ Puter.js auth failed, falling back to OpenRouter');
                        this.currentProvider = 'openrouter';
                        return await openRouterIntegration.sendMessage(message, chatHistory);
                    }
                    throw new Error('Please sign in to Puter.js to use AI models. A popup should appear for authentication.');
                }
            }
            
            const config = this.getModelConfig(this.currentModel);
            
            // Prepare message with attachments
            let messageInput = message;
            
            // Include file contents in the message if available
            if (attachments.length > 0) {
                let fileContext = "\n\nAttached files:\n";
                
                for (const file of attachments) {
                    if (file.content) {
                        // Text file content
                        fileContext += `\n--- ${file.name} ---\n${file.content}\n`;
                    } else if (file.type.startsWith('image/')) {
                        // For images, just mention them (vision models will handle them separately)
                        fileContext += `\n- Image: ${file.name} (${file.type})\n`;
                        
                        // If multimodal model, try vision analysis
                        if (config.multimodal) {
                            try {
                                console.log(`🔍 Analyzing image with ${this.currentModel}...`);
                                const analysisResult = await this.analyzeImage(file.data, message);
                                this.lastResponse = analysisResult;
                                
                                return {
                                    type: 'complete',
                                    content: this.lastResponse
                                };
                            } catch (visionError) {
                                console.log('Vision analysis failed, continuing with text-only:', visionError);
                                fileContext += `\n[Note: Image analysis unavailable - ${visionError.message}]\n`;
                            }
                        }
                    } else {
                        fileContext += `\n- File: ${file.name} (${file.type}, ${file.size} bytes)\n`;
                    }
                }
                
                messageInput += fileContext;
            }
            
            // Prepare conversation context if chat history exists
            if (chatHistory.length > 0) {
                const contextMessage = this.buildContextMessage(messageInput, chatHistory);
                messageInput = contextMessage;
            }
            
            // Regular text chat
            if (config.streaming) {
                return await this.streamMessage(messageInput);
            } else {
                const response = await puter.ai.chat(messageInput, {
                    model: this.currentModel
                });
                
                // Handle different response formats
                if (response.message && response.message.content) {
                    if (Array.isArray(response.message.content)) {
                        this.lastResponse = response.message.content[0].text;
                    } else {
                        this.lastResponse = response.message.content;
                    }
                } else if (typeof response === 'string') {
                    this.lastResponse = response;
                } else if (response.text) {
                    this.lastResponse = response.text;
                }
                
                return {
                    type: 'complete',
                    content: this.lastResponse
                };
            }
        } catch (error) {
            console.error('❌ Send message error:', error);
            
            // Handle specific Puter.js errors and fallback
            if (error.error && error.error.code === 'error_400_from_delegate') {
                if (error.error.message.includes('Permission denied') || error.error.message.includes('usage-limited-chat')) {
                    // Fallback to OpenRouter if Puter.js has usage limits
                    if (this.fallbackEnabled && this.currentProvider === 'puter') {
                        console.log('⚠️ Puter.js usage limit reached, falling back to OpenRouter');
                        this.currentProvider = 'openrouter';
                        return await openRouterIntegration.sendMessage(message, chatHistory);
                    }
                    throw new Error('Usage limit reached. Switched to OpenRouter for unlimited free access.');
                }
            }
            
            // General fallback for any Puter.js errors
            if (this.fallbackEnabled && this.currentProvider === 'puter') {
                console.log('⚠️ Puter.js error, falling back to OpenRouter');
                this.currentProvider = 'openrouter';
                return await openRouterIntegration.sendMessage(message, chatHistory);
            }
            
            throw new Error(`Failed to send message: ${error.message || 'Unknown error'}`);
        }
    }
    
    buildContextMessage(message, chatHistory) {
        // Include recent chat history for context (last 10 messages)
        const recentHistory = chatHistory.slice(-10);
        let contextMessage = "Previous conversation context:\n\n";
        
        for (const msg of recentHistory) {
            if (msg.type === 'user') {
                contextMessage += `User: ${msg.content}\n`;
            } else if (msg.type === 'ai') {
                contextMessage += `Assistant: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}\n`;
            }
        }
        
        contextMessage += `\nCurrent message:\n${message}`;
        return contextMessage;
    }
    
    async streamMessage(message) {
        try {
            const response = await puter.ai.chat(message, {
                model: this.currentModel,
                stream: true
            });
            
            return {
                type: 'stream',
                stream: response
            };
        } catch (error) {
            console.error('❌ Stream message error:', error);
            
            // Handle specific errors
            if (error.error && error.error.code === 'error_400_from_delegate') {
                if (error.error.message.includes('Permission denied') || error.error.message.includes('usage-limited-chat')) {
                    throw new Error('Usage limit reached or permission denied. The free tier of Puter.js may have limitations. Please try again later or consider upgrading your Puter.js account.');
                }
            }
            
            // Fallback to non-streaming
            const response = await puter.ai.chat(message, {
                model: this.currentModel
            });
            
            if (response.message && response.message.content) {
                this.lastResponse = Array.isArray(response.message.content) 
                    ? response.message.content[0].text 
                    : response.message.content;
            } else {
                this.lastResponse = response.text || response;
            }
            
            return {
                type: 'complete',
                content: this.lastResponse
            };
        }
    }
    
    async generateImage(prompt, testMode = false) {
        try {
            console.log(`🎨 Generating realistic image with DALL-E: "${prompt}"`);
            
            // Enhanced prompt for better realism with DALL-E
            const enhancedPrompt = `High-quality, photorealistic, detailed: ${prompt}. Professional photography, sharp focus, excellent lighting, 4K resolution.`;
            
            const image = await puter.ai.txt2img(enhancedPrompt, testMode);
            
            return {
                element: image,
                url: image.src,
                prompt: prompt,
                originalPrompt: enhancedPrompt,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Image generation error:', error);
            throw new Error(`Failed to generate image: ${error.message}`);
        }
    }
    
    async uploadFile(file) {
        try {
            console.log(`📁 Processing file: ${file.name}`);
            
            // Process file locally without cloud upload
            const fileInfo = {
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file),
                timestamp: new Date().toISOString(),
                data: file
            };
            
            // If it's a text file, read its content
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.js') || file.name.endsWith('.html') || file.name.endsWith('.css')) {
                fileInfo.content = await this.readTextFile(file);
            } else if (file.type.startsWith('image/')) {
                // For images, create a proper file reference for vision models
                fileInfo.imageData = file;
            }
            
            this.uploadedFiles.push(fileInfo);
            console.log(`✅ File processed: ${file.name}`);
            
            return fileInfo;
        } catch (error) {
            console.error('❌ File upload error:', error);
            throw new Error(`Failed to process file: ${error.message}`);
        }
    }
    
    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    async analyzeImage(imageFile, prompt = "Analyze this image and tell me what you see") {
        try {
            console.log('👁️ Analyzing image...');
            
            // Try to analyze with Puter AI if possible
            try {
                const response = await puter.ai.chat(prompt, imageFile);
                
                if (response && typeof response === 'object') {
                    if (response.message && response.message.content) {
                        return Array.isArray(response.message.content) 
                            ? response.message.content[0].text 
                            : response.message.content;
                    } else if (response.text) {
                        return response.text;
                    }
                }
                
                return response || 'Image analysis completed';
            } catch (aiError) {
                console.log('AI analysis failed, providing basic info:', aiError);
                
                // Fallback: provide basic file information
                const fileName = imageFile.name || 'uploaded image';
                const fileType = imageFile.type || 'unknown';
                
                return `I can see you've uploaded an image file named "${fileName}" of type ${fileType}. However, I'm unable to analyze the visual content at the moment. You can try asking me specific questions about the image or describe what you'd like me to help you with regarding this image.`;
            }
        } catch (error) {
            console.error('❌ Image analysis error:', error);
            throw new Error(`Failed to analyze image: ${error.message}`);
        }
    }
    
    clearUploadedFiles() {
        this.uploadedFiles = [];
    }
}

// Global instance
const puterIntegration = new PuterIntegration();
