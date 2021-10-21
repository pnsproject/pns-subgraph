
import fetch from 'cross-fetch';
import pkg from '@apollo/client';
const { ApolloClient, InMemoryCache, gql,HttpLink } = pkg;


const theGraphURL = "http://moonbeam.pns.link:8000/subgraphs/name/pns";

const theGraphClient = new ApolloClient({
  link: new HttpLink({ uri: theGraphURL, fetch }),
  cache: new InMemoryCache()
});

const domainsQuery = `
  query($first: Int) {
    domains(first: $first,where:{name:"yeliying123"}) {
      id
      name
      labelHash
      owner
      expires
    }
  }
`

theGraphClient.query({
  query: gql(domainsQuery),
  variables: {
    first: 10
  }
})
.then(data => 
  console.log("Subgraph data: ", data)
  )
.catch(err => { 
  console.log("Error fetching data: ", err) 
});



const subdomainQuery = `
  query($first: Int) {
    subdomains(first: $first) {
      id
      node
      label
      owner
    }
  }
`

theGraphClient.query({
  query: gql(subdomainQuery),
  variables: {
    first: 10
  }
})
.then(data => 
  console.log("Subdomain data: ", data))
.catch(err => { 
  console.log("Error fetching data: ", err) });

