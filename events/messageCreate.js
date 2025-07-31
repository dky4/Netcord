const {Events, EmbedBuilder} = require('discord.js');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
const {
    getConversationHistory,
    getSearchConversationHistory,
    resetConversationHistory,
    resetSearchConversationHistory,
    addUserMessage,
    addAssistantMessage,
    addSearchUserMessage,
    addSearchSystemMessage,
    trimConversationHistory,
} = require('../conversation');
const {webSearch} = require('../search');
//const http = require('http');
//const querystring = require('querystring');
//const url = require('url');
//const {AutoProcessor, AutoTokenizer, Moondream1ForConditionalGeneration, RawImage} = import('@xenova/transformers');

const MAX_CONTEXT_TOKENS = 131072;
const MAX_OUTPUT_TOKENS = 32768;

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

let lunaChannelList = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "lunaChannelList.json"), "utf8")
);

let cgcChannelList = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "cgcChannelList.json"), "utf8")
);

let serverFilters = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "serverFilters.json"), "utf8")
);

const config = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "config.json"), "utf8")
);

let roomsList = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "roomsList.json"), "utf8")
);

// I have no idea what this is doing, but it works, so I'm not gonna touch it
const safeJSONParse = (data) => {
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
};

const updateList = (filePath, variableName) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = safeJSONParse(data);
        if (parsed) {
            switch (variableName) {
                case 'lunaChannelList':
                    lunaChannelList = parsed;
                    break;
                case 'cgcChannelList':
                    cgcChannelList = parsed;
                    break;
                case 'serverFilters':
                    serverFilters = parsed;
                    break;
                case 'roomsList':
                    roomsList = parsed;
                    break;
            }
            console.log(`Updated ${variableName} from file changes`);
        }
    } catch (error) {
        console.error(`Error updating ${variableName}:`, error);
    }
};

const watchFiles = () => {
    const files = [
        {path: path.join(process.cwd(), "lunaChannelList.json"), name: 'lunaChannelList'},
        {path: path.join(process.cwd(), "cgcChannelList.json"), name: 'cgcChannelList'},
        {path: path.join(process.cwd(), "serverFilters.json"), name: 'serverFilters'},
        {path: path.join(process.cwd(), "roomsList.json"), name: 'roomsList'}
    ];

    files.forEach(file => {
        fs.watch(file.path, (eventType, filename) => {
            if (eventType === 'change') {
                console.log(`File ${filename} has been changed`);
                updateList(file.path, file.name);
            }
        });
    });
};

