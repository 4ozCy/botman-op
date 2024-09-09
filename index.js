const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActivityType, ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType, PermissionsBitField, StringSelectMenuBuilder, AttachmentBuilder, ModalBuilder, TextInputStyle, TextInputBuilder, InteractionType } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const app = express();
const { open } = require('sqlite');
const port = process.env.PORT || 3000;
const axios = require('axios');
const session = require('express-session');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 3 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/discord/callback`,
  scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const userId = profile.id;
    const username = profile.username;

    db.run(`INSERT OR REPLACE INTO users (id, username, accessToken) VALUES (?, ?, ?)`, [userId, username, accessToken], (err) => {
      if (err) {
        console.error('Database error:', err.message);
        return done(err, null);
      }
      return done(null, profile);
    });
  } catch (error) {
    console.error('Error during Discord authentication:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, user) => {
    if (err) {
      return done(err, null);
    }
    return done(null, user);
  });
});

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Failed to open the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/guild');
});

app.get('/guild', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }

    db.get(`SELECT accessToken FROM users WHERE id = ?`, [req.user.id], async (err, row) => {
        const userGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${row.accessToken}` }
        });

        const guildCount = userGuildsResponse.data.length;

        fs.readFile(path.join(__dirname, 'guild.html'), 'utf8', (err, data) => {
            const modifiedHtml = data.replace('{{guildCount}}', guildCount);
            res.send(modifiedHtml);
        });
    });
});
    
app.get('/', (req, res) => {
  res.send(`botman here to serve you justice`)
})

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

const OWNER = '1107744228773220473';

