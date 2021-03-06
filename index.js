// Import discord api package
const Discord = require('discord.js');
// To execute commands on server (such as bash scripts or other, external programs)
const exec = require('child_process').exec
// To get the acc creation date correctly
const moment = require('moment');
// To color console outputs
const chalk = require('chalk');
// Import login token, hostname and other private stuff from this file
const config = require('./config.json');

// Setting up new client object for the bot
const client = new Discord.Client();

// Set command prefix
const prefix = '!';
// Set botname
const botname = "RapBot";

// Execute once after bot has started
client.once('ready', () => {
    // Clear terminal output
    console.log('\033[2J');

    // Variable to store date
    var datetime = new Date();
    datetime = datetime.toISOString();
    // Log successful login to console
    console.log(chalk.green(`INFO at ` + datetime + `: ` + `Bot successfully logged in!`));

    // Log on which servers the bot is active
    client.guilds.cache.forEach((guild) => {
        console.log("Active on server - " + guild.name);
    });
    // Set status of Bot
    client.user.setActivity("!help for an overview of commands"); // FIXME - bot will drop status after a while, bug maybe? Use timer to refresh status to prevent this!
});

// Stuff to do when joining a new server goes in here
client.on('guildCreate', guild => {
    // The variable defaultChannel will be the channel object that it first finds the bot has permissions for
    let defaultChannel = "";
    guild.channels.cache.forEach((channel) => {
        if (channel.type == "text" && defaultChannel == "") {
            if (channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                defaultChannel = channel;
            }
        }
    })

    // Send a message to that channel
    defaultChannel.send(`Hi, I'm ` + botname + `. Thanks for inviting me, here are a list of some of my commands! :robot:`, {
        embed: {
            title: ':exclamation:Prefix',
            color: 0x2471a3,
            description: "The prefix for all my commands is \'!\', e.g: \'!h\'.",
            fields: [
                {
                    name: 'Commands',
                    value: 'help, ytdl, freestyle'
                }
            ],
            footer: {
                text: botname + ' created, developed and maintained by Max#6555.'
            }
        }
    });

    // Log to console when bot joined a server
    var datetime = new Date();
    datetime = datetime.toISOString();
    console.log(chalk.green(`INFO at ` + datetime + `: ` + botname + ` successfully joined the server named ` + guild.name));
});


