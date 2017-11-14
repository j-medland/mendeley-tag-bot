// all the oauth stuff - routes etc
const fs = require('fs')
const crypto = require('crypto')
const tokenStore = require('./token-store.js')


module.exports= function (app, config){
  
  const authTokenUri = config.authUri + '/token-exchange'
  // creat oauth2 object from config
  const oauth2 = require('simple-oauth2').create({
    client:{
      id:config.id,
      secret:config.secret
    },
    auth:{
      tokenHost: config.tokenHost
    }
  })
  
  // generate the URI that the token will be returned to
  // this must match iven when reigistering the mendeley api
  const exchangeUri = `${config.hostname+authTokenUri}`
  
  //define a function to store the new token
  const newToken = token => {
    //store token (sometimes it is wrapped in a oauth 'token' object)
    const t = token.token || token
    // compute expires_at if required
    if(typeof t.expires_at === 'undefined' || !t.expires_at){
      t.expires_at = new Date(+new Date() + t.expires_in*60)
    }
    tokenStore(t)
    //return a promise
    return Promise.resolve()
  }
  
  // add route so we can handle callback
  app.get(authTokenUri , (request, response, next) => {
      // grab the url param code from the requrest
      const code = request.query.code
      // request the token
      oauth2.authorizationCode.getToken({
        code,
        redirect_uri:exchangeUri
      })
        .then(newToken)
        .then( ()=>{
        // redirect to sucess page
        response.redirect(config.successUri)
        next()
      })
        .catch( error =>{
        // redirect to authenticate again
        response.redirect(config.authUri)
        next()
      })
  })
  
  // define functions to determine simplify token handling
  const getAccessToken = ()=> tokenStore().access_token
  const getRefreshToken = () => tokenStore().refresh_token
  const authenticated = () => {
    const token = tokenStore()
    return token.access_token !== '' && new Date(token.expires_at) > new Date()
  }
  
  // add the auth route which will be used when autherization is required
  app.get(config.authUri, (request, response, next) => {
            
    if(!authenticated()){
    // get refresh token 
    if(getRefreshToken()){
      // only need to refresh
      oauth2.accessToken.create(tokenStore())
        .refresh()
        .then(newToken)
        .then(()=>{
          response.redirect(config.successUri)
        })
      .catch( error =>{
        // redirect to authenticate again
        response.redirect(config.authUri)
        next()
      })  
    }
    else {
      // redirect to mendeley's login for new token
      response.redirect(oauth2.authorizationCode.authorizeURL(
        {
          redirect_uri: exchangeUri,
          state: crypto.randomBytes(20).toString('base64'),
          scope: 'all'
        }))
      next()
    }
  }
    else{
    return response.redirect(config.successUri)
    }
  })
  return { authenticated, getAccessToken, getRefreshToken, clearToken: ()=> ( tokenStore({clear:true})) }
}