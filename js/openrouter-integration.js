/**
 * OpenRouter API Integration Module
 * Handles DeepSeek V3.1 and other OpenRouter models as fallback
 */

class OpenRouterIntegration {
    constructor() {
        this.apiKey = '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';
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.currentModel = 'deepseek/deepseek-chat';
        
        // Available OpenRouter models
        this.models = {
            'deepseek/deepseek-chat': {
                name: 'DeepSeek V3.1 (Free)',
                provider: 'DeepSeek',
                capabilities: 'Text, Code, Math, Reasoning',
                free: true,
                streaming: true
            },
            'deepseek/deepseek-reasoner': {
                name: 'DeepSeek R1 (Free)',
                provider: 'DeepSeek',
                capabilities: 'Advanced Reasoning, Logic',
                free: true,
                streaming: true
            },
            'google/gemini-flash-1.5': {
                name: 'Gemini Flash 1.5',
                provider: 'Google',
                capabilities: 'Text, Vision, Fast Response',
                free: true,
                streaming: true
            },
            'meta-llama/llama-3.1-8b-instruct:free': {
                name: 'Llama 3.1 8B (Free)',
                provider: 'Meta',
                capabilities: 'Text, Code, General',
                free: true,
                streaming: true
            }
        };
        
        this.isAvailable = true;
        console.log('🔄 OpenRouter Integration initialized');
    }
    
    getModelConfig(modelId) {
        return this.models[modelId] || this.models['deepseek/deepseek-chat'];
    }
    
    getAllModels() {
        return this.models;
    }
    
    setCurrentModel(modelId) {
        if (this.models[modelId]) {
            this.currentModel = modelId;
            console.log(`🤖 OpenRouter switched to: ${this.models[modelId].name}`);
            return true;
        }
        return false;
    }
    
    async sendMessage(message, chatHistory = []) {
        try {
            console.log(`🚀 Sending message to OpenRouter (${this.models[this.currentModel].name})`);
            
            // Prepare messages array for OpenRouter API
            const messages = [];
            
            // Add system message for DeepSeek models
            if (this.currentModel.includes('deepseek')) {
                messages.push({
                    role: 'system',
                    content: 'You are a helpful AI assistant powered by DeepSeek. You excel at coding, mathematics, reasoning, and providing detailed explanations. Always be helpful, accurate, and concise.'
                });
            }
            
            // Add chat history (last 10 messages for context)
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
            
            // Add current message
            messages.push({
                role: 'user',
                content: message
            });
            
            const requestBody = {
                model: this.currentModel,
                messages: messages,
                stream: this.models[this.currentModel].streaming,
                temperature: 0.7,
                max_tokens: 4000
            };
            
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AlgoCroc AI'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
            
            if (this.models[this.currentModel].streaming) {
                return {
                    type: 'stream',
                    stream: this.createStreamReader(response)
                };
            } else {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || 'No response received';
                return {
                    type: 'complete',
                    content: content
                };
            }
            
        } catch (error) {
            console.error('❌ OpenRouter API error:', error);
            
            // Handle specific errors
            if (error.message.includes('401')) {
                throw new Error('OpenRouter API key is invalid or expired. Please check your API key.');
            } else if (error.message.includes('429')) {
                throw new Error('OpenRouter rate limit exceeded. Please wait a moment and try again.');
            } else if (error.message.includes('insufficient_quota')) {
                throw new Error('OpenRouter quota exceeded. The free tier has usage limits.');
            }
            
            throw new Error(`OpenRouter error: ${error.message}`);
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
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const data = trimmed.slice(6);
                        
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
                            console.warn('Failed to parse SSE data:', data);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
    
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('OpenRouter connection test failed:', error);
            return false;
        }
    }
    
    isModelAvailable(modelId) {
        return this.models.hasOwnProperty(modelId);
    }
    
    getFreeModels() {
        return Object.entries(this.models)
            .filter(([_, config]) => config.free)
            .map(([id, config]) => ({ id, ...config }));
    }
}

// Global instance
const openRouterIntegration = new OpenRouterIntegration();
