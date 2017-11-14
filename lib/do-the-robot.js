/* global Map */

const rp = require('request-promise-native');
const groupName = 'mp-tof-sims'
const tagFolder = '#by-tag'

module.exports = (getToken) => {

  // create a generic http-request  method
  const request = (method, uri, endpointType, qs={}, headers={}, body, full = false, json = true)=> {
    
    const options = {
      method: method,
      uri: /^https/.test(uri)? uri: 'https://api.mendeley.com'+uri,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: `application/vnd.mendeley-${endpointType}.1+json`
      },
      qs,
      json: json ,
      resolveWithFullResponse: full,
    }
    // copy headers into options
    for (let header in headers){
      if(Object.prototype.hasOwnProperty.call(headers,header)){
        options.headers[header] = headers[header]
      }
    }
    if(typeof body === 'object'){
      options.body = body
    }
    // return request
    return rp(options)
  }
  
  // create http requests
  const get = (uri, endpointType, qs, full)=> request('GET',uri, endpointType, qs, {}, '', full, !full)
  
  const post = (uri, endpointType, body, qs, full)=> request('POST', uri, endpointType, qs, {'Content-Type':`application/vnd.mendeley-${endpointType}.1+json`}, body, full, true)
  
  const del =  (uri)=> request('DELETE',uri, '', {}, {}, '')
  
  
  // create a function which returns a pagination handler
  const paginationHandler = (type, query={}) =>{
    let items = []
    return function handleResponse (response){
      // add items to list
      items = [...items, ...JSON.parse(response.body)]
      // get pagination links
      const links = response.headers.link || ''
      const next = /<(.*)>/.exec(links.split(',').find(link => /rel\=\"next\"/.test(link)))
      // recurse if there is another page
      if(next){
        return get(next[1],type,query,true).then(handleResponse)
      }
      // or return items if all done
      return Promise.resolve(items)
    }
  }
  
  // create a function which can get all from a paginated uri
  const getAll = (uri, endpointType, qs={}) => get(uri, endpointType, qs, true).then(paginationHandler(endpointType, qs))
  
  // create a function to return Title Case
  const toTitleCase = txt => txt.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()})
  
  let group = null
  let docsByTag = null
  let parentFolder = null
  let tagFolders = null
  
  console.log(`*************************
I'm doing the robot @${new Date()}
*************************`)
  
  // test get groups
  get('/groups','group')
  // start getting paginated results for documnets owned by mp-tof-sims
    .then( groups => {
      console.log('Group List Read')
      // pull out relevant group
      group = groups.find((group)=>group.name === groupName)
      if (group)
      {
        return getAll('/documents', 'document', {group_id :group.id,view:'tags'})
      }
      return Promise.reject(new Error(`No Groupname matching ${groupName} found`))
    })
    .then( documents =>{
      console.log('Documents in Library Read')
      //extract a list of unique tags from each document
      docsByTag = documents.reduce( (map, document) => (document.tags|| []).map(toTitleCase).reduce( (map, tag)=> map.set(tag, [...(map.get(tag)||[]) ,document.id]), map), new Map())
      return getAll('/folders', 'folder', {group_id:group.id})
    })
    .then( folders => {
      console.log('Folders Listed')
      // find the parent folder 
      parentFolder = folders.find((folder)=> folder.name === tagFolder)
      // find the tag sub folders
      tagFolders = new Map(folders.filter( folder => folder.parent_id === parentFolder.id).map( folder => [toTitleCase(folder.name), folder ]))
      // find the folders to create
      const foldersToCreate = [...docsByTag.keys()].filter( folder => !tagFolders.has(folder))
      return Promise.all(foldersToCreate.map( name => post('/folders','folder',{name:name, parent_id:parentFolder.id, group_id:group.id})))
  })
    .then( newFolders => {
      console.log('Folders Created')
      // add the new folder objects to the tag folders Map
      newFolders.forEach(newFolder => {tagFolders.set(newFolder.name, newFolder)})
      // create 
      let documentUpdaters = []
      tagFolders.forEach( folder => {
        documentUpdaters.push(
          // get the folders in the files
          get(`/folders/${folder.id}/documents`,'document')
            .then( documentsInFolder => {
              console.log(`Documents for ${folder.name} listed`)
              // create a list of documents to remove
              const documents = docsByTag.get(toTitleCase(folder.name))
              const documentsToRemove = documentsInFolder.filter( document => !documents.includes(document.id))
              const documentsToAdd = documents.filter( document => !documentsInFolder.find( folderDocument => folderDocument.id === document))
              // Promise all on adding
              return Promise.all(documentsToAdd.map( document => post(`/folders/${folder.id}/documents`, 'document', {id:document}))).then( _=>{
                console.log(`Documents for ${folder.name} added`)
                return Promise.all( documentsToRemove.map( document => del(`/folders/${folder.id}/documents/${document.id}`)))
              })
          })
        )
      })
    return Promise.all(documentUpdaters) 
  })
  .then( _ => {
    console.log('** DONE **')
  })
  .catch(error => console.log('ERROR!', error.message || error))
}