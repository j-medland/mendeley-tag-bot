## Mendeley Tag Bot
After having had some troubling importing my Zotero Library I created this bot which uses the [medendeley API](http://dev.mendeley.com/) to manipulate your libraries programatically.

Dealing with O-Auth was a pain and I have yet to work out exactly how to use the npm @mendeley sdk so this uses raw requests (watch your Accept and Content-Type Headers) after some initial auth.

Hit up the [Show Live](https://mendeley-tag-bot.glitch.me/) to make it perform the task in `lib/do-the-robot.js`

Make sure you authorize the application using the dev.mendeley portal!

The redirect url should be `https://<Your-Project-Name>.glitch.me/auth/token-exchange`

Get the ID (4 or so numbers) and the secret (some string) and place them in the .env file like:

```
# Environment Config

# store your secrets and config variables in here
# only invited collaborators will be able to see your .env values

# reference these in your code with process.env.SECRET

MENDELEY_CLIENT_ID=nnnn
MENDELEY_CLIENT_SECRET=aBcDe1234

# note: .env is a shell file so there can't be spaces around =
```


