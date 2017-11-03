const rp = require('request-promise-native');
const groupName = 'mp-tof-sims'

module.exports = (getToken, response, request, next) => {

  // create a http-getter
  const get = (uri, endpointType, qs={}, full = false)=> rp({
      uri: uri,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: `application/vnd.mendeley-${endpointType}.1+json`
      },
      qs,
      json: !full ,
      resolveWithFullResponse: full
    })
  
  // create a function which returns a pagination handler
  const paginationHandler = (type, query={}) =>{
    return function handleResponse (response){
      // init item holder
      if(typeof this.items === 'undefined'){
        this.items = []
      }
      // add items to list
      this.items = [...this.items, ...JSON.parse(response.body)]
      // get pagination links
      const links = response.headers.link || ''
      const next = /<(.*)>/.exec(links.split(',').find(link => /rel\=\"next\"/.test(link)))
      // recurse if there is another page
      if(next){
        return get(next[1],type,query,true).then(handleResponse)
      }
      // or return items if all done
      return Promise.resolve(this.items)
    }
  }
  
  // test get groups
  get('https://api.mendeley.com/groups','group')
  // start getting paginated results for documnets owned by mp-tof-sims
    .then( groups => get('https://api.mendeley.com/documents', 'document', {group_id :groups.find((group)=>group.name === groupName).id,view:'tags', }, true))
    .then(paginationHandler('document'))
    .then((documents)=>{
      //extract a list of unique tags from each document
      const tags = documents.reduce( (all, document) =>{
        const tags = document.tags || []
        const newTags = tags.filter( (tag) =>{
          const tagRegExp = new RegExp(tag,'i')
          return !all.find( exisitingTag => exisitingTag.match(tagRegExp))
        })
        return [...all,...newTags]
      },[])
      console.log(tags)
    })
    .catch(error => console.log(JSON.stringify(error)))
}