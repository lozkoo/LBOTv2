const { Collection } = require("discord.js")
const { readdirSync } = require("fs")
const ascii = require("ascii-table")
const chalk = require("chalk")

const { PREFIX, OWNER } = require(__dirname + "/../config/config")
const table = new ascii().setHeading("Komenda", "Status ładowania")

let uzyteKomendy = "1"

const log = console.log


module.exports = (client, message) => {
    client.commands = new Collection()
    client.aliases = new Collection();
    //cooldowns collections
    const cooldowns = new Collection()

    const commandFiles = readdirSync(__dirname + "/../commands").filter(file =>
    file.endsWith(".js"),
    )

    for (const file of commandFiles) {
        const command = require(__dirname + `/../commands/${file}`)

        if(command.name) {
            client.commands.set(command.name, command)
            table.addRow(file, "✅")
        } else {
            table.addRow(file, "❌ -> brakuje nazwy!")
            continue
        }
    }

    //wyswietl ascii tablee
console.log(table.toString())

client.on("message", (msg) => {
    const { author, guild, channel } = msg

    //sprawdz czy uzytkownik nie jest botem
    if(author.bot) return

    //sprawdz czy wiadomosc rozpoczyna sie od prefixu
    if (!msg.content.startsWith(PREFIX)) return;

    //logi kto uzyl jakiej komendy
    if(msg.channel.type === "text") {
    log(`${msg.author.tag} użył komendy "${msg}" na serwerze "${guild.name}" (ID  serwera: ${guild.id})`)
    }
    if(msg.channel.type === "dm") {
        log(`${msg.author.tag} użył komendy "${msg}" w prywatnej wiadomości.`)
        log(``)
    }
    const args = msg.content.slice(PREFIX.length).trim().split(/ +/g);

    const cmdName = args.shift().toLowerCase();

    

    const cmd = client.commands.get(cmdName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(cmdName))

    //sprawdź czy komenda istnieje

    if (!cmd) return

    if(cmd.guildOnly && !guild) {
        return msg.reply(`Komendy \`${cmdName}\` nie można używać w prywatnej wiadomości!`)
    }

    //------------------------
    //SPRAWDŹ CZY UŻYTKOWNIK JEST WŁAŚCICIELEM
    //------------------------
    if(cmd.ownerOnly) {
    if(author.id !== OWNER) {
            return msg.reply("Tylko właściciel bota może użyć tej komendy!")
        }
    }
    //------------------------
    //SPRAWDŹ PERMISJE
    //------------------------
    //Sprawdź permisje bota
    if(cmd.botPermissions && cmd.botPermissions.length) {
        if(!guild.me.permissionsIn(channel).has(cmd.botPermissions)) {
            return channel.send(`Niestety, nie posiadam permisji do wykonania tej komendy.`)
        }
    }

    //Sprawdź permisje użytkownika
    if(cmd.userPermissions && cmd.userPermissions.length) {
        if(!msg.member.permissionsIn(channel).has(cmd.userPermissions)) {
            return msg.reply(`Nie masz permisji do wykonania tej komendy.`)
        }
    }

    //sprawdź czy komenda jest wyłączona
    if(cmd.enabled === false) {
        return msg.reply(`Ta komenda jest wyłączona!`)
    }

    if(cmd.args && !args.length) {
        let reply = `Nie podałeś żadnego argumentu, ${msg.author}!`

        if(cmd.usage) {
            reply += `\nPoprawne użycie komendy: \`${PREFIX}${cmdName} ${cmd.usage}\``
        }
        return msg.channel.send(reply)
    }



    //sprawdź czy komenda ma cooldown
    if(!cooldowns.has(cmdName)) {
        cooldowns.set(cmdName, new Collection())
    }

    const now = Date.now()
    const timestamps = cooldowns.get(cmdName)
    const cooldownAmount = (cmd.cooldown || 3) * 1000

    if(timestamps.has(msg.author.id)) {
        const expirationTime = timestamps.get(author.id) + cooldownAmount


        if(now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000
            return msg.reply(`Poczekaj ${timeLeft.toFixed(1)}s przed wykonaniem kolejnej komendy!`)
        }
    }

    timestamps.set(author.id, now)

    setTimeout(() => {
    timestamps.delete(author.id)
    }, cooldownAmount);
    
    try {
        cmd.run(msg, args)
        uzyteKomendy++
    } catch(error) {
        console.log(error)
        msg.reply("O nie! Wygląda na to że coś się zepsuło. Jeśli chcesz, możesz zgłosić ten błąd na kanale <#732920057260277800> (#bledy) na PomocnikDEV.")
    }
})
}
