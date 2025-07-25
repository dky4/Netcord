const { SlashCommandBuilder, PermissionFlagsBits} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up the CGC system for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to use for CGC messages')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const channelId = channel.id;
            const serverId = channel.guild.id;

            const banlistPath = path.join(process.cwd(), 'ncBanList.json');
            const banlist = JSON.parse(fs.readFileSync(banlistPath, 'utf8'));
            
            if (banlist.bannedServers.includes(serverId)) {
                return interaction.reply({
                    content: 'This server is banned from using Netcord!',
                    ephemeral: true
                });
            }

            const cgcPath = path.join(process.cwd(), 'cgcChannelList.json');
            const cgcList = JSON.parse(fs.readFileSync(cgcPath, 'utf8'));

            if (cgcList.channels.includes(channelId)) {
                return interaction.reply({
                    content: 'This server is already set up for Netcord!',
                    ephemeral: true
                });
            }

            cgcList.channels.push(channelId);

            fs.writeFileSync(cgcPath, JSON.stringify(cgcList, null, 4));

            await interaction.reply({
                content: `Successfully set up CGC system in channel ${channel}!`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error setting up CGC:', error);
            await interaction.reply({
                content: 'There was an error setting up the CGC system. Please try again.',
                ephemeral: true
            });
        }
    },
};