// Handler block for messages
client.on('message', message => {
    // If the command does NOT start with the prefix OR the message was send by the bot, abort
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // Write arguments separated by spaces into array
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    // Variable to store date
    var datetime = new Date();
    datetime = datetime.toISOString();

    // Variable to check if command was valid for logging purposes
    let executedSuccessfully = true;

    // Log to console who is invoking what command with what arguments if any
    try {
        console.log(`INFO at ` + datetime + `: ` + `user "` + message.author.tag + ` trying to invoke command "` + command + `" with ` + args.length + ` arguments`);
        if (args.length) {
            console.log(`Printing arguments:`);
            args.forEach(argument => {
                console.log(`'` + argument + `'`);
            });
        }
    } catch (err) {
        console.error(err);
    }


    /*===============
    * Commands for bot
    * ===============*/

    // Test output / cmd prefix
    if (command === 'ping') {
        message.channel.send("Pong");

        // Test mentions
    } else if (command === 'mention') {
        message.channel.send(getMentionStringForReply(message) + ' pong');

        // Test if bot can call scripts locally stored on server
    } else if (command === 'speak') {
        try {
            execute("./scripts/test.sh", function (result) {
                console.log(result);
                message.channel.send(result);
            });
        } catch (err) {
            console.error(err);
        }
    }

    // Print db info
    else if (command === 'dbinfo') {
        try {
            execute("./scripts/print_wordlistinfo.sh", function (result) {
                console.log(result);
                message.channel.send(result);
            });
        } catch (err) {
            console.error(err);
        }
    }

    /* 
    * Handler for ytdl
    *
    * Download and convert yt video from link specified by user and send downloadlink back once youtube-dl has finished downloading 
    */
    else if (command === 'ytdownloader' | command === 'ytdl' | command === 'youtubedl' | command === 'youtubedownloader') {
        try {
            // Check if at least something was provided as argument
            if (typeof args[0] != 'undefined') {
                // Check if argument is a youtube link 
                if (isYoutubeLink(args[0])) {
                    // Let the user know we're working on downloading the video
                    message.channel.send(`Okay, starting download now. Your file will be ready shortly. I'll get back to you as soon as I'm done.`)

                    // Starting download process here
                    let child = require('child_process').exec("youtube-dl -f bestaudio --no-mtime --extract-audio --audio-format mp3 --audio-quality 0 -o '/home/rapbot/bot/RapBot/ytdownloader/%(title)s.%(ext)s' '" + args[0] + "'");

                    // Once youtube-dl is finished, run this code below
                    child.on('exit', function () {

                        // To get the filename, lookup which file is the latest
                        execute("ls -Art /home/rapbot/bot/RapBot/ytdownloader | tail -n 1", function (result) {
                            let filename = result;
                            // Remove linebreak, idk how that got there in the first place
                            let sanResult = filename.substring(0, filename.length - 1);
                            console.log(sanResult);
                            if (!(sanResult === ".htaccess" || sanResult === "htaccess" || sanResult === ".htacces")) {
                                // Send downloadlink pointing to requested mp3 back to user
                                message.channel.send(`${message.author}, here is your download link for \`` + sanResult + `\`.` + ` It's valid for a few hours.` + `\n` + `https://` + config.hostname + `/ytdownloader/` + encodeURIComponent(sanResult));
                            } else {
                                message.channel.send(`${message.author}, I'm sorry but it appears that something went wrong. Maybe the link you sent me is a playlist or it's not available in Germany`);
                            }
                        });

                    });
                }
                // If the link provided is not a youtube link, continue here
                else {
                    console.log(chalk.red(`WARN at ` + datetime + `: ` + `user "` + message.author.tag + ` called "ytdl" with invalid link: ` + args[0]));
                    message.channel.send(`${message.author}, this is not a valid Youtube link. Sorry. Try again?`);

                    executedSuccessfully = false;
                }
            }
            // If no argument is provided, continue here
            else {
                executedSuccessfully = false;
                console.log(chalk.yellow(`WARN at ` + datetime + `: ` + `user "` + message.author.tag + ` called "ytdl" with no link`));

                // Send error message and help dialogue for ytdl
                message.channel.send(`${message.author}, you need to specify a youtube link after that command. Try again?`);
                args.length = 0;
                args[0] = "ytdl";
                return printHelp(args, message);
            }
        } catch (err) {
            console.error(err);
            executedSuccessfully = false;
        }
    }

    /*
    * Handler for freestyle command
    *
    * This will call a local script which prints out words from a database based on various arguments that can be specified by the user.
    */
    else if (command === 'freestyle') {
        let level = 0;
        let amount = 8;
        let trainer = 0;

        try {
            if (!args.some(isNaN)) {
                // check if level is set
                if (typeof args[0] != 'undefined') {
                    level = args[0];
                    // correct argument range provided by user
                    if (level < 1 && level != 0) {
                        level = 1;
                    } else if (level > 10) {
                        level = 10;
                    } else if (level == 0) {
                        level = 11;
                    }
                    // invert level
                    level = 11 - level;
                }

                // check if amount is set
                if (typeof args[1] != 'undefined') {
                    // correct user input
                    if (amount < 1) {
                        amount = 1;
                    } else if (amount > 50) {
                        amount = 50;
                    }
                    amount = args[1];
                }

                // check if trainer is set
                if (typeof args[2] != 'undefined') {
                    trainer = args[2];
                    level = 0;
                }

                console.log("No illegal args passed as args, this is good.");

                // Call script to fetch words
                execute("./scripts/getWords.sh " + level + " " + amount + " " + trainer, function (result) {

                    console.log(chalk.green(`INFO at ` + datetime + `: ` + `user "` + message.author.tag + ` called "!freestyle" successfully with command: ` + "./scripts/getWords.sh " + level + " " + amount + " " + trainer));
                    console.log(result);
                    try {
                        message.channel.send(result);
                    } catch (err) {
                        console.log(chalk.red(err));
                    }
                });

            }
            // If illegal arguments were passed with command
            else {
                // Log incident to console and dump arguments
                console.log(chalk.red(`WARN at ` + datetime + `: ` + `user "` + message.author.tag + ` is trying to invoke command "` + command + `" with illegal arguments`));
                if (args.length) {
                    console.log(`Arguments:`);
                    args.forEach(argument => {
                        console.log(`"` + argument + `"`);
                    });
                }
                // Print help message for command "freestyle"
                message.channel.send(`What is this, ${message.author}? Are you lost?`);

                // Reset arguments and call "printHelp" with argument "freestyle"
                args.length = 0;
                args[0] = "freestyle";
                return printHelp(args, message);
            }
        } catch (err) {
            console.error(chalk.red(err));
            // ???
            message.channel.send("ALARM! CRITICAL ERROR! This should have never happened, and you did it anyway. Congratulations! You broke something. Anzeige ist raus. #kappa");
        }
    }

    // cakeday handler
    else if (command === 'cakeday') {
        try {
            let userObject = message.author;
            message.channel.send(`${message.author}, you joined Discord on ` + moment(userObject.createdAt).format('LLLL'));
        } catch (err) {
            console.error(err);
        }
    }
    // Help handler
    else if (command === 'help' || command === 'hilfe' || command === 'h') {
        try {
            message.channel.send(`Help? No problem ${message.author}!`);
            // call function for handling here!
            printHelp(args, message);
        } catch (err) {
            console.error(err);
        }
    }

    // Easter egg section
    else if (command === 'ssio') {
        message.channel.send("***NUTTÖÖÖ***\nhttps://www.youtube.com/watch?v=UdcYjlESrow");
    }
    else if (command === 'homberg' || command === 'hochheide' || command === '47') {
        message.channel.send("https://cdn.discordapp.com/attachments/795061828262428733/795842332606988348/StraightOuttaHomberg.png");
    }

    // If no vaild command was entered, print help dialogue
    else {
        // Log incident to console
        console.log(chalk.yellow(`DEBUG at ` + datetime + `: ` + `user "` + message.author.tag + ` trying to invoke unknown command "` + command + `"`));

        executedSuccessfully = false;
        // Choose random response
        let randomResponse = ~~(Math.random() * 5) + 1;
        switch (randomResponse) {
            case 1:
                message.channel.send(`Bless you ${message.author}!`);
                break;
            case 2:
                message.channel.send("I may be a bot, but I don't understand Klingon 😡");
                break;
            case 3:
                message.channel.send("I may be a bot, but I don't understand Klingon 😡");
                break;
            case 4:
                message.channel.send("I do not know what you mean by that.");
                break;
            case 5:
                message.channel.send("Especially not in that tone of voice. Once again, the magic words are");
                break;
            default:
                break;
        }
        // Print generic help dialogue
        printHelp(args, message);
    }

    // Log to console if command user tried to execute was valid
    if (executedSuccessfully) {
        console.log(chalk.green(`INFO at ` + datetime + `: ` + `user "` + message.author.tag + ` successfully invoked bot command "` + command + `"`));
    }
});
/*======================
* End of commands section
* Misc functions below
=======================*/


