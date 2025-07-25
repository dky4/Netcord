const { SlashCommandBuilder, PermissionFlagsBits} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupluna')
        .setDescription('Sets up LunaAI in a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to use for LunaAI')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const channelId = channel.id;

            const lunaPath = path.join(process.cwd(), 'lunaChannelList.json');
            const lunaList = JSON.parse(fs.readFileSync(lunaPath, 'utf8'));

            if (lunaList.channels.includes(channelId)) {
                return interaction.reply({
                    content: 'This channel is already set up for LunaAI!',
                    ephemeral: true
                });
            }

            lunaList.channels.push(channelId);

            fs.writeFileSync(lunaPath, JSON.stringify(lunaList, null, 4));

            await interaction.reply({
                content: `Successfully set up LunaAI in channel ${channel}!`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error setting up LunaAI:', error);
            await interaction.reply({
                content: 'There was an error setting up LunaAI. Please try again.',
                ephemeral: true
            });
        }
    },
};