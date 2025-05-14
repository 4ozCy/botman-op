const { 
  Client, GatewayIntentBits, Partials, REST, Routes, 
  SlashCommandBuilder, ActivityType 
} = require('discord.js');
const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

const warningFile = './warn.json';
let warnings = fs.existsSync(warningFile) ? JSON.parse(fs.readFileSync(warningFile)) : {};

app.get('/', (req, res) => {
  res.send(`botman here to serve you justice`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity({
    name: "Over Gotham City",
    type: ActivityType.Watching,
  });
});

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
    .setDescription('get the avatar of a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose avatar you want to see')
        .setRequired(false))
    .toJSON(),
];

(async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT, process.env.GUILD),
      { body: commands }
    );
    console.log('Successfully registered (/) application commands.');
  } catch (error) {
    console.error('Error registering application commands:', error);
  }
})();

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

if (commandName === 'warn') {
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';

    if (!warnings[user.id]) warnings[user.id] = 0;
    warnings[user.id]++;
    fs.writeFileSync(warningFile, JSON.stringify(warn, null, 2));

    await interaction.reply(`${user.tag} has been warned. Total warnings: ${warn[user.id]}`);
  }

  if (commandName === 'warn-count') {
    const user = options.getUser('user');
    const count = warnings[user.id] || 0;
    await interaction.reply(`${user.tag} has ${count} warning(s).`);
  }
});
    
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
        }
      ],
      ephemeral: true
    });

  } else if (commandName === 'avatar') {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const avatarEmbed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
    
    await interaction.reply({ embeds: [avatarEmbed], ephemeral: true });

  } else if (commandName === 'anon-msg') {
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
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

client.login(process.env.TOKEN);