watchFiles();

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;

        let currentRoom = null;
        for (const [key, channels] of Object.entries(roomsList)) {
            if (channels.includes(message.channel.id)) {
                currentRoom = key;
                console.log("Found channel in room:", key);
                break;
            }
        }

        if (lunaChannelList.channels.includes(message.channel.id)) try {
            if (message.content.startsWith('//')) return;

            const searchTriggerPatterns = [
                /\b(news|latest|breaking)\b/i,
                /\b(weather|forecast|temperature|rain|snow)\b/i,
                /\b(who won|score|scores|standings|result)\b/i,
                /\b(stock|price|value|market|crypto|bitcoin|eth)\b/i,
                /\b(flight|airline|status|delayed)\b/i,
                /\b(release date|coming out|when is .* releasing?)\b/i,
                /\b(available|in stock|sold out|preorder)\b/i,
                /\b(schedule|event time|kickoff|start time)\b/i,
                /\b(near me|closest|open now|nearby|local)\b/i,
                /\b(browse|browsing capabilities|check the web|look up|search)\b/i
            ];

            let needsWebSearch = searchTriggerPatterns.some(pattern => pattern.test(message.content));

            if (!needsWebSearch) {
                // fallback
                const classificationPrompt = [
                    {
                        role: 'system',
                        content: 'Determine if the user\'s message requires a web search to provide a current or accurate answer. Respond with "yes" or "no".'
                    },
                    { role: 'user', content: message.content }
                ];

                const classificationResponse = await openai.chat.completions.create({
                    model: "llama-3.1-8b-instant",
                    messages: classificationPrompt,
                    max_tokens: 10,
                    temperature: 0.3,
                });

                const classificationResult = classificationResponse.choices[0].message.content.trim().toLowerCase();
                if (classificationResult === 'yes') {
                    needsWebSearch = true;
                }
            }

            if (needsWebSearch === true) {
                console.log("Searching the web..")
                const query = message.content;
                const searchResults = await webSearch(query);
                const topResults = searchResults.slice(0, 5);
                const mergedResults = topResults.map(result => `${result.title}: ${result.snippet} [${result.link}]`).join('\n\n');

                addSearchUserMessage(message.author.displayName, message);
                addUserMessage(message.author.displayName, message);
                addSearchSystemMessage(mergedResults);

                let conversationHistory = trimConversationHistory(getSearchConversationHistory());

                const gptResponse = await openai.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: conversationHistory,
                    max_tokens: 1024,
                    temperature: 0.7,
                    top_p: 1,
                    presence_penalty: 0,
                    frequency_penalty: 0.5,
                });

                console.log("API response:", gptResponse);

                if (gptResponse.choices && gptResponse.choices.length > 0) {
                    const botResponse = gptResponse.choices[0].message.content;
                    addAssistantMessage(botResponse);
                    resetSearchConversationHistory();
                    await message.reply(botResponse.length > 2000 ? botResponse.slice(0, 2000) : botResponse);
                } else {
                    console.error("No choices found in OpenAI API response:", gptResponse);
                    await message.reply("I'm sorry, I couldn't generate a response. Please try again.");
                    resetSearchConversationHistory();
                }
            } else {
                console.log("Doing normal request.")
                addUserMessage(message.author.displayName, message.content);

                let conversationHistory = trimConversationHistory(getConversationHistory());

                const gptResponse = await openai.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: conversationHistory,
                    max_tokens: 2048,
                    temperature: 0.7,
                    top_p: 1,
                    presence_penalty: 0,
                    frequency_penalty: 0.5,
                });

                console.log("API response:", gptResponse);

                if (gptResponse.choices && gptResponse.choices.length > 0) {
                    const botResponse = gptResponse.choices[0].message.content;
                    addAssistantMessage(botResponse);
                    await message.reply(botResponse.length > 2000 ? botResponse.slice(0, 2000) : botResponse);
                } else {
                    console.error("No choices found in OpenAI API response:", gptResponse);
                    await message.reply("I'm sorry, I couldn't generate a response. Please try again.");
                }
            }
        } catch (error) {
            console.error("Error with OpenAI API request:", error);
            await message.reply("I'm sorry, there was an error processing your request. Please try again later.");
        } else {
            if (!cgcChannelList.channels.includes(message.channel.id)) return;

            const attachment = message.attachments.first();
            const attachmentUrl = attachment ? attachment.url : null;
            let username = message.author.username;
            let botResponse = null;
            const badge = determineBadge(message.member.id);
            const channel = message.channel;

            const extractMediaUrl = async (content) => {
                if (!content) return null;

                // tenor
                const tenorMatch = content.match(/https?:\/\/(?:www\.)?tenor\.com\/view\/[^\s]+/);
                if (tenorMatch) {
                    const tenorUrl = tenorMatch[0];
                    try {
                        const response = await fetch(tenorUrl);
                        if (!response.ok) throw new Error(`Failed to fetch Tenor page: ${response.statusText}`);
                        const html = await response.text();

                        const videoMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/);
                        const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);

                        if (videoMatch && videoMatch[1]) return videoMatch[1];
                        if (imageMatch && imageMatch[1]) return imageMatch[1];

                    } catch (error) {
                        console.error('Error scraping Tenor media URL:', error);
                    }
                }


                // direct
                const imageMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|webm)(?:\?[^\s]*)?/i);
                if (imageMatch) return imageMatch[0];

                return null;
            };

            // cache
            const cacheMedia = async (url) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

                    const contentType = response.headers.get('content-type');
                    const extension = contentType.split('/')[1] || 'jpg';
                    const tempPath = path.join(process.cwd(), 'temp', `temp_${Date.now()}.${extension}`);

                    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
                        fs.mkdirSync(path.join(process.cwd(), 'temp'));
                    }

                    const buffer = await response.buffer();
                    fs.writeFileSync(tempPath, buffer);
                    return {path: tempPath, isVideo: extension === 'mp4'};
                } catch (error) {
                    console.error('Error downloading media:', error);
                    return null;
                }
            };

            // remove files
            const cleanupTempFiles = async (filePath) => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (error) {
                    console.error('Error cleaning up file:', error);
                }
            };

            let description = message.content || 'No text content';
            if (message.reference && message.reference.messageId) {
                const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
                if (referencedMessage) {
                    if (referencedMessage.author.bot && referencedMessage.embeds.length > 0) {
                        const embed = referencedMessage.embeds[0];
                        const authorName = embed.author ? embed.author.name : 'Unknown';
                        const embedContent = embed.description || 'No content';
                        description = `Replying to ${authorName}:\n> ${embedContent}\n\n${description}`;
                    } else {
                        description = `Replying to ${referencedMessage.author.username}:\n> ${referencedMessage.content}\n\n${description}`;
                    }
                }
            }

            const mediaUrl = await extractMediaUrl(message.content);
            let tempFile = null;

            // cache
            if (attachment) {
                tempFile = await cacheMedia(attachmentUrl);
            }

            const embedMessage = determineContent(tempFile, description);
            const crossGuildEmbed = new EmbedBuilder()
                .setColor(5793266)
                .setFooter({
                    text: message.guild.name + " #" + message.channel.name + " • Netcord Stable",
                    iconURL: message.guild.iconURL(),
                })
                .setDescription(embedMessage)
                .setImage(tempFile && !tempFile.isVideo ? `attachment://${path.basename(tempFile.path)}` : mediaUrl)
                .setThumbnail(
                    "https://cdn.discordapp.com/icons/1213558508398579742/d73f54243a2f8b70389ee671ff138421.webp?size=48"
                )
                .setTimestamp()
                .setAuthor({
                    name: message.member.displayName + " (" + username + ")" + badge,
                    iconURL: message.author.displayAvatarURL(),
                });

            message.delete()

            if (currentRoom) {
                for (const channelId of roomsList[currentRoom]) {
                    try {
                        const targetChannel = await message.client.channels.cache.get(channelId);
                        if (targetChannel) {
                            // filtering
                            const sourceServerId = message.guild.id;
                            const targetServerId = targetChannel.guild.id;
                            
                            if (serverFilters.filters[targetServerId] && 
                                serverFilters.filters[targetServerId].includes(sourceServerId)) {
                                console.log(`Skipping message from server ${sourceServerId} to server ${targetServerId} due to filter`);
                                continue;
                            }

                            await targetChannel.send({
                                embeds: [crossGuildEmbed],
                                files: tempFile && !tempFile.isVideo ? [tempFile.path] : []
                            });

                            // video
                            if (tempFile && tempFile.isVideo) {
                                await targetChannel.send({
                                    files: [tempFile.path]
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error sending message to channel ${channelId}:`, error);
                    }
                }
            } else {
                for (const channelId of cgcChannelList.channels) {
                    let isInRoom = false;
                    for (const [key, channels] of Object.entries(roomsList)) {
                        if (channels.includes(channelId)) {
                            isInRoom = true;
                            break;
                        }
                    }
                    if (isInRoom) continue;

                    try {
                        const targetChannel = await message.client.channels.cache.get(channelId);
                        if (targetChannel) {
                            // filtering
                            const sourceServerId = message.guild.id;
                            const targetServerId = targetChannel.guild.id;
                            
                            if (serverFilters.filters[targetServerId] && 
                                serverFilters.filters[targetServerId].includes(sourceServerId)) {
                                console.log(`Skipping message from server ${sourceServerId} to server ${targetServerId} due to filter`);
                                continue;
                            }

                            await targetChannel.send({
                                embeds: [crossGuildEmbed],
                                files: tempFile && !tempFile.isVideo ? [tempFile.path] : []
                            });

                            // video
                            if (tempFile && tempFile.isVideo) {
                                await targetChannel.send({
                                    files: [tempFile.path]
                                });
                            }
                        } else {
                            console.error(`Could not find channel with ID: ${channelId}`);
                        }
                    } catch (error) {
                        console.error(`Error sending message to channel ${channelId}:`, error);
                    }
                }
            }

            if (tempFile) {
                await cleanupTempFiles(tempFile.path);
            }

            if (message.content.startsWith('/luna')) {
                const searchTriggerPatterns = [
                    /\b(news|latest|breaking)\b/i,
                    /\b(weather|forecast|temperature|rain|snow)\b/i,
                    /\b(who won|score|scores|standings|result)\b/i,
                    /\b(stock|price|value|market|crypto|bitcoin|eth)\b/i,
                    /\b(flight|airline|status|delayed)\b/i,
                    /\b(release date|coming out|when is .* releasing?)\b/i,
                    /\b(available|in stock|sold out|preorder)\b/i,
                    /\b(schedule|event time|kickoff|start time)\b/i,
                    /\b(near me|closest|open now|nearby|local)\b/i,
                    /\b(browse|browsing capabilities|check the web|look up|search)\b/i
                ];

                let needsWebSearch = searchTriggerPatterns.some(pattern => pattern.test(message.content));

                if (!needsWebSearch) {
                    // fallback
                    const classificationPrompt = [
                        {
                            role: 'system',
                            content: 'Determine if the user\'s message requires a web search to provide a current or accurate answer. Respond with "yes" or "no".'
                        },
                        { role: 'user', content: message.content }
                    ];

                    const classificationResponse = await openai.chat.completions.create({
                        model: "llama-3.1-8b-instant",
                        messages: classificationPrompt,
                        max_tokens: 10,
                        temperature: 0.3,
                    });

                    const classificationResult = classificationResponse.choices[0].message.content.trim().toLowerCase();
                    if (classificationResult === 'yes') {
                        needsWebSearch = true;
                    }
                }

                if (needsWebSearch === true) {
                    console.log("Searching the web..")
                    const query = message.content;
                    const searchResults = await webSearch(query);
                    const topResults = searchResults.slice(0, 5);
                    const mergedResults = topResults.map(result => `${result.title}: ${result.snippet} [${result.link}]`).join('\n\n');

                    addSearchUserMessage(message.author.displayName, message);
                    addUserMessage(message.author.displayName, message);
                    addSearchSystemMessage(mergedResults);

                    let conversationHistory = trimConversationHistory(getSearchConversationHistory());

                    const gptResponse = await openai.chat.completions.create({
                        model: "llama-3.3-70b-versatile",
                        messages: conversationHistory,
                        max_tokens: 1024,
                        temperature: 0.7,
                        top_p: 1,
                        presence_penalty: 0,
                        frequency_penalty: 0.5,
                    });

                    console.log("API response:", gptResponse);

                    if (gptResponse.choices && gptResponse.choices.length > 0) {
                        botResponse = gptResponse.choices[0].message.content;
                        addAssistantMessage(botResponse);
                        resetSearchConversationHistory()
                    } else {
                        console.error("No choices found in OpenAI API response:", gptResponse);
                        await message.reply("I'm sorry, I couldn't generate a response. Please try again.");
                        resetSearchConversationHistory();
                    }
                } else {
                    console.log("Doing normal request.")
                    addUserMessage(message.author.displayName, message.content);

                    let conversationHistory = trimConversationHistory(getConversationHistory());

                    const gptResponse = await openai.chat.completions.create({
                        model: "llama-3.3-70b-versatile",
                        messages: conversationHistory,
                        max_tokens: 2048,
                        temperature: 0.7,
                        top_p: 1,
                        presence_penalty: 0,
                        frequency_penalty: 0.5,
                    });

                    console.log("API response:", gptResponse);

                    if (gptResponse.choices && gptResponse.choices.length > 0) {
                        botResponse = gptResponse.choices[0].message.content;
                        addAssistantMessage(botResponse);
                    } else {
                        console.error("No choices found in OpenAI API response:", gptResponse);
                        await message.reply("I'm sorry, I couldn't generate a response. Please try again.");
                    }
                }
                const lunaCrossGuildEmbed = new EmbedBuilder()
                    .setColor(5793266)
                    .setFooter({
                        text: message.guild.name + " #" + message.channel.name + " • Netcord Stable",
                        iconURL: message.guild.iconURL(),
                    })
                    .setDescription(botResponse ? (botResponse.length > 2000 ? botResponse.slice(0, 2000) : botResponse) : 'No text content')
                    .setImage(attachmentUrl)
                    .setThumbnail(
                        "https://cdn.discordapp.com/icons/1213558508398579742/d73f54243a2f8b70389ee671ff138421.webp?size=48"
                    )
                    .setTimestamp()
                    .setAuthor({
                        name: "LunaAI" + " (" + "lunaai" + ")" + " [✨]",
                        iconURL: "https://avatars.githubusercontent.com/u/165191720?s=400&u=ad3a184029853e132028fef114f481ba5abd8b97&v=4",
                    });

                for (const channelId of cgcChannelList.channels) {
                    let isInRoom = false;
                    for (const [key, channels] of Object.entries(roomsList)) {
                        if (channels.includes(channelId)) {
                            isInRoom = true;
                            break;
                        }
                    }
                    if (isInRoom) continue;
                    try {
                        const targetChannel = await message.client.channels.cache.get(channelId);
                        if (targetChannel) {
                            await targetChannel.send({embeds: [lunaCrossGuildEmbed]});
                        } else {
                            console.error(`Could not find channel with ID: ${channelId}`);
                        }
                    } catch (error) {
                        console.error(`Error sending message to channel ${channelId}:`, error);
                    }
                }
            }
        }
    },
};

function determineBadge(userID) {
    if (config.botOwners.includes(userID)) {
        return " [👑]";
    } else if (config.botTeam.includes(userID)) {
        return " [💻]";
    } else if (config.botStaff.includes(userID)) {
        return " [🔨]";
   // } else if (userID == "759125592196644915") {
      //  return " [🌐]";
    } else {
        return "";
    }
}

function determineContent(tempFile, description) {
    if (tempFile && tempFile.isVideo) {
        return description + "\n\nThere is a video attached to this message below.";
    } else {
        return description;
    }
}