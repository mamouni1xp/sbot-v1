require('dotenv').config(); // Load .env variables

const { Client } = require('discord.js-selfbot-v13');
const client = new Client({ checkUpdate: false });
const OWNER_ID = process.env.OWNER_ID;
const userEmojis = new Map();

// Helper function to send auto-deleting messages
async function sendTempMessage(channel, content, options = {}) {
    try {
        console.log('Sending temporary message:', content);
        const msg = await channel.send(content);
        setTimeout(() => {
            msg.delete().catch(err => console.error('Failed to delete message:', err));
        }, 5000); // Delete after 5 seconds
        return msg;
    } catch (error) {
        console.error('Error sending temporary message:', error);
    }
}

// Help command content
const helpContent = `
**Available Commands:**
🔹 !aya - Shows this help message
🔹 !zidd @user [emoji] - Add user to auto-react list with optional custom emoji
🔹 !kherej @user - Remove user from auto-react list
🔹 !lista - Show all users in auto-react list
🔹 !ayanavc [channel_id] - Join a voice channel
🔹 !9ayana - Leave current voice channel

Note: All commands are owner-only except !help
`;

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
        client.user.setActivity("1", { 
            type: "STREAMING", 
            url: "https://www.twitch.tv/mamouni_1xp" 
        });
        console.log(`✅ Status set to Streaming`);
    } catch (error) {
        console.error("❌ Error setting status:", error);
    }
});

// List of automatic replies
const autoReplies = {
    "iibaki": "oui",
};

client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;

    // Help command
    if (message.content === '!aya') {
        console.log('Help command received');
        await sendTempMessage(message.channel, helpContent);
        console.log('Help message sent');
        return;
    }

    // Auto-reply based on specific keywords
    for (const [trigger, reply] of Object.entries(autoReplies)) {
        if (message.content.toLowerCase().includes(trigger)) {
            await sendTempMessage(message.channel, reply);
        }
    }

    // Auto-react to specific users
    if (userEmojis.has(message.author.id)) {
        await message.react(userEmojis.get(message.author.id));
    }

    // Owner-only commands
    if (message.author.id === OWNER_ID) {
        const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

        if (message.content.startsWith('!zidd')) {
            const user = message.mentions.users.first();
            const customEmoji = message.content.split(' ')[2] || '😎';

            if (user) {
                userEmojis.set(user.id, customEmoji);
                await sendTempMessage(message.channel, 
                    `✅sf zedt${user.tag} m3a had lemoji${customEmoji}`);
            } else {
                await sendTempMessage(message.channel, 
                    "⚠️ makhtarit walou ");
            }
        }

        if (message.content.startsWith('!kherej')) {
            const user = message.mentions.users.first();
            if (user && userEmojis.has(user.id)) {
                userEmojis.delete(user.id);
                await sendTempMessage(message.channel,
                    `❌ sf marantfa3elx m3a hada ${user.tag} `);
            } else {
                await sendTempMessage(message.channel,
                    "⚠️ had khona makaynch flista.");
            }
        }

        if (message.content.startsWith('!lista')) {
            if (userEmojis.size === 0) {
                await sendTempMessage(message.channel,
                    "⚠️makayn 7ta wa7ed");
            } else {
                const userList = Array.from(userEmojis.entries())
                    .map(([userId, emoji]) => `<@${userId}> → ${emoji}`);
                await sendTempMessage(message.channel,
                    `✅lista nta3 7babi\n${userList.join("\n")}`);
            }
        }

        if (message.content.startsWith('!ayanavc')) {
            const args = message.content.split(' ')[1];
            if (args) {
                const channel = message.guild.channels.cache.get(args);
                if (channel && channel.isVoice()) {
                    try {
                        joinVoiceChannel({
                            channelId: channel.id,
                            guildId: message.guild.id,
                            adapterCreator: message.guild.voiceAdapterCreator,
                        });
                        await sendTempMessage(message.channel,
                            `sf dkholt: ${channel.name}`);
                    } catch (error) {
                        console.error('Error joining VC:', error);
                        await sendTempMessage(message.channel,
                            '❌ ma9dertch ndkhol.');
                    }
                } else {
                    await sendTempMessage(message.channel,
                        '⚠️id makhedamx akhona.');
                }
            } else {
                await sendTempMessage(message.channel,
                    '⚠️ 3tini id khedam.');
            }
        }

        if (message.content === '!9ayana') {
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.destroy();
                await sendTempMessage(message.channel,
                    '✅ sf khrejt channel.');
            } else {
                await sendTempMessage(message.channel,
                    '⚠️ madakhel l7ta vc.');
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});
