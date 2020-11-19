# aws-security-group-updater

Script to keep updated your IP on an AWS Security Group using NodeJS.

## How to configure
1. Duplicate `.env.example` to `.env`
2. Update `.env` values
3. `node run.js`

## How to add to crontab
1. `crontab -e`
2. Add this:
```
# aws-security-group-updater
*/15 * * * * node ~/aws-security-group-updater/run.js >/dev/null 2>&1
```
