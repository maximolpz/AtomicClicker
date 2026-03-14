require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// URL DIRECTA - Aquí está la magia
const AUDIO_URL = 'https://data.freetouse.com/music/tracks/1028a982-25d2-9b50-71a8-dbc9a3c7cb81/file/mp3';

const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play }
});

function playStream(connection, url) {
  const ffmpeg = spawn(ffmpegPath, [
    '-i', url,
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true
  });

  resource.volume.setVolume(0.8);
  connection.subscribe(player);
  player.play(resource);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!play') {
    const channel = message.member?.voice?.channel;
    if (!channel) return message.reply('❌ ¡Entra a un canal de voz!');

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    playStream(connection, AUDIO_URL);
    message.reply('🎵 Reproduciendo **Bread (Lukrembo)** en el servidor...');
  }
});

client.once('ready', (c) => console.log(`✅ Bot en línea como: ${c.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
