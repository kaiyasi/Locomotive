# Locomotive Parking Bot

![Locomotive Parking Bot banner](assets/locomotive-banner.png)

A small Telegram bot for saving motorcycle parking locations and finding them again later.

## Choose how to use it

### Use the hosted bot

Open [@locomotiver_bot](https://t.me/locomotiver_bot) in Telegram and send `/start`.

There is nothing to install or configure. This is the easiest way to try Locomotive. Your parking record is handled by the hosted service; self-host the bot if you need full control over the runtime and stored data.

### Self-host your own bot

Run your own instance with your own Telegram bot token and local data storage.

#### Requirements

- Node.js 20 or newer
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

#### Quick start

```bash
cp .env.example .env
```

Set at least `BOT_TOKEN` in `.env`:

```dotenv
BOT_TOKEN=123456:replace-with-your-token
ALLOWED_USER_IDS=123456789
```

`ALLOWED_USER_IDS` is a comma-separated list of Telegram user IDs. Set it when the bot should be private. If it is empty, any user can use the bot in a private chat.

Start the bot:

```bash
npm install
npm start
```

For development:

```bash
npm run dev
```

## Usage

Open the bot in Telegram and send `/start`.

The main actions are:

- `記一下位置` — save the current Telegram location
- `我停哪裡？` — show the saved location and a map link
- `補個備註` — add or update a note, such as a floor or space number
- `刪掉這筆` — delete the saved location

The following commands are also supported:

```text
/save
/where
/note
/note <text>
/delete
/help
```

Use `/note 清除` to remove the current note.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `BOT_TOKEN` | Yes | Telegram bot token |
| `ALLOWED_USER_IDS` | No | Comma-separated Telegram user IDs |
| `DATA_FILE` | No | Data file path; defaults to `data/parking.json` |
| `POLL_INTERVAL_MS` | No | Polling interval in milliseconds |
| `TELEGRAM_TIMEOUT_MS` | No | Telegram API timeout in milliseconds |

## Data and privacy

Self-hosted parking records are stored locally in `data/parking.json` by default. The file is ignored by Git and written atomically to reduce the chance of partial data after an interrupted write.

Each user can only access their own record. The bot uses Telegram long polling and does not require a public HTTP endpoint.

Treat the data directory and `BOT_TOKEN` as private. Never commit `.env` or production data to the repository.

## Testing

```bash
npm test
```

## License

This project is intended to be released as open source. Add a license file before publishing the repository.
