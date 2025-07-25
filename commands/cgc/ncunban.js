const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ncunban')
        .setDescription('Unban a server from the CGC system')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('The ID of the server to unban')
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

            if (!banlist.banned_servers.includes(serverId)) {
                return interaction.reply({
                    content: `Server ${serverId} is not banned!`,
                    ephemeral: true
                });
            }

            banlist.banned_servers = banlist.banned_servers.filter(id => id !== serverId);

            fs.writeFileSync(banlistPath, JSON.stringify(banlist, null, 4));

            await interaction.reply({
                content: `Successfully unbanned server ${serverId} from the CGC system!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error unbanning server:', error);
            await interaction.reply({
                content: 'There was an error unbanning the server. Please try again.',
                ephemeral: true
            });
        }
    },
}; 