db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  accessToken TEXT NOT NULL
)`);

const dbPromise = open({
  filename: './database.db',
  driver: sqlite3.Database
});

dbPromise.then(db => {
  return db.run(`CREATE TABLE IF NOT EXISTS users (
    userId TEXT,
    guildId TEXT,
    warnings INTEGER DEFAULT 0
  )`);
});

process.env.YTDL_NO_UPDATE = 'true';

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

client.user.setActivity({
  name: "Over Gotham City",
  type: ActivityType.Watching,
  });
})

const commands = [
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user in the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user in the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check a users warning count')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check')
        .setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily restrict a user\'s ability to send messages')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage user roles')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(option => option.setName('user').setDescription('User to add role to').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('Role to add').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(option => option.setName('user').setDescription('User to remove role from').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('Role to remove').setRequired(true)))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('get information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to get info about')
        .setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('get information about the server')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('get-guilds')
    .setDescription('Get the number of guilds the user is in')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('anon-msg')
    .setDescription('Send an anonymous message to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to send the message to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The anonymous message')
        .setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Fetch the avatar of a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose avatar you want to see')
        .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('truth-or-dare')
    .setDescription('Play Truth or Dare')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Choose Truth or Dare')
        .setRequired(false)
        .addChoices(
          { name: 'Truth', value: 'truth' },
          { name: 'Dare', value: 'dare' }
        )
    )
    .toJSON(),
  new SlashCommandBuilder()
  .setName('file-hosting')
  .setDescription('Upload a file to the file hosting server')
  .addAttachmentOption(option =>
    option.setName('file')
      .setDescription('The file to upload')
      .setRequired(true))
  .toJSON(),
];

(async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Error registering application commands:', error);
  }
})();

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const mentionedUsers = message.mentions.users;
  if (mentionedUsers.has(OWNER)) {
    const embed = new EmbedBuilder()
      .setColor('#00AE86')
      .setTitle('Important Note')
      .setDescription(`Hey there ${message.author},\n\nI noticed that you mentioned my owner, Denzo. I just wanted to inform you that he needs to take a break for about a month to deal with some personal matters related to family issues.\n\nHe appreciates your patience and support during this time. He’ll be back and in touch once things settle down.\n\nThanks for understanding!`)
    .setFooter({ text: 'Best regards | Botman' });
    
    try {
      await message.reply({ embeds: [embed] });
      console.log(`Reply sent in ${message.channel.name}`);

      const user = await client.users.fetch(OWNER);

      const dmEmbed = new EmbedBuilder()
        .setColor('#00AE86')
        .setTitle('Mention Notification')
        .setDescription(`You were mentioned by ${message.author.tag} in ${message.guild.name}.`)
        .addField('Message Content', message.content || 'No content')
        .addField('Mention Time', new Date().toLocaleString())
        .setFooter({ text: 'Notification from your Discord bot' });

      await user.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.error(`Could not send reply or DM:`, error);
    }
  }
});

const REAL_LIFE = '1280962423553265785';
const HENTAI = '1281186733941325855';

let isRequestingRealLife = false;
let isRequestingHentai = false;

async function startRequests(channel, type) {
    if (type === 'realLife') {
        isRequestingRealLife = true;
    } else if (type === 'hentai') {
        isRequestingHentai = true;
    }

    channel.send('Started making requests.');

    while ((type === 'realLife' ? isRequestingRealLife : isRequestingHentai)) {
        try {
            const apiUrls = type === 'realLife'
                ? [
                    'https://nekobot.xyz/api/image?type=pussy',
                    'https://nekobot.xyz/api/image?type=boobs',
                    'https://nekobot.xyz/api/image?type=ass',
                    'https://nekobot.xyz/api/image?type=anal'
                  ]
                : [
                    'https://purrbot.site/api/img/nsfw/fuck/gif',
                    'https://purrbot.site/api/img/nsfw/anal/gif',
                    'https://purrbot.site/api/img/nsfw/pussylick/gif',
                    'https://purrbot.site/api/img/nsfw/yuri/gif',
                    'https://nekobot.xyz/api/image?type=hass',
                    'https://nekobot.xyz/api/image?type=hyuri',
                    'https://nekobot.xyz/api/image?type=hentai',
                    'https://nekobot.xyz/api/image?type=hboobs',
                    'https://nekobot.xyz/api/image?type=hentai_anal',
                    'https://api.waifu.pics/nsfw/waifu',
                    'https://purrbot.site/api/img/nsfw/threesome_mmf/gif',
                    'https://purrbot.site/api/img/nsfw/threesome_ffm/gif',
                    'https://purrbot.site/api/img/nsfw/threesome_fff/gif',
                    'https://purrbot.site/api/img/nsfw/cum/gif/',
                    'https://nekobot.xyz/api/image?type=hmidriff',
                    'https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=hentai+animated&limit=1'
                  ];

            const randomApiUrl = apiUrls[Math.floor(Math.random() * apiUrls.length)];
            const response = await axios.get(randomApiUrl);
             let gifUrl;
            if (randomApiUrl.includes('gelbooru.com')) {
                const post = response.data.post[0];
                if (post.file_url.endsWith('.gif')) {
                    gifUrl = post.file_url;
                } else {
                    gifUrl = null;
                }
            } else {
                gifUrl = response.data.message || response.data.link;
            }
            const embed = new EmbedBuilder()
                .setTitle(type === 'realLife' ? 'Real life' : 'Hentai')
                .setColor('#FF69B4')
                .setImage(gifUrl);

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error making request:', error);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

function stopRequests(type, channel) {
    if (type === 'realLife') {
        isRequestingRealLife = false;
    } else if (type === 'hentai') {
        isRequestingHentai = false;
    }

    channel.send('Stopped making requests.');
}

client.on('messageCreate', async message => {
    if (message.channel.id === REAL_LIFE) {
        if (message.content.toLowerCase().includes('start')) {
            if (!isRequestingRealLife) {
                startRequests(message.channel, 'realLife');
            } else {
                message.channel.send('Requests are already running.');
            }
        } else if (message.content.toLowerCase().includes('stop')) {
            if (isRequestingRealLife) {
                stopRequests('realLife', message.channel);
            } else {
                message.channel.send('Requests are not running.');
            }
        }
    } else if (message.channel.id === HENTAI) {
        if (message.content.toLowerCase().includes('start')) {
            if (!isRequestingHentai) {
                startRequests(message.channel, 'hentai');
            } else {
                message.channel.send('Requests are already running.');
            }
        } else if (message.content.toLowerCase().includes('stop')) {
            if (isRequestingHentai) {
                stopRequests('hentai', message.channel);
            } else {
                message.channel.send('Requests are not running.');
            }
        }
    }
});

async function getTruthOrDare(type) {
    const url = type === 'truth' 
        ? 'https://api.truthordarebot.xyz/v1/truth' 
        : 'https://api.truthordarebot.xyz/api/dare';
    const response = await axios.get(url);
    return response.question;
}

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    handleCommand(interaction);
  } else if (interaction.isButton() || interaction.isSelectMenu()) {
    handleTicketCreation(interaction);
  }
});

async function handleCommand(interaction) {
  const { commandName, options, user, guild } = interaction;

  if (commandName === 'kick') {
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';

    const targetMember = guild.members.cache.get(user.id);
    if (targetMember.kickable) {
      await targetMember.kick(reason);
      await interaction.reply({ content: `${user.tag} has been kicked for: ${reason}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `I can't kick ${user.tag}.`, ephemeral: true });
    }

  } else if (commandName === 'ban') {
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';

    const targetMember = guild.members.cache.get(user.id);
    if (targetMember.bannable) {
      await targetMember.ban({ reason });
      await interaction.reply({ content: `${user.tag} has been banned for: ${reason}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `I can't ban ${user.tag}.`, ephemeral: true });
    }

  } else if (commandName === 'mute') {
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';

    const targetMember = guild.members.cache.get(user.id);
    const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
    
    if (!muteRole) {
      return interaction.reply({ content: 'No "Muted" role found in this server.', ephemeral: true });
    }

    if (targetMember.manageable) {
      await targetMember.roles.add(muteRole, reason);
      await interaction.reply({ content: `${user.tag} has been muted for: ${reason}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `I can't mute ${user.tag}.`, ephemeral: true });
    }

  } else if (commandName === 'unmute') {
    const user = options.getUser('user');
    const targetMember = guild.members.cache.get(user.id);
    const muteRole = guild.roles.cache.find(role => role.name === 'Muted');

    if (!muteRole) {
      return interaction.reply({ content: 'No "Muted" role found in this server.', ephemeral: true });
    }

    if (targetMember.manageable) {
      await targetMember.roles.remove(muteRole);
      await interaction.reply({ content: `${user.tag} has been unmuted.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `I can't unmute ${user.tag}.`, ephemeral: true });
    }

  } else if (commandName === 'warn') {
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';

    const db = await dbPromise;
    let targetUser = await db.get('SELECT * FROM users WHERE userId = ? AND guildId = ?', [user.id, guild.id]);

    if (!targetUser) {
      await db.run('INSERT INTO users (userId, guildId, warnings) VALUES (?, ?, ?)', [user.id, guild.id, 1]);
      targetUser = { warnings: 1 };
    } else {
      await db.run('UPDATE users SET warnings = warnings + 1 WHERE userId = ? AND guildId = ?', [user.id, guild.id]);
      targetUser.warnings += 1;
    }

    await interaction.reply({ content: `${user.tag} has been warned for: ${reason}. They now have ${targetUser.warnings} warning(s).`, ephemeral: true });

  } else if (commandName === 'warnings') {
    const user = options.getUser('user');
    const db = await dbPromise;
    const targetUser = await db.get('SELECT warnings FROM users WHERE userId = ? AND guildId = ?', [user.id, guild.id]);

    if (!targetUser) {
      await interaction.reply({ content: `${user.tag} has no warnings.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `${user.tag} has ${targetUser.warnings} warning(s).`, ephemeral: true });
    }

  } else if (commandName === 'timeout') {
    const user = options.getUser('user');
    const duration = options.getInteger('duration');
    const reason = options.getString('reason') || 'No reason provided';

    const targetMember = guild.members.cache.get(user.id);
    const timeoutMilliseconds = duration * 60 * 1000;

    if (targetMember.moderatable) {
      await targetMember.timeout(timeoutMilliseconds, reason);
      await interaction.reply({ content: `${user.tag} has been timed out for ${duration} minute(s) for: ${reason}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `I can't timeout ${user.tag}.`, ephemeral: true });
    }

  } else if (commandName === 'role') {
    const subcommand = interaction.options.getSubcommand();
    const user = options.getUser('user');
    const role = options.getRole('role');
    const targetMember = guild.members.cache.get(user.id);

    if (subcommand === 'add') {
      await targetMember.roles.add(role);
      await interaction.reply({ content: `Successfully added ${role.name} to ${user.tag}.`, ephemeral: true });

    } else if (subcommand === 'remove') {
      await targetMember.roles.remove(role);
      await interaction.reply({ content: `Successfully removed ${role.name} from ${user.tag}.`, ephemeral: true });
    }

  } else if (commandName === 'user-info') {
    const user = options.getUser('user');
    const targetMember = guild.members.cache.get(user.id);

    await interaction.reply({
      embeds: [
        {
          title: `${user.tag}'s Info`,
          fields: [
            { name: 'ID', value: user.id, inline: true },
            { name: 'Username', value: user.username, inline: true },
            { name: 'Discriminator', value: `#${user.discriminator}`, inline: true },
            { name: 'Joined Server', value: targetMember.joinedAt.toDateString(), inline: true },
            { name: 'Roles', value: targetMember.roles.cache.map(role => role.name).join(', ') || 'None', inline: true },
          ],
          thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
          color: 0x7289DA,
        }
      ],
      ephemeral: true
    });

  } else if (commandName === 'server-info') {
    const owner = await guild.fetchOwner();

    await interaction.reply({
      embeds: [
        {
          title: `${guild.name} Server Info`,
          fields: [
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Owner', value: owner.user.tag, inline: true },
            { name: 'Members', value: `${guild.memberCount}`, inline: true },
            { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
          ],
          thumbnail: { url: guild.iconURL({ dynamic: true }) },
          color: 0x7289DA,
        }
      ],
      ephemeral: true
    });
  
  } else if (commandName === 'file-hosting') {
    const file = interaction.options.getAttachment('file');
    const fileUrl = file.url;

    await interaction.deferReply();

    try {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const formData = new FormData();
      formData.append('file', response.data, file.name);

      const uploadResponse = await axios.post('http://file-hosting.onrender.com/api/file/hosting', formData, {
        headers: formData.getHeaders(),
      });

      const hostedFileUrl = uploadResponse.data.fileUrl;
      await interaction.editReply(`Your file has been uploaded! You can access it here: ${hostedFileUrl}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      await interaction.editReply('There was an error uploading your file. Please try again later.');
     }
  } else if (commandName === 'truth-or-dare') {
    const option = interaction.options.getString('type') || 'dare';
    const data = await getTruthOrDare(option);
    const { question, rating } = data;

    if (rating !== 'R') {
        return interaction.reply({ content: 'Only Rated R questions are allowed.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(option === 'truth' ? 'Truth' : 'Dare')
      .setDescription(question)
      .setColor(0x00AE86);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('answer')
        .setLabel('Answer')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('skip')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('stop')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

if (interaction.isButton()) {
    if (interaction.customId === 'answer') {
        const modal = new ModalBuilder()
            .setCustomId('answer_modal')
            .setTitle('Submit Your Answer');

        const answerInput = new TextInputBuilder()
            .setCustomId('answer_input')
            .setLabel('Your Answer')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const answerRow = new ActionRowBuilder().addComponents(answerInput);
        modal.addComponents(answerRow);

        await interaction.showModal(modal);
    }

    if (interaction.customId === 'skip') {
        const option = interaction.message.embeds[0].title.toLowerCase();
        const data = await getTruthOrDare(option);
        const { question, rating } = data;

        if (rating !== 'R') {
            return interaction.reply({ content: 'Only Rated R questions are allowed.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(option === 'truth' ? 'Truth' : 'Dare')
            .setDescription(question)
            .setColor(0x00AE86);

        await interaction.update({ embeds: [embed] });
    }

    if (interaction.customId === 'stop') {
        await interaction.update({ content: 'Game stopped!', components: [], embeds: [] });
    }
}

if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId === 'answer_modal') {
        const answer = interaction.fields.getTextInputValue('answer_input');

        await interaction.update({
            content: `You answered: ${answer}. Let's move on!`,
            components: [],
        });

        const option = interaction.message.embeds[0].title.toLowerCase();
        const data = await getTruthOrDare(option);
        const { question, rating } = data;

        if (rating !== 'R') {
            return interaction.reply({ content: 'Only Rated R questions are allowed.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(option === 'truth' ? 'Truth' : 'Dare')
            .setDescription(question)
            .setColor(0x00AE86);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('answer')
              .setLabel('Answer')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('skip')
              .setLabel('Skip')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('stop')
              .setLabel('Stop')
              .setStyle(ButtonStyle.Danger)
        );

        await interaction.followUp({ embeds: [embed], components: [row] });
      }
  } else if (commandName === 'avatar') {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const avatarEmbed = new EmbedBuilder()
      .setColor('#7289DA')
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
    
    await interaction.reply({ embeds: [avatarEmbed], ephemeral: true });

  } else  if (commandName === 'anon-msg') {
    const targetUser = interaction.options.getUser('user');
    const anonymousMessage = interaction.options.getString('message');

    try {
      if (anonymousMessage) {
        await targetUser.send(`You have received an anonymous message:\n\n${anonymousMessage}`);
      }

      await interaction.reply({ content: `Your anonymous message has been sent to ${targetUser.tag}.`, ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `There was an error sending the message. Please try again.`, ephemeral: true });
     }
  } else if (commandName === 'get-guilds') {
db.get(`SELECT accessToken FROM users WHERE id = ?`, [user.id], async (err, row) => {
        if (err) {
          console.error('Database error:', err.message);
          return interaction.reply({ content: 'An error occurred. Please try again later.', ephemeral: true });
        }

        if (!row) {
          const redirectUri = `${process.env.BASE_URL}/auth/discord/callback`;
          const loginUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;

          const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('Login Required')
            .setDescription('To use this command, you need to login through our application. Please click the button below to login.');
          
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setLabel('Login')
                .setStyle(ButtonStyle.Link)
                .setURL(loginUrl)
            );

          return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

  const userGuilds = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${row.accessToken}` }
            });

            const guildCount = userGuilds.data.length;
            interaction.reply({ content: `You are in ${guildCount} guild(s).`, ephemeral: true });
        });
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

client.login(process.env.TOKEN);
