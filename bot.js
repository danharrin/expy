const config = {
    /**
     * The higher the number, the less XP is required to reach the next level.
     */
    levelConstant: 0.25,

    /**
     * The number of characters in an average message.
     */
    xpIncreaseConstant: 200,
}

require('dotenv').config()

const Discord = require('discord.js')
const client = new Discord.Client()

const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    dialect: process.env.DB_CONNECTION,
    host: process.env.DB_HOST,
    logging: false,
})

const BlacklistedChannel = sequelize.define('blacklisted_channels', {
    guild_id: Sequelize.BIGINT.UNSIGNED,
}, {
    timestamps: false,
})

const Guild = sequelize.define('guilds', {
    prefix: {
        type: Sequelize.STRING,
        defaultValue: '$',
    },
}, {
    timestamps: false,
})

const Member = sequelize.define('members', {
    guild_id: Sequelize.BIGINT.UNSIGNED,
    is_blacklisted: {
        type: Sequelize.BOOLEAN,
        defaultValue: 0,
    },
    is_member: {
        type: Sequelize.BOOLEAN,
        defaultValue: 1,
    },
    joined_voice_at: Sequelize.DATE,
    last_level_reported: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
    },
    user_id: Sequelize.BIGINT.UNSIGNED,
    xp: {
        type: Sequelize.BIGINT.UNSIGNED,
        defaultValue: 0,
    },
}, {
    timestamps: false,
})

const Rank = sequelize.define('ranks', {
    guild_id: Sequelize.BIGINT.UNSIGNED,
    level: Sequelize.INTEGER.UNSIGNED,
    role_id: Sequelize.BIGINT.UNSIGNED,
}, {
    timestamps: false,
})

const Token = sequelize.define('tokens', {
    guild_id: Sequelize.BIGINT.UNSIGNED,
    key: Sequelize.STRING,
}, {
    timestamps: false,
})

const calculateLevel = (xp) => {
    return Math.floor(Math.sqrt(+xp) * config.levelConstant)
}

const calculateXp = (level) => {
    return Math.floor(Math.pow(+level / config.levelConstant, 2))
}

client.on('guildMemberAdd', async (member) => {
    if (member.bot) return

    let memberToAdd = await Member.findOne({ where: { guild_id: member.guild.id, user_id: member.id }})

    if (! memberToAdd) memberToAdd = await Member.create({ guild_id: member.guild.id, user_id: member.id })

    if (! memberToAdd.is_member) await memberToAdd.update({ is_member: true })

    let ranks = await Rank.findAll({ order: [['level', 'DESC']], where: { guild_id: member.guild.id } })

    if (ranks.length) {
        let level = calculateLevel(memberToAdd.xp)

        let correctRank = ranks.find((rank) => +rank.level <= level)

        ranks.forEach((rank) => {
            if (correctRank && rank.role_id === correctRank.role_id) return

            member.roles.remove(rank.role_id)
        })

        if (correctRank) member.roles.add(correctRank.role_id)
    }
})

client.on('guildMemberRemove', async (member) => {
    if (member.bot) return

    let memberToDeactivate = await Member.findOne({ where: { guild_id: member.guild.id, user_id: member.id }})

    if (memberToDeactivate && memberToDeactivate.is_member) member = await memberToDeactivate.update({ is_member: false })
})

