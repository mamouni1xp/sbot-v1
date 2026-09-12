require('dotenv').config(); // Load .env variables

const { Client, RichPresence } = require('discord.js-selfbot-v13');
const client = new Client({ checkUpdate: false });
const OWNER_ID = process.env.OWNER_ID;
const userEmojis = new Map();
let trackedUserId = null;
let trackedGuildId = null;

const {
    getVoiceConnection,
    joinVoiceChannel,
} = require('@discordjs/voice');

function stopTracking() {
    const connection = trackedGuildId ? getVoiceConnection(trackedGuildId) : null;
    if (connection) connection.destroy();
    trackedUserId = null;
    trackedGuildId = null;
}

function followVoiceUser(state) {
    if (!trackedUserId || state.id !== trackedUserId) return;

    const connection = getVoiceConnection(state.guild.id);
    if (!state.channelId) {
        if (connection) connection.destroy();
        return;
    }

    joinVoiceChannel({
        channelId: state.channelId,
        guildId: state.guild.id,
        adapterCreator: state.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const richPresence = new RichPresence(client)
        .setApplicationId('11548314125367640117')
        .setType('PLAYING')
        .setName('1xp🎮')
        .setDetails('just watching')
        .setState('In a Mission...')
        .setAssetsLargeImage('https://cdn.discordapp.com/attachments/1326195481855918150/1548307427252903936/r_1.gif?ex=6aa69528&is=6aa543a8&hm=bc7d79551036bf25daccdda7c819a8e6259ecd6f4098e9d9522d03c7140ddd23&')
        .setAssetsLargeText('1xp')
        .setStartTimestamp(Date.now())
        .addButton('follow 🎬', 'https://instagram.com/mamouni_1xp')
        .addButton('1xp 💣', 'https://instagram.com/mamouni_1xp');

    client.user.setPresence({ activities: [richPresence] });
});
client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;

    if (userEmojis.has(message.author.id)) {
        await message.react(userEmojis.get(message.author.id));
    }

    if (message.author.id !== OWNER_ID) return;
    if (!message.guild) return;

    if (message.content.startsWith('!zidd')) {
        const user = message.mentions.users.first();
        const customEmoji = message.content.split(' ')[2] || '😎';
        if (user) userEmojis.set(user.id, customEmoji);
    }

    if (message.content.startsWith('!kherej')) {
        const user = message.mentions.users.first();
        if (user && userEmojis.has(user.id)) {
            userEmojis.delete(user.id);
        }
    }

    if (message.content.startsWith('!lista')) {
        console.log(Array.from(userEmojis.entries()));
    }

    if (message.content === '!track') {
        trackedUserId = message.author.id;
        trackedGuildId = message.guild.id;

        const member = message.guild.members.cache.get(trackedUserId);
        if (member?.voice?.channelId) followVoiceUser(member.voice);
    }

    if (message.content === '!sf') {
        stopTracking();
    }

    if (message.content.startsWith('!rwa7')) {
        const channelId = message.content.split(' ')[1];
        if (!channelId) {
            return;
        }

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel || !channel.isVoice()) {
            return;
        }

        joinVoiceChannel({
            channelId: channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });
    }

    if (message.content === '!9awed') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) connection.destroy();
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.guild.id !== trackedGuildId) return;
    followVoiceUser(newState);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});
