require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { AttachmentExtractor } = require('@discord-player/extractor');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);

player.events.on('playerError', (queue, error) => {
  console.error('❌ playerError:', error.message);
});

player.events.on('error', (queue, error) => {
  console.error('❌ error:', error.message);
});

player.events.on('playerStart', (queue, track) => {
  console.log(`▶️ Reproduciendo: ${track.title}`);
});

player.events.on('audioTrackAdd', (queue, track) => {
  console.log(`➕ Track agregado: ${track.title}`);
});

player.events.on('disconnect', (queue) => {
  console.log('⚠️ Bot desconectado del canal');
});

(async () => {
  try {
    await player.extractors.register(AttachmentExtractor, {});
    await player.extractors.register(YoutubeiExtractor, {});
    console.log(`🎵 Extractores cargados: ${player.extractors.store.size}`);
  } catch (e) {
    console.error('❌ Error extractores:', e.message);
  }

  client.once('clientReady', () => {
    console.log(`✅ ${client.user.tag} conectado`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!lofi') {
      const voiceChannel = message.member?.voice?.channel;
      if (!voiceChannel) return message.reply('❌ Entra a un canal de voz.');

      try {
        console.log('🔍 Buscando lofi...');
        await player.play(voiceChannel, 'https://streams.ilovemusic.de/iloveradio17.mp3', {
          nodeOptions: {
            metadata: { channel: message.channel },
            selfDeaf: false,
            leaveOnEmpty: false,
            leaveOnEnd: false,
            leaveOnStop: false,
            volume: 80,
          },
        });
        message.reply('🎵 ¡Lofi activada! 🌙');
      } catch (err) {
        console.error('❌ Error:', err.message);
        message.reply('❌ Error al reproducir.');
      }
    }

    if (message.content === '!stop') {
      player.nodes.get(message.guild.id)?.delete();
      message.reply('⏹️ Detenido.');
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
})();