client.on('message', async (msg) => {
    if (msg.webhookID) return

    if (msg.author.bot) return

    let guild = await Guild.findOne({ where: { id: msg.guild.id } })

    if (! guild) guild = await Guild.create({ id: msg.guild.id })

    let member = await Member.findOne({ where: { guild_id: msg.guild.id, user_id: msg.author.id }})

    if (! member) member = await Member.create({ guild_id: msg.guild.id, user_id: msg.author.id })

    let channelIsBlacklisted = await BlacklistedChannel.findOne({ where: { id: msg.channel.id } })

    if (! member.is_blacklisted && ! channelIsBlacklisted) {
        let xpIncrease = 1 + Math.floor(msg.content.length / config.xpIncreaseConstant)

        await member.update({ xp: member.xp + xpIncrease })

        let level = calculateLevel(member.xp)

        let ranks = await Rank.findAll({ order: [['level', 'DESC']], where: { guild_id: msg.guild.id } })

        if (ranks.length) {
            let correctRank = ranks.find((rank) => +rank.level <= +level)

            ranks.forEach((rank) => {
                if (correctRank && rank.role_id === correctRank.role_id) return

                msg.member.roles.remove(rank.role_id)
            })

            if (correctRank) msg.member.roles.add(correctRank.role_id)
        }

        if (member.last_level_reported < level) {
            msg.channel.send({
                embed: {
                    color: 0xc026d3,
                    description: `You just reached level ${level}.`,
                    thumbnail: {
                        url: msg.author.displayAvatarURL(),
                    },
                    timestamp: new Date(),
                    title: `Congratulations ${msg.author.username}!`,
                },
            })

            await member.update({ last_level_reported: level })
        }
    }

    let prefix = guild.prefix

    if (msg.content === `<@!${client.user.id}>`) return msg.reply(`this server's Expy prefix is \`${prefix}\`.`)

    if (! msg.content.startsWith(prefix)) return

    let args = msg.content.slice(prefix.length).trim().split(/ +/g)

    const command = args.shift().toLowerCase()

    if (command === 'addrank' || command === 'ar') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (args.length < 2) return msg.reply(`please specify a level and a role.`)

        let levelToAdd = +args[0]

        if (! Number.isInteger(levelToAdd) || levelToAdd < 0) return msg.reply(`please specify a level to create the rank for.`)

        let roleToAdd = msg.mentions.roles.first() || msg.guild.roles.cache.find((role) => +role.id === +args[1] || role.name.toLowerCase() === args[1].toLowerCase())

        if (! roleToAdd) return msg.reply(`please specify a role to create the rank for.`)

        let existingRankWithSameRole = await Rank.findOne({ where: { guild_id: msg.guild.id, role_id: roleToAdd.id }})

        if (existingRankWithSameRole) existingRankWithSameRole.destroy()

        let existingRankWithSameLevel = await Rank.findOne({ where: { guild_id: msg.guild.id, level: levelToAdd }})

        if (existingRankWithSameLevel) existingRankWithSameLevel.destroy()

        await Rank.create({ guild_id: msg.guild.id, level: levelToAdd, role_id: roleToAdd.id })

        return msg.reply(`the ${roleToAdd.name} role has been assigned to level ${levelToAdd}.`)
    }

    if (command === 'blacklist' || command === 'bl') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (args.length < 1) {
            let blacklistedChannels = await BlacklistedChannel.findAll({ where: { guild_id: msg.guild.id } })

            let blacklistedChannelsList = ''

            blacklistedChannels.forEach((blacklistedChannel) => {
                let channel = msg.guild.channels.cache.find((channel) => +channel.id === +blacklistedChannel.id)

                if (! channel) return

                if (blacklistedChannelsList.length) blacklistedChannelsList += ', '

                blacklistedChannelsList += `${channel}`
            })

            let blacklistedMembers = await Member.findAll({ where: { guild_id: msg.guild.id, is_blacklisted: true, is_member: true } })

            let blacklistedMembersList = ''

            blacklistedMembers.forEach((blacklistedMember) => {
                let member = msg.guild.members.cache.find((member) => +member.id === +blacklistedMember.user_id)

                if (! member) return

                if (blacklistedMembersList.length) blacklistedMembersList += ', '

                blacklistedMembersList += `${member}`
            })

            return msg.channel.send({
                embed: {
                    color: 0xc026d3,
                    fields: [
                        {
                            name: 'Blacklisted channels',
                            value: blacklistedChannelsList !== '' ? blacklistedChannelsList : 'None',
                        },
                        {
                            name: 'Blacklisted members',
                            value: blacklistedMembersList !== '' ? blacklistedMembersList : 'None',
                        },
                    ],
                    thumbnail: {
                        url: msg.guild.iconURL(),
                    },
                    timestamp: new Date(),
                    title: `Blacklist`,
                },
            })
        }

        let memberToBlacklist = msg.mentions.members.first() || msg.guild.members.cache.find((member) => +member.id === +args[0])

        if (memberToBlacklist) {
            let member = await Member.findOne({ where: { guild_id: msg.guild.id, user_id: memberToBlacklist.id }})

            if (! member) member = await Member.create({ guild_id: msg.guild.id, user_id: memberToBlacklist.id })

            await member.update({ is_blacklisted: ! member.is_blacklisted })

            let actionDescription = member.is_blacklisted ? 'blacklisted' : 'unblacklisted'

            return msg.reply(`${memberToBlacklist} has been ${actionDescription}.`)
        }

        let channelToBlacklist = msg.mentions.channels.first() || msg.guild.channels.cache.find((channel) => +channel.id === +args[0])

        if (! channelToBlacklist) return msg.reply(`please specify a member or channel to blacklist.`)

        let blacklistedChannel = await BlacklistedChannel.findOne({ where: { id: channelToBlacklist.id }})

        let actionDescription = 'blacklisted'

        if (! blacklistedChannel) await BlacklistedChannel.create({ id: channelToBlacklist.id, guild_id: msg.guild.id })

        if (blacklistedChannel) {
            await blacklistedChannel.destroy()

            actionDescription = 'unblacklisted'
        }

        return msg.reply(`${channelToBlacklist} has been ${actionDescription}.`)
    }

    if (command === 'leaderboard') {
        let page = +args[0]

        if (! page || ! Number.isInteger(page) || page < 1) page = 1

        const pageSize = 10

        let members = await Member.findAll({ limit: pageSize, offset: (page * pageSize) - pageSize, order: [['xp', 'DESC']], where: { guild_id: msg.guild.id, is_blacklisted: false, is_member: true } })

        if (! members.length) {
            page = 1

            members = await Member.findAll({ limit: pageSize, offset: (page * pageSize) - pageSize, order: [['xp', 'DESC']], where: { guild_id: msg.guild.id, is_blacklisted: false, is_member: true } })
        }

        let embedFields = []

        members.forEach((memberToAdd, index) => {
            let member = msg.guild.members.cache.find((member) => +member.id === +memberToAdd.user_id)

            if (! member) return

            let position = (page * pageSize) - pageSize + index + 1

            let level = calculateLevel(memberToAdd.xp)

            embedFields.push({
                name: `#${position} - ${member.user.tag}`,
                value: `Level ${level} - ${memberToAdd.xp} XP`,
            })
        })

        return msg.channel.send({
            embed: {
                color: 0xc026d3,
                fields: embedFields,
                thumbnail: {
                    url: msg.guild.iconURL(),
                },
                timestamp: new Date(),
                title: `Leaderboard${ page > 1 ? ` - Page ${page}` : '' }`,
            },
        })
    }

    if (command === 'level' || command === 'rank' || command === 'xp') {
        let memberToReport = msg.mentions.members.first() || msg.guild.members.cache.find((member) => +member.id === +args[0]) || msg.member

        let member = await Member.findOne({ where: { guild_id: msg.guild.id, user_id: memberToReport.id }})

        if (! member) member = await Member.create({ guild_id: msg.guild.id, user_id: memberToReport.id })

        if (member.is_blacklisted) return msg.reply('you have been blacklisted from receiving any XP.')

        let level = calculateLevel(member.xp)

        let nextLevelXp = calculateXp(level + 1)

        return msg.channel.send({
            embed: {
                color: 0xc026d3,
                description: `${member.xp} / ${nextLevelXp} XP`,
                thumbnail: {
                    url: memberToReport.user.displayAvatarURL(),
                },
                timestamp: new Date(),
                title: `${memberToReport.user.username} - Level ${level}`,
            },
        })
    }

    if (command === 'modifyxp') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (args.length < 2) return msg.reply(`please specify a member and the amount to modify their XP by.`)

        let memberToModify = msg.mentions.members.first() || msg.guild.members.cache.find((member) => +member.id === +args[0])

        if (! memberToModify) return msg.reply(`please specify a member to modify.`)

        let xpChange = +args[1]

        if (! xpChange || ! Number.isInteger(xpChange)) return msg.reply(`please specify the amount to modify the member's XP by.`)

        let member = await Member.findOne({ where: { guild_id: msg.guild.id, user_id: memberToModify.id }})

        if (! member) member = await Member.create({ guild_id: msg.guild.id, user_id: memberToModify.id })

        let newXp = member.xp + xpChange

        if (newXp < 0) newXp = 0

        await member.update({ xp: newXp })

        let ranks = await Rank.findAll({ order: [['level', 'DESC']], where: { guild_id: msg.guild.id } })

        let newLevel = calculateLevel(newXp)

        if (ranks.length) {
            let correctRank = ranks.find((rank) => +rank.level <= newLevel)

            ranks.forEach((rank) => {
                if (correctRank && rank.role_id === correctRank.role_id) return

                memberToModify.roles.remove(rank.role_id)
            })

            if (correctRank) memberToModify.roles.add(correctRank.role_id)
        }

        return msg.reply(`${memberToModify} now has ${newXp} XP and is on level ${newLevel}.`)
    }

    if (command === 'prefix') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (! args[0]) return msg.reply(`this server's Expy prefix is \`${prefix}\`.`)

        prefix = args[0]

        await guild.update({
            prefix: prefix,
        })

        return msg.reply(`this server's Expy prefix is now \`${prefix}\`.`)
    }

    if (command === 'ranks') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        let ranks = await Rank.findAll({ order: [['level', 'ASC']], where: { guild_id: msg.guild.id } })

        let embedFields = []

        ranks.forEach((rank) => {
            let role = msg.guild.roles.cache.find((role) => +role.id === +rank.role_id)

            if (! role) return

            embedFields.push({
                name: role.name,
                value: `Level ${rank.level}`,
            })
        })

        if (! embedFields.length) return msg.reply(`this guild does not have any ranks currently set up. You can create your first using \`${prefix}addrank <level> <role>\`.`)

        return msg.channel.send({
            embed: {
                color: 0xc026d3,
                fields: embedFields,
                thumbnail: {
                    url: msg.guild.iconURL(),
                },
                timestamp: new Date(),
                title: `Ranks`,
            },
        })
    }

    if (command === 'removerank' || command === 'rr') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (args.length < 1) return msg.reply(`please specify a level or a role to remove the rank for.`)

        let levelToRemove = +args[0]

        if (Number.isInteger(levelToRemove)) {
            let rankToRemove = await Rank.findOne({ where: { guild_id: msg.guild.id, level: levelToRemove }})

            if (rankToRemove) {
                rankToRemove.destroy()

                return msg.reply(`the rank for level ${levelToRemove} has been removed.`)
            }
        }

        let roleToRemove = msg.mentions.roles.first() || msg.guild.roles.cache.find((role) => +role.id === +args[0] || role.name.toLowerCase() === args[0].toLowerCase())

        if (! roleToRemove) return msg.reply(`please specify a role to remove the rank for.`)

        let rankToRemove = await Rank.findOne({ where: { guild_id: msg.guild.id, role_id: roleToRemove.id }})

        if (rankToRemove) rankToRemove.destroy()

        return msg.reply(`the rank for ${roleToRemove.name} has been removed.`)
    }

    if (command === 'revoketoken') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        let key = args[0]

        if (! key) msg.reply('please specify a token to revoke.')

        await Token.destroy({ where: { guild_id: msg.guild.id, key: key } })

        let reply = await msg.reply(`the token \`${key}\` has been revoked.`)
    }

    if (command === 'setlevel') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (args.length < 2) return msg.reply(`please specify a member and the level to set.`)

        let memberToModify = msg.mentions.members.first() || msg.guild.members.cache.find((member) => +member.id === +args[0])

        if (! memberToModify) return msg.reply(`please specify a member to modify.`)

        let newLevel = +args[1]

        if (newLevel < 0) newLevel = 0

        if (! Number.isInteger(newLevel)) return msg.reply(`please specify the member's new level.`)

        let member = await Member.findOne({ where: { guild_id: msg.guild.id, user_id: memberToModify.id }})

        if (! member) member = await Member.create({ guild_id: msg.guild.id, user_id: memberToModify.id })

        let newXp = calculateXp(newLevel)

        await member.update({ xp: newXp })

        let ranks = await Rank.findAll({ order: [['level', 'DESC']], where: { guild_id: msg.guild.id } })

        if (ranks.length) {
            let correctRank = ranks.find((rank) => +rank.level <= newLevel)

            ranks.forEach((rank) => {
                if (correctRank && rank.role_id === correctRank.role_id) return

                memberToModify.roles.remove(rank.role_id)
            })

            if (correctRank) memberToModify.roles.add(correctRank.role_id)
        }

        return msg.reply(`${memberToModify} now has ${newXp} XP and is on level ${newLevel}.`)
    }

    if (command === 'setxp') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        if (args.length < 2) return msg.reply(`please specify a member and the XP to set.`)

        let memberToModify = msg.mentions.members.first() || msg.guild.members.cache.find((member) => +member.id === +args[0])

        if (! memberToModify) return msg.reply(`please specify a member to modify.`)

        let newXp = +args[1]

        if (newXp < 0) newXp = 0

        if (! Number.isInteger(newXp)) return msg.reply(`please specify the member's new XP.`)

        let member = await Member.findOne({ where: { guild_id: msg.guild.id, user_id: memberToModify.id }})

        if (! member) member = await Member.create({ guild_id: msg.guild.id, user_id: memberToModify.id })

        await member.update({ xp: newXp })

        let ranks = await Rank.findAll({ order: [['level', 'DESC']], where: { guild_id: msg.guild.id } })

        let newLevel = calculateLevel(newXp)

        if (ranks.length) {
            let correctRank = ranks.find((rank) => +rank.level <= newLevel)

            ranks.forEach((rank) => {
                if (correctRank && rank.role_id === correctRank.role_id) return

                memberToModify.roles.remove(rank.role_id)
            })

            if (correctRank) memberToModify.roles.add(correctRank.role_id)
        }

        return msg.reply(`${memberToModify} now has ${newXp} XP and is on level ${newLevel}.`)
    }

    if (command === 'status') {
        const res = await msg.channel.send('Ping?')

        return res.edit(`Pong! Latency is ${res.createdTimestamp - msg.createdTimestamp}ms.`)
    }

    if (command === 'token') {
        if (! msg.member.hasPermission('ADMINISTRATOR')) return

        let key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

        await Token.create({ guild_id: msg.guild.id, key: key })

        let reply = await msg.reply(`your new token is \`${key}\`. Please keep this a secret. This message will self-destruct in 10 seconds.`)
    
        setTimeout(() => {
            reply.delete()
        }, 10000)
    }
})

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (! oldState.channel && newState.channel) {
        let member = await Member.findOne({ where: { guild_id: newState.guild.id, user_id: newState.member.id }})

        if (! member) member = await Member.create({ guild_id: newState.guild.id, user_id: newState.member.id })

        if (member.is_blacklisted) return

        let channelIsBlacklisted = await BlacklistedChannel.findOne({ where: { id: newState.channel.id } })

        if (channelIsBlacklisted) return await member.update({ joined_voice_at: null })

        await member.update({ joined_voice_at: new Date() })
    }

    if (oldState.channel && ! newState.channel) {
        let member = await Member.findOne({ where: { guild_id: oldState.guild.id, user_id: oldState.member.id }})

        if (! member) member = await Member.create({ guild_id: oldState.guild.id, user_id: oldState.member.id })

        if (member.is_blacklisted) return

        let channelIsBlacklisted = await BlacklistedChannel.findOne({ where: { id: oldState.channel.id } })

        if (channelIsBlacklisted) return await member.update({ joined_voice_at: null })

        if (! member.joined_voice_at) return

        let duration = Math.round(new Date().getMinutes() - new Date(member.joined_voice_at).getMinutes())

        let newXp = member.xp + duration

        await member.update({ joined_voice_at: null, xp: newXp })
    }
})

client.login(process.env.DISCORD_BOT_TOKEN)