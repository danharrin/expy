# Expy

Discord bot for member XP and ranking.

## Commands

`$rank <member>` - Check a member's XP and level.

`$leaderboard <page>` - Display's a server-wide XP leaderboard.

`$status` - Check the bot's status.

### Managing XP

`$reward <member> <xp>` - Increases a member's XP.

`$sanction <member> <xp>` - Decreases a member's XP.

`$setxp <member> <xp>` - Sets a member's XP.

`$setlevel <member> <level>` - Sets a member's level.

### Settings

`$prefix` - Sets the bot's command prefix. By default, it is `$`.

`$blacklist` - Displays a list of the guild's blacklisted channels and members.

`$blacklist <channel or member>` - Toggle a channel or member on the blacklist.

`$ranks` - Displays a list of the guild's ranks.

`$addrank <level> <role>` - Automatically assign a role when a member reaches a level.

`$removerank <level or role>` - Remove a role that is automatically assigned when a member reaches a level.
