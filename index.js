const Discord = require("discord.js");
const moment = require('moment-timezone');
const bot = new Discord.Client({
  disableEveryone: true,
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});
const ms = require("ms");
const fs = require("fs");
const fetch = require("node-fetch");
fetch('https://api.nmsassistant.com/version').then(response => response.json());

const helpCommands = require('./command/help');
const infoCommands = require('./command/info');
const supportCommands = require('./command/support');
const versionCommands = require('./command/version');
const testCommands = require('./command/test');
const timeCommands = require('./command/time');

// Fetch config information from Heroku config vars
const token = process.env.BOT_TOKEN;
const prefix = process.env.BOT_PREFIX;

// Set the bot's timezone to the server's timezone (UTC)
moment.tz.setDefault();

/* TODO: Separate the bot's replies into json files for easy editing
 *  const botResponses = ('./botResponses.json')
 *  const faqTopics = ('./faqTopics.json')
 *  ... and so on
 */

bot.login(token);

bot.on("ready", async () => {
  //Set the current app release version
  const {name} = await fetch('https://api.nmsassistant.com/version').then(response => response.json());
  //Set Current Version voice channel as app release
  let myGuild = bot.guilds.get('625007826913198080');
  let appReleaseChannel = myGuild.channels.get('662465837558398979');
  appReleaseChannel.setName(name);
  //Console startup
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
  let hasDevRole = 0;
  // This handles all DMs to the bot user
  if (message.channel.type === "dm") {
    console.log("Direct Message");
    // The bot will forward all queries with the <prefix>help command to the faqchannel
    if (cmd.toLowerCase() === `${prefix}modhelp`) {
      helpCommands.directMessage(bot, message, args);
    }
    else if (cmd.toLowerCase() === `${prefix}info`) { // Nice infobox
      infoCommands.infoResponse(message, prefix);
    }
    else // Handle all non-recognized commands/msgs
      infoCommands.defaultResponse(message, prefix);
  }

  // These are server-wide replies,
  // respond/react to only msgs with the prefix at the start of msg
  else if (cmd.startsWith(prefix)) {

    // Make the bot react to every command with the Question emoji,
    // ignoring empty commands
    if(cmd === prefix) return;
    await message.react(questionDrone);
    
    let authorRoles = await message.author.roles;
    if(authorRoles.some(role => role.name === 'Developer')) hasDevRole = 1;
      
    
    if (cmd === `${prefix}test`){
      if(hasDevRole) testCommands.testMessage(message);
      else {

        let reactions = await message.reactions;

        for (const reaction of reactions) {
        if (!reaction[0].includes(questionDrone.id)) continue;
        reaction[1].remove();
        }

        await message.react(droneEyeRed);
        return message.channel.send('ERROR: Unauthorized user. Dispatching Sentinel drones.');
      }
    }
    
    else if (cmd === `${prefix}version`){
      if(hasDevRole) versionCommands.getCurrent(message);
      else {

        let reactions = await message.reactions;

        for (const reaction of reactions) {
        if (!reaction[0].includes(questionDrone.id)) continue;
        reaction[1].remove();
        }

        await message.react(droneEyeRed);
        return message.channel.send('ERROR: Unauthorized user. Dispatching Sentinel drones.');
      }
    } 
    else if (cmd === `${prefix}links`) infoCommands.links(message);
    else if (cmd === `${prefix}support`) supportCommands.links(message);
    else if (cmd === `${prefix}faq`) infoCommands.faq(message);
    else if (cmd === `${prefix}time`) timeCommands.currentTime(message, prefix);
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

      let reactions = await message.reactions;
      for (const reaction of reactions) {
        if (!reaction[0].includes(questionDrone.id)) continue;
        reaction[1].remove();
      }
      await message.react(confuseDrone);


      return message.channel.send("ERROR: Unrecognized command. Unable to assist.");
    }
  }
});
