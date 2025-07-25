// I am the worst prompt engineer
const systemPrompt = {
    role: "system",
    content: "You are LunaAI." // removed for public release
};

const searchSystemPrompt = {
    role: "system",
    content: "You are LunaAI. You are able to use web-searching capabilities."
};

let conversationHistory = [systemPrompt];
let searchConversationHistory = [searchSystemPrompt];
const MAX_CONTEXT_TOKENS = 131072;
const MAX_OUTPUT_TOKENS = 32768;
const MAX_INPUT_TOKENS = MAX_CONTEXT_TOKENS - MAX_OUTPUT_TOKENS;

function getConversationHistory() {
    return conversationHistory;
}

function getSearchConversationHistory() {
    return searchConversationHistory;
}

function resetRoomConversationHistory(roomId) {
    roomConversations.set(roomId, [systemPrompt]);
    roomSearchConversations.set(roomId, [searchSystemPrompt]);
}

function resetConversationHistory() {
    conversationHistory = [systemPrompt];
    searchConversationHistory = [searchSystemPrompt];
}

function resetSearchConversationHistory() {
    searchConversationHistory = [searchSystemPrompt];
}

function addUserMessage(displayName, content) {
    conversationHistory.push({ role: "user", content: `${displayName}: ${content}` });
}

function addSearchUserMessage(displayName, content) {
    searchConversationHistory.push({ role: "user", content: `${displayName}: ${content}` });
}

function addSearchSystemMessage(content) {
    searchConversationHistory.push({ role: "system", content: 'The search results to process are:' + content});
}

function addAssistantMessage(content) {
    conversationHistory.push({ role: "assistant", content });
}

function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

function trimConversationHistory(messages) {
    const systemPrompt = messages[0];
    let tokensUsed = estimateTokens(systemPrompt.content);
    let trimmedMessages = [systemPrompt];

    for (let i = messages.length - 1; i > 0; i--) {
        const messageTokens = estimateTokens(messages[i].content);
        if (tokensUsed + messageTokens > MAX_INPUT_TOKENS) break;
        trimmedMessages.unshift(messages[i]);
        tokensUsed += messageTokens;
    }
    return trimmedMessages;
}

module.exports = { 
    getConversationHistory, 
    getSearchConversationHistory,
    addUserMessage, 
    addAssistantMessage, 
    resetConversationHistory, 
    resetSearchConversationHistory,
    resetRoomConversationHistory,
    addSearchUserMessage, 
    addSearchSystemMessage,
    trimConversationHistory,
};