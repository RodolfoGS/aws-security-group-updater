# aws-security-group-updater

Script to keep updated your IP on an AWS Security Group using NodeJS.

## How to configure
1. Clone this repository
2. `npm install`
3. Duplicate `.env.example` to `.env`
4. Update `.env` values
5. `node run.js`

## How to add to crontab
1. `crontab -e`
2. Add this:
```
# aws-security-group-updater
*/15 * * * * node ~/aws-security-group-updater/run.js >/dev/null 2>&1
```
