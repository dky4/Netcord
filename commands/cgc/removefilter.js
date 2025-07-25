const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removefilter')
        .setDescription('Remove a server filter')
        .addStringOption(option =>
            option.setName('target_server_id')
                .setDescription('The ID of the server to remove from filters')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const targetServerId = interaction.options.getString('target_server_id');
            const sourceServerId = interaction.guild.id;

            const filtersPath = path.join(process.cwd(), 'serverFilters.json');
            const serverFilters = JSON.parse(fs.readFileSync(filtersPath, 'utf8'));

            if (!serverFilters.filters[sourceServerId] || 
                !serverFilters.filters[sourceServerId].includes(targetServerId)) {
                return interaction.reply({
                    content: `No filter found for server ${targetServerId}!`,
                    ephemeral: true
                });
            }

            serverFilters.filters[sourceServerId] = serverFilters.filters[sourceServerId]
                .filter(id => id !== targetServerId);

            if (serverFilters.filters[sourceServerId].length === 0) {
                delete serverFilters.filters[sourceServerId];
            }

            fs.writeFileSync(filtersPath, JSON.stringify(serverFilters, null, 4));

            await interaction.reply({
                content: `Successfully removed filter for server ${targetServerId}!`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error removing filter:', error);
            await interaction.reply({
                content: 'There was an error removing the filter. Please try again.',
                ephemeral: true
            });
        }
    },
}; 