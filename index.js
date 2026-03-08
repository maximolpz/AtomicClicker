require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);

const LOFI_URL = 'https://streams.ilovemusic.de/iloveradio17.mp3';

client.once('clientReady', async () => {
  console.log(`✅ ${client.user.tag} conectado`);
  await player.extractors.loadMulti(DefaultExtractors);
  console.log('🎵 Extractores cargados');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz primero.');

    try {
      const { track } = await player.play(voiceChannel, LOFI_URL, {
        nodeOptions: {
          metadata: message,
          selfDeaf: false,
          leaveOnEmpty: false,
          leaveOnEnd: false,
          leaveOnStop: false,
        },
      });

      message.reply(`🎵 ¡Lofi radio activada! 🌙`);
      console.log('▶️ Reproduciendo:', track.title);

    } catch (err) {
      console.error('❌ Error completo:', err);
      message.reply('❌ No pude reproducir el stream.');
    }
  }

  if (message.content === '!stop') {
    const queue = player.nodes.get(message.guild.id);
    if (queue) queue.delete();
    message.reply('⏹️ Detenido.');
  }
});

client.login(process.env.DISCORD_TOKEN);
