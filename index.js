require('dotenv').config(); // Load .env variables


process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
    if (err instanceof TypeError && err.message.includes('ApplicationFlags is not a constructor')) {
        console.warn('⚠️ Known library bug hit (ApplicationFlags) — message skipped, bot still running.');
        return;
    }
    console.error('❌ Uncaught exception:', err);

});


try {
    const flagsPath = require.resolve('discord.js-selfbot-v13/src/util/ApplicationFlags.js');
    const exported = require(flagsPath);
    const isBroken = typeof exported !== 'function' && typeof exported?.ApplicationFlags !== 'function';
    if (isBroken) {
        console.warn('⚠️ Patching broken ApplicationFlags export from discord.js-selfbot-v13');
        class ApplicationFlagsPatch {
            constructor(bits) { this.bitfield = bits; }
            has() { return false; }
            toArray() { return []; }
        }
        require.cache[flagsPath].exports = ApplicationFlagsPatch;
    }
} catch (err) {
    console.warn('⚠️ Could not pre-patch ApplicationFlags (path may differ in your version):', err.message);
}

const { Client, RichPresence } = require('discord.js-selfbot-v13');
const client = new Client({ checkUpdate: false });

// --- Required env vars, checked up front instead of failing deep inside login() ---
const OWNER_ID = process.env.OWNER_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is missing from your environment/.env file. Exiting.');
    process.exit(1);
}
if (!OWNER_ID) {
    console.warn('⚠️ OWNER_ID is not set — owner-only commands will never match anyone.');
}

const userEmojis = new Map();
let trackedUserId = null;
let trackedGuildId = null;

const {
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
} = require('@discordjs/voice');

// Attach error/state handling to a voice connection so its internal
// EventEmitter never throws an unhandled 'error' and so dead connections
// get cleaned up instead of leaking.
function wireConnection(connection) {
    connection.on('error', (err) => {
        console.error('❌ Voice connection error:', err.message);
    });

    connection.on('stateChange', (oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Disconnected) {
            // Try to recover briefly; if it doesn't reconnect, destroy cleanly.
            Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]).catch(() => {
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                }
            });
        }
    });

    return connection;
}

function safeJoinVoiceChannel(options) {
    try {
        const connection = joinVoiceChannel(options);
        wireConnection(connection);
        return connection;
    } catch (err) {
        console.error('❌ Failed to join voice channel:', err.message);
        return null;
    }
}

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

    safeJoinVoiceChannel({
        channelId: state.channelId,
        guildId: state.guild.id,
        adapterCreator: state.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    try {
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
    } catch (err) {
        // A bad/expired asset URL or malformed presence shouldn't kill the bot
        console.error('❌ Failed to set presence:', err.message);
    }
});

// Surface client-level errors instead of letting them become uncaught
// exceptions (EventEmitter throws synchronously if 'error' has no listener).
client.on('error', (err) => {
    console.error('❌ Client error:', err.message);
});
client.on('warn', (info) => {
    console.warn('⚠️ Client warning:', info);
});

// If the gateway drops and discord.js-selfbot-v13 gives up reconnecting,
// this fires. Log it clearly rather than silently going dark.
client.on('invalidated', () => {
    console.error('❌ Session invalidated — token may have been reset/logged out elsewhere. Restart required.');
});
client.on('disconnect', () => {
    console.warn('⚠️ Client disconnected from gateway.');
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

        // !track <server_id> — track the owner's voice channel in a given guild
        if (message.content.startsWith('!track')) {
            const args = message.content.split(' ');
            const guildId = args[1] || message.guild.id;

            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                console.log(`⚠️ Guild not found or bot not in it: ${guildId}`);
                return;
            }

            trackedUserId = message.author.id;
            trackedGuildId = guild.id;

            const member = guild.members.cache.get(trackedUserId);
            if (member?.voice?.channelId) followVoiceUser(member.voice);

            console.log(`✅ Tracking ${message.author.tag} in ${guild.name}`);
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

            safeJoinVoiceChannel({
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

            const connection = safeJoinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });
            if (connection) console.log(`✅ Joined ${channel.name} in ${guild.name}`);
        }
    } catch (err) {
       
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


async function loginWithRetry(maxAttempts = 3, delayMs = 5000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await client.login(DISCORD_TOKEN);
            return;
        } catch (err) {
            console.error(`❌ Login attempt ${attempt}/${maxAttempts} failed:`, err.message);
            if (attempt === maxAttempts) {
                console.error('❌ All login attempts failed. Exiting.');
                process.exit(1);
            }
            await new Promise((res) => setTimeout(res, delayMs));
        }
    }
}

loginWithRetry();
