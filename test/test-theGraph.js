
//import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
const { ApolloClient } = require("@apollo/client");


const APIURL = "http://127.0.0.1:8000/subgraphs/name/pns";


const client = new ApolloClient.ApolloClient({
  uri: APIURL,
  cache: new ApolloClient.InMemoryCache()
});

const domainsQuery = `
  query($first: Int, $orderBy: String, $orderDirection: String) {
    Domains(
      first: $first, orderBy: $orderBy, orderDirection: $orderDirection
    ) {
      id
      name
      label
      owner
      expires
    }
  }
`

client.query({
  query: ApolloClient.gql(domainsQuery),
  variables: {
    first: 10, orderBy: "name", orderDirection: "label"
  }
})
.then(data => console.log("Subgraph data: ", data))
.catch(err => { console.log("Error fetching data: ", err) });