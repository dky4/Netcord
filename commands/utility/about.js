const {SlashCommandBuilder, EmbedBuilder, Client, GatewayIntentBits} = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Information about the bot and system'),
    async execute(interaction) {
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        const uptime = formatUptime(interaction.client.uptime);
        const cpuUsage = os.loadavg()[0];

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Netcord - About')
            .setURL('https://getnetcord.xyz/')
            .setDescription('Netcord is a Discord Bot to allow cross-guild communication, moderation, and AI features powered by LunaAI.')
            .setThumbnail('https://cdn.discordapp.com/attachments/1378401595313885184/1378433916448280707/Netcord_Profile_Picture.png?ex=683d3edf&is=683bed5f&hm=852269f2433b2468d1ce96e0870f92a2a24772dabef36498e8ffb2645c103178&size=512')
            .addFields(
                {name: 'Uptime', value: uptime, inline: true},
                {name: 'Memory Usage', value: `${Math.round(used * 100) / 100} MB`, inline: true},
                {name: 'CPU Usage', value: `${cpuUsage.toFixed(2)}% (1 minute average)`, inline: true},
            )
            .setTimestamp()
            .setFooter({
                text: 'Netcord',
                iconURL: 'https://cdn.discordapp.com/attachments/1378401595313885184/1378433916448280707/Netcord_Profile_Picture.png?ex=683d3edf&is=683bed5f&hm=852269f2433b2468d1ce96e0870f92a2a24772dabef36498e8ffb2645c103178&size=512'
            });

        await interaction.reply({embeds: [embed]});
    },
};

function formatUptime(uptime) {
    let totalSeconds = Math.floor(uptime / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    totalSeconds %= (3600 * 24);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
