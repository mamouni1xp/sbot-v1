require('dotenv').config(); // .env 

const { Client } = require('discord.js-selfbot-v13');
const client = new Client({ checkUpdate: false });
const OWNER_ID = process.env.OWNER_ID;
const userEmojis = new Map();

// 5000 = 5s hadi bax yetmess7o lmessag 
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
🔹 !help - Shows this help message
🔹 !zidd @user [emoji] - Add user to auto-react list with optional custom emoji
🔹 !kherej @user - Remove user from auto-react list
🔹 !lista - Show all users in auto-react list
🔹 !ajivc [channel_id] - Join a voice channel
🔹 !9ewedvc - Leave current voice channel

Note: All commands are owner-only except !help
 # by:mamouni_1xp
`;

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
        client.user.setActivity("By mamouni_1xp", { 
            type: "STREAMING", 
            url: "https://www.twitch.tv/mamouni_1xp" 
        });
        console.log(`✅ Status set to Streaming`);
    } catch (error) {
        console.error("❌ Error setting status:", error);
    }
});

// List of automatic replies u can change {mamouni1xp with your user}
const autoReplies = {
    "mamouni1xp": "# chokran 3la lmov 😍", //te9der dir lista twila *after 5s active*
};

client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;

    // Help command 
    if (message.content === '!help') {
        console.log('Help command received');
        await sendTempMessage(message.channel, helpContent);
        console.log('Help message sent');
        return;
    }

    // Auto-reply 
    for (const [trigger, reply] of Object.entries(autoReplies)) {
        if (message.content.toLowerCase().includes(trigger)) {
            await sendTempMessage(message.channel, reply);
        }
    }

    // Auto-react 
    if (userEmojis.has(message.author.id)) {
        await message.react(userEmojis.get(message.author.id));
    }

    // add or del user from auto react 
    if (message.author.id === OWNER_ID) {
        const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

        if (message.content.startsWith('!zidd')) {
            const user = message.mentions.users.first();
            const customEmoji = message.content.split(' ')[2] || '😎';

            if (user) {
                userEmojis.set(user.id, customEmoji);
                await sendTempMessage(message.channel, 
                    `✅ تمت إضافة ${user.tag} مع الايموجي ${customEmoji}`);
            } else {
                await sendTempMessage(message.channel, 
                    "⚠️ لم يتم تحديد المستخدم.");
            }
        }

        if (message.content.startsWith('!kherej')) {
            const user = message.mentions.users.first();
            if (user && userEmojis.has(user.id)) {
                userEmojis.delete(user.id);
                await sendTempMessage(message.channel,
                    `❌ تمت إزالة ${user.tag} من قائمة التفاعل التلقائي.`);
            } else {
                await sendTempMessage(message.channel,
                    "⚠️ هذا المستخدم غير موجود في القائمة.");
            }
        }

        if (message.content.startsWith('!lista')) {
            if (userEmojis.size === 0) {
                await sendTempMessage(message.channel,
                    "⚠️ لا يوجد مستخدمون في قائمة التفاعل التلقائي.");
            } else {
                const userList = Array.from(userEmojis.entries())
                    .map(([userId, emoji]) => `<@${userId}> → ${emoji}`);
                await sendTempMessage(message.channel,
                    `✅ قائمة المستخدمين وايموجياتهم:\n${userList.join("\n")}`);
            }
        }
// vc channel section 
        if (message.content.startsWith('!ajivc')) {
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
                            `✅ Bot has joined the voice channel: ${channel.name}`);
                    } catch (error) {
                        console.error('Error joining VC:', error);
                        await sendTempMessage(message.channel,
                            '❌ Failed to join the voice channel.');
                    }
                } else {
                    await sendTempMessage(message.channel,
                        '⚠️ Invalid voice channel ID.');
                }
            } else {
                await sendTempMessage(message.channel,
                    '⚠️ Please provide a valid voice channel ID.');
            }
        }

        if (message.content === '!9ewedvc') {
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.destroy();
                await sendTempMessage(message.channel,
                    '✅ Bot has left the voice channel.');
            } else {
                await sendTempMessage(message.channel,
                    '⚠️ Bot is not connected to any voice channel.');
            }
        }
    }
});
//anti raid bot 
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});