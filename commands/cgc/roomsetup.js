const { SlashCommandBuilder, PermissionFlagsBits} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roomsetup')
        .setDescription('Set up a channel for a specific room')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to add to the room')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('room')
                .setDescription('The room number (1-10)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10)),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const roomNumber = interaction.options.getInteger('room');
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

            const roomsPath = path.join(process.cwd(), 'roomsList.json');
            let roomsList;
            try {
                roomsList = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
            } catch (error) {
                roomsList = {};
                for (let i = 1; i <= 10; i++) {
                    roomsList[`room${i}Channels`] = [];
                }
            }

            const roomKey = `room${roomNumber}Channels`;

            for (const [key, channels] of Object.entries(roomsList)) {
                if (channels.includes(channelId)) {
                    return interaction.reply({
                        content: `This channel is already set up in ${key}!`,
                        ephemeral: true
                    });
                }
            }

            roomsList[roomKey].push(channelId);

            fs.writeFileSync(roomsPath, JSON.stringify(roomsList, null, 4));

            const cgcPath = path.join(process.cwd(), 'cgcChannelList.json');
            const cgcList = JSON.parse(fs.readFileSync(cgcPath, 'utf8'));

            if (!cgcList.channels.includes(channelId)) {
                cgcList.channels.push(channelId);
                fs.writeFileSync(cgcPath, JSON.stringify(cgcList, null, 4));
            }

            await interaction.reply({
                content: `Successfully added channel ${channel} to Room ${roomNumber}!`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error setting up room:', error);
            await interaction.reply({
                content: 'There was an error setting up the room. Please try again.',
                ephemeral: true
            });
        }
    },
}; 