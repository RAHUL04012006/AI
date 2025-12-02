
class PollinationsIntegration {
    constructor() {
        this.baseUrl = 'https://text.pollinations.ai/';
        this.currentModel = 'openai'; // Default model

        // Available Pollinations models
        this.models = {
            'openai': {
                name: 'OpenAI (GPT-4o-mini)',
                provider: 'Pollinations',
                capabilities: 'Text, Code, Chat',
                multimodal: true,
                streaming: false,
                requiresAuth: false
            }
        };

        this.lastResponse = '';
    }

    setCurrentModel(model) {
        if (this.models[model]) {
            this.currentModel = model;
            console.log(`🌸 Switched to Pollinations model: ${model}`);
            return true;
        }
        return false;
    }

    getModelConfig(model) {
        return this.models[model] || this.models['openai'];
    }

    getModels() {
        return this.models;
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
                messageInput += fileContext;
            }

            // Build conversation context
            const messages = [];

            // Add system message
            messages.push({
                role: 'system',
                content: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses. IMPORTANT: You must ALWAYS format code snippets using markdown code blocks (```language ... ```). Do not write code in plain text. Be concise but thorough.'
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

            // Pollinations API call
            // Using POST to https://text.pollinations.ai/
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: this.currentModel,
                    seed: Math.floor(Math.random() * 1000) // Add random seed for variety
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseText = await response.text();

            this.lastResponse = responseText;

            return {
                type: 'complete',
                content: responseText
            };

        } catch (error) {
            console.error('❌ Pollinations API error:', error);
            throw new Error(`Pollinations API failed: ${error.message}`);
        }
    }

    async generateImage(prompt) {
        try {
            // Pollinations Image API: GET https://image.pollinations.ai/prompt/{prompt}
            // We add a random seed to ensure fresh images for same prompts
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true`;

            // Verify the image URL works (optional, but good practice)
            // For now, we'll just return the URL as Pollinations generates on the fly

            return imageUrl;
        } catch (error) {
            console.error('❌ Pollinations Image API error:', error);
            throw new Error(`Image generation failed: ${error.message}`);
        }
    }

    async analyzeImage(imageFile, prompt) {
        throw new Error('Image analysis is not available with these models. Please use Puter.js vision models for image analysis.');
    }
}

// Global instance
const pollinationsIntegration = new PollinationsIntegration();
