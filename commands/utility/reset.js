const {SlashCommandBuilder} = require('discord.js');
const {resetConversationHistory} = require('../../conversation');
const {botOwners} = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Resets LunaAI\'s conversation history'),
    async execute(interaction) {
        try {
            const member = interaction.member;

            // Check if the user is a server admin or a bot owner
            const isServerAdmin = member.permissions.has('ADMINISTRATOR');
            const isBotOwner = botOwners.includes(interaction.user.id);

            if (isServerAdmin || isBotOwner) {
                resetConversationHistory();
                await interaction.reply('Conversation history has been reset.');
            } else {
                await interaction.reply('You do not have permission to use this command.');
            }
        } catch (error) {
            console.error('Error executing reset command:', error);
            await interaction.reply('There was an error executing this command!');
        }
    },
};
