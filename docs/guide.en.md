## What it's for

`*/15 8-18 * * 1-5`: does anyone really re-read what that means? This script turns a cron expression into a plain sentence and shows its **next runs**, so you can check a schedule before putting it in production.

## Before you start

- A 5-field cron expression: minute, hour, day of month, month, day of week.

## Step by step

1. Explain and compute:
   ```bash
   node src/cron-explain.mjs "*/15 8-18 * * 1-5" --count 5 --lang en
   ```
2. The explanation is in French by default: add `--lang en` for English. To simulate from a date: `--from 2026-12-31T20:00:00Z`.
3. Check the dates shown match what you expected.

## Reading the output

The sentence ("Every 15 minutes, from 08:00 to 18:59, Monday through Friday") then the next dates **in UTC**. When both a day of month **and** a day of week are set, classic cron semantics apply: the job runs if **either** matches.

## Automating it

Nothing to schedule here: it is a review tool. Paste the sentence into your scheduled job's documentation.

## Pitfalls

- Times are in **UTC**: shift for your server's time zone (Lomé is UTC+0, Paris UTC+1 or +2).
- Some schedulers accept extended syntax (seconds, `L`, `?`) that this script does not handle.
