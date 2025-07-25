const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isModalSubmit()) {
            const command = interaction.client.commands.get('eval');

            if (!command || !command.modalHandler) {
                console.error(`No modal handler found for command eval.`);
                return;
            }

            try {
                await command.modalHandler(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while handling the modal!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while handling the modal!', ephemeral: true });
                }
            }
        }
    },
};
