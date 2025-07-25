const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ncban')
        .setDescription('Ban a server from using the CGC system')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('The ID of the server to ban')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config.json'), 'utf8'));
            if (!config.botStaff.includes(interaction.user.id)) {
                return interaction.reply({
                    content: 'You do not have permission to use this command!',
                    ephemeral: true
                });
            }

            const serverId = interaction.options.getString('server_id');

            const banlistPath = path.join(process.cwd(), 'ncBanList.json');
            const banlist = JSON.parse(fs.readFileSync(banlistPath, 'utf8'));

            if (banlist.banned_servers.includes(serverId)) {
                return interaction.reply({
                    content: `Server ${serverId} is already banned!`,
                    ephemeral: true
                });
            }

            banlist.banned_servers.push(serverId);

            const cgcPath = path.join(process.cwd(), 'cgcChannelList.json');
            const cgcList = JSON.parse(fs.readFileSync(cgcPath, 'utf8'));
            
            if (cgcList.channels.includes(serverId)) {
                cgcList.channels = cgcList.channels.filter(id => id !== serverId);
                fs.writeFileSync(cgcPath, JSON.stringify(cgcList, null, 4));
            }

            fs.writeFileSync(banlistPath, JSON.stringify(banlist, null, 4));

            await interaction.reply({
                content: `Successfully banned server ${serverId} from the CGC system!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error banning server:', error);
            await interaction.reply({
                content: 'There was an error banning the server. Please try again.',
                ephemeral: true
            });
        }
    },
}; 