// Get UID from message
function getMentionStringForReply(message) {
    let authorId = message.author.id;
    let mentionString = '<@!' + authorId + '>';
    return mentionString;
}

// Get mentions from message
function getUserFromMention(mention) {
    if (!mention) return;

    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        if (mention.startsWith('!')) {
            mention = mention.slice(1);
        }
        return client.users.cache.get(mention);
    }
}

// Check if URL is a youtube video
function isYoutubeLink(url) {

    let yt_rx = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

    // Then we want the video id which is
    if (yt_rx.test(url)) {
        return true;
    }
    else {
        return false;
    }
}

// Print help dialogue
function printHelp(args, message) {

    // check if "!help " was invoked with arguments
    if (args.length) {
        let commandSwitch = args[0].toLowerCase();

        // Simplify command alias to one so we can use swtich case
        if (commandSwitch === 'ytdownloader' | commandSwitch === 'ytdl' | commandSwitch === 'youtubedl' | commandSwitch === 'youtubedownloader') {
            commandSwitch = 'ytdl';
        }

        // Variable to store date
        var datetime = new Date();
        datetime = datetime.toISOString();

        console.log(`INFO at ` + datetime + `: ` + "Printing help for command " + commandSwitch + `' for user '` + message.author.tag);

        switch (commandSwitch) {
            case "freestyle":
                // print help here
                message.channel.send(`Help for:
                **!freestyle**
                *Prints words for freestyling.*

                Parameters **must** always be specified in the following order.

                **Syntax:**
                !freestyle [level 1-10] [amount 1-20] [trainer 0-1]

                **Optional parameters:**
                [level]: Allowed values 1-10
                Defines the difficulty level. Selects very easy words (1) or very difficult words (10).
                
                [amount]: Allowed values 1-20
                Sets the number of words that will be printed.

                [trainer]: Allowed values 0-1
                When the trainer function is activated (1), the words to be printed become increasingly difficult.
                When this function is used, the specified difficulty level is ignored.

                **Examples:**
                !freestyle 4 8
                !freestyle 1 18 1`);
                break;

            case "dbinfo":
                message.channel.send(`Help for:
                **!dbinfo**
                *Prints out information about the word database`);
                break;

            case "cakeday":
                message.channel.send(`Help for:
                **!cakeday**
                *Indicates when your Discord account was created.*`);
                break;

            case "help":
                // :-)
                message.channel.send("Hahaha :-)");
                break;

            case "ping":
                message.channel.send("Replies. For testing. Or something. No idea.");
                break;

            case "ytdl":
                message.channel.send(`Help for:
                **!ytdl**
                *Downloads and converts any YouTube video to mp3.*

                **Syntax:**
                !ytdl [link-to-video]

                **Examples:**
                !ytdl \`https://www.youtube.com/watch?v=dQw4w9WgXcQ\`
                
                **Alias:**
                !ytdl
                !ytdownloader
                !youtubedl
                !youtubedownloader`);
                break;

            default:
                // If "!help" was invoked with an argument but command is unknown
                message.channel.send(`What is this? What do you mean by "` + commandSwitch + `"? I do not know this. Use *!help* for an overview of commands!`);
                break;
        }
    } else {
        // If not, print default help dialogue
        message.channel.send(`**Available commands:**
        !ytdl / !ytdownloader / !youtubedl
        !freestyle
        !cakeday
        !help / !h
        !help *COMMAND* / !h *COMMAND*
        !dbinfo
        !ping`);
    }

}

// Execute code locally on server
function execute(command, callback) {
    try {
        exec(command, function (error, stdout, stderr) { callback(stdout); });
    } catch (err) {
        console.log(chalk.red(err));
    }
};



// Discord bot token, do not share!
try {
    client.login(config.token);
} catch (err) {
    console.error(chalk.red("Login failed: " + err));
}