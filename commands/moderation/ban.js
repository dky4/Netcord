const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to ban')
                .setRequired(true)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const member = interaction.guild.members.cache.get(user.id);

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'I do not have permission to ban members. Ask an admin to grant it.', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: 'User not found.', ephemeral: true });
        }

        try {
            await member.ban();
            return interaction.reply({ content: `Successfully banned ${user.tag}.` });
        } catch (error) {
            console.error('Error banning user:', error);
            return interaction.reply({ content: 'There was an error trying to ban this user.', ephemeral: true });
        }
    },
};
