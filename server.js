const express = require('express')
const doTheRobot = require('./lib/do-the-robot.js')

// create express app
const app = express()

// add oauth functionality
const oauth = require('./lib/oauth.js')(app, {
  id:process.env.MENDELEY_CLIENT_ID,
  secret:process.env.MENDELEY_CLIENT_SECRET,
  tokenHost: 'https://api.mendeley.com',
  hostname:`https://${process.env.PROJECT_DOMAIN}.glitch.me`,
  successUri:'/',
  authUri:'/auth'
})

//set static resource serving
app.use(express.static('public'))

// default route - serve index.html
app.get('/', function (request, response, next) {
  
  // redirect to auth if required
  if(!oauth.authenticated()){
    return response.redirect('/auth')
  }
  doTheRobot(oauth.getAccessToken, request, response, next)
  return response.sendFile(__dirname + '/views/index.html')
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log(`Robot listening on ${listener.address().port}`)
})