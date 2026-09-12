require('dotenv').config(); // Load .env variables

// Catch anything that would otherwise crash the whole process
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
});

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

    try {
        joinVoiceChannel({
            channelId: state.channelId,
            guildId: state.guild.id,
            adapterCreator: state.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });
    } catch (err) {
        console.error('❌ Failed to follow voice user:', err);
    }
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const richPresence = new RichPresence(client)
        .setApplicationId('1547994721581010964')
        .setType('PLAYING')
        .setName('1xp🎮')
        .setDetails('Exploring discord')
        .setState('In a Mission...')
        .setAssetsLargeImage('https://cdn.discordapp.com/attachments/1326195481855918150/1548307427252903936/r_1.gif?ex=6aa69528&is=6aa543a8&hm=bc7d79551036bf25daccdda7c819a8e6259ecd6f4098e9d9522d03c7140ddd23&')
        .setAssetsLargeText('1xp')
        .setStartTimestamp(Date.now())
        .addButton('follow 🎬', 'https://instagram.com/mamouni_1xp')
        .addButton('1xp 💣', 'https://instagram.com/mamouni_1xp');

    client.user.setPresence({ activities: [richPresence] });
});

client.on('messageCreate', async (message) => {
    try {
        if (message.author.id === client.user.id) return;

        if (userEmojis.has(message.author.id)) {
            try {
                await message.react(userEmojis.get(message.author.id));
            } catch (err) {
                console.error('❌ Failed to react (bad emoji?):', err.message);
            }
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
            if (userEmojis.size === 0) {
                await message.channel.send('📭 No users tracked yet.');
            } else {
                const lines = [];
                for (const [userId, emoji] of userEmojis.entries()) {
                    const user = client.users.cache.get(userId);
                    const label = user ? user.tag : userId;
                    lines.push(`${emoji} — ${label} (${userId})`);
                }
                await message.channel.send(`📋 **Tracked reactions:**\n${lines.join('\n')}`);
            }
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
            // v13 has no channel.isVoice(); check the type string instead
            if (!channel || (channel.type !== 'GUILD_VOICE' && channel.type !== 'GUILD_STAGE_VOICE')) {
                return;
            }

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false,
                });
            } catch (err) {
                console.error('❌ Failed to join voice channel:', err);
            }
        }

        if (message.content === '!9awed') {
            const connection = getVoiceConnection(message.guild.id);
            if (connection) connection.destroy();
        }

        // !jc <server_id> <vc_id> — join a voice channel by guild id + channel id
        if (message.content.startsWith('!jc')) {
            const args = message.content.split(' ');
            const guildId = args[1];
            const vcId = args[2];

            if (!guildId || !vcId) {
                console.log('⚠️ Usage: !jc <server_id> <vc_id>');
                return;
            }

            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                console.log(`⚠️ Guild not found or bot not in it: ${guildId}`);
                return;
            }

            const channel = guild.channels.cache.get(vcId);
            if (!channel || (channel.type !== 'GUILD_VOICE' && channel.type !== 'GUILD_STAGE_VOICE')) {
                console.log(`⚠️ Voice channel not found: ${vcId}`);
                return;
            }

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false,
                });
                console.log(`✅ Joined ${channel.name} in ${guild.name}`);
            } catch (err) {
                console.error('❌ Failed to join voice channel via !jc:', err);
            }
        }
    } catch (err) {
        // Last line of defense so a single bad message never kills the whole bot
        console.error('❌ Error handling message:', err);
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        if (newState.guild.id !== trackedGuildId) return;
        followVoiceUser(newState);
    } catch (err) {
        console.error('❌ Error in voiceStateUpdate:', err);
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});
