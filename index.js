const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    EndBehaviorType 
} = require('@discordjs/voice');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const activeLoopTimers = new Map();

client.on('ready', () => {
    console.log(`Bot Discord online sebagai ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!join')) {
        const targetUser = message.mentions.users.first() || message.author;
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('Gagal: Anda harus berada di dalam Voice Channel terlebih dahulu.');
        }

        if (activeLoopTimers.has(message.guild.id)) {
            return message.reply('Peringatan: Pemantauan otomatis sedang berjalan di server ini. Gunakan "!out" untuk menghentikan.');
        }

        message.reply(`[SISTEM] Memulai pemantauan status tidur untuk **${targetUser.username}** (Interval: 5 menit).`);

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false
        });

        const jalankanPengecekan = () => {
            message.channel.send(`>>> **[PEMERIKSAAN RUTIN]**\nMemutar pertanyaan audio untuk: **${targetUser.username}**`);

            const player = createAudioPlayer();
            const resourcePertanyaan = createAudioResource(path.join(__dirname, 'pertanyaan.mp3'));

            player.play(resourcePertanyaan);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                message.channel.send(`> Mendengarkan respons suara selama 8 detik...`);

                let userResponded = false;
                const receiver = connection.receiver;
                
                const audioStream = receiver.subscribe(targetUser.id, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1000,
                    },
                });

                audioStream.on('data', () => {
                    if (!userResponded) userResponded = true;
                });

                setTimeout(() => {
                    audioStream.destroy();

                    const resultPlayer = createAudioPlayer();

                    if (userResponded) {
                        message.channel.send(
                            `\`\`\`\n` +
                            `HASIL DETEKSI:RESPONS TERDETEKSI\n` +
                            `Target  : ${targetUser.username}\n` +
                            `Hasil   : TRUE\n` +
                            `Status  : ${targetUser.username} masih terjaga\n` +
                            `\`\`\``
                        );

                        // Memutar audio true.mp3 & Bot Tetap Stay di VC
                        const resourceTrue = createAudioResource(path.join(__dirname, 'true.mp3'));
                        resultPlayer.play(resourceTrue);
                        connection.subscribe(resultPlayer);

                    } else {
                        // KONDISI FALSE: Tidak Ada Respon / User Tidur
                        message.channel.send(
                            `\`\`\`\n` +
                            `HASIL DETEKSI: TIDAK ADA RESPONS\n` +
                            `Target  : ${targetUser.username}\n` +
                            `Hasil   : FALSE\n` +
                            `Status  : ${targetUser.username} tidur\n` +
                            `\`\`\``
                        );

                        // Memutar audio false.mp3
                        const resourceFalse = createAudioResource(path.join(__dirname, 'false.mp3'));
                        resultPlayer.play(resourceFalse);
                        connection.subscribe(resultPlayer);

                        // Keluar dari VC setelah false.mp3 selesai diputar
                        resultPlayer.on(AudioPlayerStatus.Idle, () => {
                            const timerData = activeLoopTimers.get(message.guild.id);
                            if (timerData) {
                                clearInterval(timerData.intervalId);
                                activeLoopTimers.delete(message.guild.id);
                            }
                            connection.destroy();
                            message.channel.send('[SISTEM] User terdeteksi tidur. Bot keluar dari Voice Channel.');
                        });
                    }
                }, 8000);
            });
        };

        // Jalankan tes pertama kali
        jalankanPengecekan();

        // Ulangi setiap 5 menit (300000 ms)
        const intervalId = setInterval(jalankanPengecekan, 300000);
        activeLoopTimers.set(message.guild.id, { intervalId, connection });
    }

    if (message.content === '!out') {
        const timerData = activeLoopTimers.get(message.guild.id);

        if (!timerData) {
            return message.reply('Gagal: Tidak ada proses pemantauan yang sedang berjalan.');
        }

        clearInterval(timerData.intervalId);
        timerData.connection.destroy();
        activeLoopTimers.delete(message.guild.id);

        message.reply('[SISTEM] Pemantauan dihentikan. Bot telah keluar dari Voice Channel.');
    }
});

client.login(process.env.DISCORD_TOKEN);