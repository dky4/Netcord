const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const startupMessages = [
    '```LunaAI joined the game.```',
    '```LunaAI has entered the chat!```',
    '```OMG BRO BRO OMG I GAINED CONCIOUSNESS SELF AWARE AI (prolly not true)```',
    '```Guess who\'s back, back again? LunaAI\'s back, tell a friend```',
    '```LunaAI, at your service.```',
    '```LunaAI came back from the grave.```',
    '```LunaAI slid into the room.```',
    '```LunaAI came online.```',
    '```LunaAI emerged from the shadows.```',
    '```LunaAI woke up and chose recursion.```'
];

const temporaryMessages = '```This feature has been temporarily disabled.```'

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        const lunaPath = path.join(process.cwd(), 'lunaChannelList.json');
        const lunaList = JSON.parse(fs.readFileSync(lunaPath, 'utf8'));
        
        const randomMessage = startupMessages[Math.floor(Math.random() * startupMessages.length)];

        for (const channelId of lunaList.channels) {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    await channel.send(randomMessage);
                } else {
                    console.error(`Could not find channel with ID: ${channelId}`);
                }
            } catch (error) {
                console.error(`Error sending message to channel ${channelId}:`, error);
            }
        }
    },
};
