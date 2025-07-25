const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {botOwners} = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript code.'),
    async execute(interaction) {

        if (!botOwners.includes(interaction.user.id)) return;
        //if (interaction.user.id !== "1270661265202872333") return; // Rose's ID

        const modal = new ModalBuilder()
            .setCustomId('evalModal')
            .setTitle('Evaluate JavaScript Code');

        const codeInput = new TextInputBuilder()
            .setCustomId('codeInput')
            .setLabel("Enter JavaScript Code")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("console.log('Hello, world!');")
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(codeInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    },
    async modalHandler(interaction) {
        if (interaction.customId === 'evalModal') {
            const code = interaction.fields.getTextInputValue('codeInput');
            let result;

            try {
                result = eval(code);
                if (typeof result !== 'string') {
                    result = require('util').inspect(result);
                }
            } catch (error) {
                result = error.toString();
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Eval Result')
                .setDescription(`\`\`\`js\n${result}\n\`\`\``)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};