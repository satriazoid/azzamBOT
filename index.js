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

    // ===================================================
    // 1. PERINTAH MEMULAI PEMANTAUAN (!cektidur)
    // ===================================================
    if (message.content.startsWith('!join')) {
        const targetUser = message.mentions.users.first() || message.author;
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('Gagal: Anda harus berada di dalam Voice Channel terlebih dahulu.');
        }

        if (activeLoopTimers.has(message.guild.id)) {
            return message.reply('Peringatan: Pemantauan otomatis sedang berjalan di server ini. Gunakan "!stopcektidur" untuk menghentikan.');
        }

        message.reply(`[SISTEM] Memulai pemantauan status tidur untuk **${targetUser.username}** (Interval: 2 menit).`);

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

                    if (userResponded) {
                        // KONDISI TRUE: User Merespon / Tidak Tidur
                        message.channel.send(
                            `\`\`\`\n` +
                            `----------------------------------------\n` +
                            `HASIL DETEKSI: RESPONS TERDETEKSI\n` +
                            `----------------------------------------\n` +
                            `Target  : ${targetUser.username}\n` +
                            `Hasil   : TRUE\n` +
                            `Status  : ${targetUser.username} tidak tidur\n` +
                            `----------------------------------------\n` +
                            `\`\`\``
                        );
                    } else {
                        // KONDISI FALSE: Tidak ada respon / User Tidur
                        message.channel.send(
                            `\`\`\`\n` +
                            `----------------------------------------\n` +
                            `HASIL DETEKSI: TIDAK ADA RESPONS\n` +
                            `----------------------------------------\n` +
                            `Target  : ${targetUser.username}\n` +
                            `Hasil   : FALSE\n` +
                            `Status  : ${targetUser.username} sedang tidur\n` +
                            `----------------------------------------\n` +
                            `\`\`\``
                        );

                        // Memutar suara kedua (alarm.mp3) karena hasilnya FALSE
                        const alarmPlayer = createAudioPlayer();
                        const resourceAlarm = createAudioResource(path.join(__dirname, 'alarm.mp3'));
                        alarmPlayer.play(resourceAlarm);
                        connection.subscribe(alarmPlayer);
                    }
                }, 8000);
            });
        };

        // Jalankan tes pertama kali
        jalankanPengecekan();

        // Ulangi setiap 2 menit (120000 ms)
        const intervalId = setInterval(jalankanPengecekan, 120000);
        activeLoopTimers.set(message.guild.id, { intervalId, connection });
    }

    // ===================================================
    // 2. PERINTAH MENGHENTIKAN PEMANTAUAN (!stopcektidur)
    // ===================================================
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