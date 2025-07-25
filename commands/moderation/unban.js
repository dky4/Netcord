const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a user.')
        .addStringOption(option =>
            option
                .setName('userid')
                .setDescription('The ID of the user to unban')
                .setRequired(true)
        ),
    async execute(interaction) {
        const userId = interaction.options.getString('userid');

        // Check if the user has the 'Ban Members' permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        // Check if the bot has the 'Ban Members' permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'I do not have permission to unban members. Ask an admin to grant it.', ephemeral: true });
        }

        try {
            await interaction.guild.members.unban(userId);
            return interaction.reply({ content: `Successfully unbanned user with ID ${userId}.` });
        } catch (error) {
            console.error('Error unbanning user:', error);
            return interaction.reply({ content: 'There was an error trying to unban this user. Please make sure the ID is correct.', ephemeral: true });
        }
    },
};
