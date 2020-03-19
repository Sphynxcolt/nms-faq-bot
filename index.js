const Discord = require("discord.js");
const moment = require('moment-timezone');
const bot = new Discord.Client({
  disableEveryone: true,
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});
const ms = require("ms");
const fs = require("fs");

const helpCommands = require('./command/help');
const infoCommands = require('./command/info');
const supportCommands = require('./command/support');
const versionCommands = require('./command/version');
const testCommands = require('./command/test');
const timeCommands = require('./command/time');

const responses = require('./constant/responses');

const emojiHelper = require('./helper/emoji');
const channelHelper = require('./helper/channels');

// Fetch config information from Heroku config vars
const token = process.env.BOT_TOKEN;
const prefix = process.env.BOT_PREFIX;

// Set the bot's timezone to the server's timezone (UTC)
moment.tz.setDefault();

bot.login(token);

bot.on("ready", async () => {
  
  channelHelper.setVoiceChannelTextToCurrentAppReleaseName();
  // Console startup
  console.log(`${bot.user.username} is online. Current Prefix: ${prefix}`);
  // Set bot's status as "Listening to <prefix>help"
  bot.user.setPresence({ status: 'online' });
  bot.user.setActivity(`${prefix}help`, { type: 'LISTENING' });

});

bot.on("message", async message => {
  // Ignore messages by the bot itself
  if (message.author.bot) return;

  // Get the bot-specific emojis by name
  const questionDrone = bot.emojis.find(emoji => emoji.name === "DroneQuestion");
  const confuseDrone = bot.emojis.find(emoji => emoji.name === "DroneConfused");
  const droneEyeBlue = bot.emojis.find(emoji => emoji.name === "DroneEyeBlue");
  const droneEyeRed = bot.emojis.find(emoji => emoji.name === "DroneEyeRed");

  // Make the bot react to all mentions of it
  if (message.isMentioned(bot.user)) {
    message.react(droneEyeBlue)
      .then(console.log)
      .catch(console.error);
  }

  // Now let's handle all messages, see if we get any commands
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);
  // This handles all DMs to the bot user
  if (message.channel.type === "dm") {
    console.log("Direct Message");
    // The bot will forward all queries with the <prefix>help command to the faqchannel
    if (cmd.toLowerCase() === `${prefix}modhelp`) helpCommands.directMessage(bot, message, args);
    else if (cmd.toLowerCase() === `${prefix}info`) infoCommands.infoResponse(message, prefix);
    else infoCommands.defaultResponse(message, prefix); // Handle all non-recognized commands/msgs
    return;
  }

  // Don't respond/react to msgs that don't start with the prefix and ignore empty commands
  if (cmd.startsWith(prefix) == false) return;
  if (cmd === prefix) return;

  // Make the bot react to every command with the Question emoji,  
  await message.react(questionDrone);

  let authorRoles = await message.member.roles;
  let hasDevRole = authorRoles.some(role => role.name === 'Developer')

  if (hasDevRole === false) {
    if (cmd === `${prefix}test` || cmd === `${prefix}version`) { //Restricted to developer only
      await emojiHelper.removeEmojiAsync(message, questionDrone.id);
      await message.react(droneEyeRed);
      return message.channel.send(responses.unauthorised);
    }
  }

  if (cmd === `${prefix}test`) testCommands.testMessage(message);
  else if (cmd === `${prefix}version`) versionCommands.getCurrent(message);
  else if (cmd === `${prefix}links`) infoCommands.links(message);
  else if (cmd === `${prefix}support`) supportCommands.links(message);
  else if (cmd === `${prefix}faq`) infoCommands.faq(message);
  else if (cmd === `${prefix}time`) {
    if (message.content === cmd)  timeCommands.currentTime(message, prefix);
    else if (args.includes('help')) timeCommands.timeFnsInfo(message, prefix);
  }
  else if (cmd === `${prefix}supportticket`) supportCommands.ticket(message);
  else if (cmd === `${prefix}help`) helpCommands.listOfCommands(message);
  else if (cmd === `${prefix}translation`) infoCommands.translation(message);
  else if (cmd === `${prefix}guides`) infoCommands.guides(message);
  else if (cmd === `${prefix}freshdesk`) supportCommands.freshdesk(message);
  else if (cmd === `${prefix}appversion`) infoCommands.appVersion(message);
  else {
    // If the message contained the prefix but was not a valid command,
    // react with the corruptDrone emoji and inform of invalid command
    // Remove previous atlas message reaction
    await emojiHelper.removeEmojiAsync(message, questionDrone.id);
    await message.react(confuseDrone);
    return message.channel.send(responses.unrecognised);
  }
});
