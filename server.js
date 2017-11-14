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
  if(oauth.authenticated()){
    doTheRobot(oauth.getAccessToken)
  }
  return response.sendFile(__dirname + '/views/index.html')
})

app.get('/logout', function (request, response, next){
  oauth.clearToken()
  response.redirect('/')
})

app.get('/auth-state', function (request, response, next){
  response.status(200).json({authorized: oauth.authenticated()})
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log(`Server Up @${new Date()} on port${listener.address().port}`)
})