const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addfilter')
        .setDescription('Add a server filter to prevent messages from another server going to this server')
        .addStringOption(option =>
            option.setName('target_server_id')
                .setDescription('The ID of the server to filter messages to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const targetServerId = interaction.options.getString('target_server_id');
            const sourceServerId = interaction.guild.id;

            const filtersPath = path.join(process.cwd(), 'serverFilters.json');
            const serverFilters = JSON.parse(fs.readFileSync(filtersPath, 'utf8'));

            if (!serverFilters.filters[sourceServerId]) {
                serverFilters.filters[sourceServerId] = [];
            }

            if (serverFilters.filters[sourceServerId].includes(targetServerId)) {
                return interaction.reply({
                    content: `Filter for server ${targetServerId} already exists!`,
                    ephemeral: true
                });
            }

            serverFilters.filters[sourceServerId].push(targetServerId);

            fs.writeFileSync(filtersPath, JSON.stringify(serverFilters, null, 4));

            await interaction.reply({
                content: `Successfully added filter for server ${targetServerId}!`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error adding filter:', error);
            await interaction.reply({
                content: 'There was an error adding the filter. Please try again.',
                ephemeral: true
            });
        }
    },
}; 