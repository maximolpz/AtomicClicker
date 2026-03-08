require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player, QueryType } = require('discord-player');
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

async function init() {
  await player.extractors.loadMulti(DefaultExtractors);
  const loaded = player.extractors.store.size;
  console.log(`🎵 Extractores cargados: ${loaded}`);
  
  client.login(process.env.DISCORD_TOKEN);
}

client.once('clientReady', () => {
  console.log(`✅ ${client.user.tag} conectado`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz primero.');

    try {
      console.log('🔍 Buscando stream...');

      const result = await player.search(LOFI_URL, {
        requestedBy: message.author,
        searchEngine: QueryType.ARBITRARY,
      });

      console.log('🔍 Resultado:', result?.tracks?.length, 'tracks');

      if (!result || !result.tracks.length) {
        return message.reply('❌ No se encontró el stream.');
      }

      const queue = player.nodes.create(message.guild, {
        metadata: message,
        selfDeaf: false,
        leaveOnEmpty: false,
        leaveOnEnd: false,
        leaveOnStop: false,
      });

      if (!queue.connection) {
        await queue.connect(voiceChannel);
        console.log('✅ Conectado al canal de voz');
      }

      queue.addTrack(result.tracks[0]);

      if (!queue.isPlaying()) {
        await queue.node.play();
        console.log('▶️ Reproduciendo...');
      }

      message.reply('🎵 ¡Lofi radio activada! 🌙');

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

init();
