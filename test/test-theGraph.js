
import fetch from 'cross-fetch';
import pkg from '@apollo/client';
const { ApolloClient, InMemoryCache, gql,HttpLink } = pkg;


const theGraphURL = "http://moonbeam.pns.link:8000/subgraphs/name/pns";

const theGraphClient = new ApolloClient({
  link: new HttpLink({ uri: theGraphURL, fetch }),
  cache: new InMemoryCache()
});

/*
query($first: Int) {
  domains(first: $first,where:{name:"yeliying123"}) {
*/

/*
`
    query($first: Int,$name: Bytes!) {
        domains(first: $first,where:{name:$name}) {
      id
      name
      node
      owner
      cost
      expires
    }
  }
`
*/

const domainsQuery = `query($owner: Bytes!) {
  domains(where:{owner:$owner}) {
    id
    name
    node
    owner
    cost
    expires
  }
}`



theGraphClient.query({
  query: gql(domainsQuery),
  variables: {
    first: 10 ,
    owner:"yeliying123"
  }
})
.then(data => 
  console.log("Subgraph data: ", data)
  )
.catch(err => { 
  console.log("Error fetching data: ", err) 
});

/*
`
  query($first: Int) {
    subdomains(first: $first) {
      id
      tokenId
      name
      owner
    }
  }
`
*/

const subdomainQuery = `query($name: String!) {
  subdomains(name: $name) {
    id
    tokenId
    name
    owner
  }
}`

theGraphClient.query({
  query: gql(subdomainQuery),
  variables: {
    name: "yeliying123"
  }
})
.then(data => 
  console.log("Subdomain data: ", data))
.catch(err => { 
  console.log("Error fetching data: ", err) });

