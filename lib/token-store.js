const fs = require('fs')  

/// define a TokenStore
  const tokenStore = new function (){
    // file storage path
    let file = '.data/oauth-token'
    // ensure that dir already exists
    try{
      fs.mkdirSync('.data')
    }
    catch (error){
      // dire already exists - ignore
    }
    function load (){
      try{
        return JSON.parse(fs.readFileSync(file,'utf-8'))
      }
      catch (e){
        // file does not exist yet
        return {access_token:'', token_type:'',expires_in:0, refresh_token:'', msso:'', scope:'',"expires_at":'0'}
      }
    }
    
    return (token)=> { 
      if(typeof token === 'undefined'){
        return load()
      }
      return fs.writeFileSync(file, JSON.stringify(token))
    }
  }
  
  module.exports = tokenStore