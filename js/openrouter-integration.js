
class OpenRouterIntegration {
    constructor() {
        this.apiKey = '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';
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.currentModel = 'deepseek/deepseek-chat-v3.1:free';
        
        // Free models available on OpenRouter (based on actual available models)
        this.freeModels = {
            'deepseek/deepseek-chat-v3.1:free': {
                name: 'DeepSeek: DeepSeek V3.1 (Free)',
                provider: 'DeepSeek',
                capabilities: 'Text, Code, Math',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            },
            'nousresearch/deephermes-3-llama-3-8b-preview:free': {
                name: 'Nous: DeepHermes 3 Llama 3 8B Preview (Free)',
                provider: 'Nous Research',
                capabilities: 'Text, Code, Chat',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            },
            'deepseek/deepseek-r1-0528-qwen3-8b:free': {
                name: 'DeepSeek: DeepSeek R1 0528 Qwen3 8B (Free)',
                provider: 'DeepSeek',
                capabilities: 'Reasoning, Text, Code',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            },
            'deepseek/deepseek-r1-0528:free': {
                name: 'DeepSeek: R1 0528 (Free)',
                provider: 'DeepSeek',
                capabilities: 'Advanced Reasoning',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            },
            'deepseek/deepseek-chat-v3-0324:free': {
                name: 'DeepSeek: DeepSeek V3 0324 (Free)',
                provider: 'DeepSeek',
                capabilities: 'Text, Code, Analysis',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            },
            'deepseek/deepseek-r1-distill-llama-70b:free': {
                name: 'DeepSeek: R1 Distill Llama 70B (Free)',
                provider: 'DeepSeek',
                capabilities: 'Reasoning, Code',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            },
            'deepseek/deepseek-r1:free': {
                name: 'DeepSeek: R1 (Free)',
                provider: 'DeepSeek',
                capabilities: 'Reasoning, Analysis',
                multimodal: false,
                streaming: true,
                requiresAuth: false
            }
        };
        
        this.lastResponse = '';
    }
    
    setCurrentModel(model) {
        if (this.freeModels[model]) {
            this.currentModel = model;
            console.log(`🤖 Switched to OpenRouter model: ${model}`);
            return true;
        }
        return false;
    }
    
    getModelConfig(model) {
        return this.freeModels[model] || this.freeModels['deepseek/deepseek-chat-v3.1:free'];
    }
    
    getFreeModels() {
        return this.freeModels;
    }
    
    getAvailableModelNames() {
        return Object.keys(this.freeModels);
    }
    
    async sendMessage(message, attachments = [], chatHistory = []) {
        try {
            const config = this.getModelConfig(this.currentModel);
            
            // Prepare message with context
            let messageInput = message;
            
            // Include file contents in the message if available
            if (attachments.length > 0) {
                let fileContext = "\n\nAttached files:\n";
                
                for (const file of attachments) {
                    if (file.content) {
                        fileContext += `\n--- ${file.name} ---\n${file.content}\n`;
                    } else if (file.type.startsWith('image/')) {
                        fileContext += `\n- Image: ${file.name} (${file.type}) - Note: Image analysis not available with this model\n`;
                    } else {
                        fileContext += `\n- File: ${file.name} (${file.type}, ${file.size} bytes)\n`;
                    }
                }
                
            }
            
            // Build conversation context
            const messages = [];
            
            // Add system message
            messages.push({
                role: 'system',
                content: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses. Be concise but thorough.'
            });
            
            // Add chat history (last 10 messages)
            if (chatHistory.length > 0) {
                const recentHistory = chatHistory.slice(-10);
                for (const msg of recentHistory) {
                    if (msg.type === 'user') {
                        messages.push({
                            role: 'user',
                            content: msg.content
                        });
                    } else if (msg.type === 'ai') {
                        messages.push({
                            role: 'assistant',
                            content: msg.content
                        });
                    }
                }
            }
            
            // Add current message
            messages.push({
                role: 'user',
                content: messageInput
            });
            
            // Make API request
            if (config.streaming) {
                return await this.streamMessage(messages);
            } else {
                return await this.sendNonStreamingMessage(messages);
            }
            
        } catch (error) {
            console.error('❌ OpenRouter API error:', error);
            throw new Error(`OpenRouter API failed: ${error.message}`);
        }
    }
    
    async streamMessage(messages) {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AlgoCroc AI'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: messages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 2000,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return {
                type: 'stream',
                stream: this.createStreamReader(response)
            };
            
        } catch (error) {
            console.error('❌ OpenRouter streaming error:', error);
            throw error;
        }
    }
    
    async *createStreamReader(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            
                            if (content) {
                                yield { text: content };
                            }
                        } catch (parseError) {
                            // Skip invalid JSON
                            continue;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
    
    async sendNonStreamingMessage(messages) {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AlgoCroc AI'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: messages,
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 2000,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || 'No response received';
            
            this.lastResponse = content;
            
            return {
                type: 'complete',
                content: content
            };
            
        } catch (error) {
            console.error('❌ OpenRouter non-streaming error:', error);
            throw error;
        }
    }
    
    async generateImage(prompt) {
        // OpenRouter doesn't provide free image generation
        throw new Error('Image generation is not available with free OpenRouter models. Please use Puter.js for image generation.');
    }
    
    async analyzeImage(imageFile, prompt) {
        // Most free models don't support vision
        throw new Error('Image analysis is not available with free OpenRouter models. Please use Puter.js vision models for image analysis.');
    }
}

// Global instance
const openRouterIntegration = new OpenRouterIntegration();
