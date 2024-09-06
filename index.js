const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActivityType, ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType, PermissionsBitField, StringSelectMenuBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const app = express();
const { open } = require('sqlite');
const port = process.env.PORT || 3000;
const axios = require('axios');
const session = require('express-session');
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
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

const ownerId = '1107744228773220473';

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
    .setName('nickname')
    .setDescription('Change a user\'s nickname.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to change nickname')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nickname')
        .setDescription('The new nickname')
        .setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('generate-code')
    .setDescription('Generates code based on a prompt using GPT-3.5')
    .addStringOption(option =>
      option.setName('language')
        .setDescription('Choose the programming language')
        .setRequired(true)
        .addChoices(
          { name: 'Python', value: 'python' },
          { name: 'JavaScript', value: 'javascript' },
          { name: 'Java', value: 'java' },
          { name: 'Lua', value: 'lua' }
        ))
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Enter the prompt or code description')
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

  } else if (commandName === 'generate-code') {
    const language = options.getString('language');
    const prompt = options.getString('prompt');

    try {
      const response = await openai.createCompletion({
        model: 'gpt-3.5-turbo',
        prompt: `Generate a ${language} code snippet for the following task: ${prompt}`,
        max_tokens: 150,
      });

      const generatedCode = response.data.choices[0].text.trim();

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Generated ${language.toUpperCase()} Code`)
        .setDescription(`\`\`\`${language}\n${generatedCode}\n\`\`\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error generating code with GPT-3.5:', error);
      await interaction.reply({ content: 'Failed to generate code. Please try again later.', ephemeral: true });
      }
  } else if (commandName === 'nickname') {
    const targetUser = options.getUser('user');
    const newNickname = options.getString('nickname');

    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    if (member.permissions.has(PermissionsBitField.Flags.ManageNicknames) || member.id === interaction.guild.ownerId) {
      try {
        await targetMember.setNickname(newNickname);
        await interaction.reply({ content: `Changed nickname for ${targetUser.tag} to ${newNickname}.`, ephemeral: true });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Unable to change the nickname.', ephemeral: true });
      }
    } else {
      await interaction.reply({ content: 'You do not have permission to change nicknames.', ephemeral: true });
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
