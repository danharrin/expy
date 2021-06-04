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

### API Tokens

`$token` - Get a new API token for this guild.

`$revoketoken <token>` - Revoke an API token for this guild.

## API

### Authentication

To authenticate with the API, you will need to issue a token for your guild using the `$token` command.

Send this token in the `Authorization` header of all HTTP requests:

```
Authorization: Bearer i1r2mkm0u3dlvoesvpgg9
```

### Fetching a member

```
GET https://expy.xyz/api/guilds/:id/members/:id
```

This will return a JSON object representation of the member, with the following properties:

| Property | Description |
|--|--|
| `id` | The member's ID. |
| `guild_id` | The member's guild ID. |
| `is_blacklisted` | The member's blacklist status. |
| `level` | The member's level. |
| `xp` | The member's XP. |

### Updating a member's XP

```
PATCH https://expy.xyz/api/guilds/:id/members/:id
```

You may either send a new XP for the member, or a change to their existing XP:

| Property | Description |
|--|--|
| `xp` | The member's new XP. |
| `xpChange` | The amount to change the member's XP by. |
