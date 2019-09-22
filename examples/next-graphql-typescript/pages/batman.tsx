// import React from 'react';
// import Layout from '../components/Layout';
// import HomeSSR from '../components/HomeSSR';

// const HomePage = () => (
//   <Layout titleKey="Cruceritis">
//     <HomeSSR />
//   </Layout>
// );

// export default HomePage;
import Layout from '../components/Layout';
import Link from 'next/link';
import fetch from 'isomorphic-unfetch';

const Index = props => (
  <Layout titleKey={'Shows'}>
    <h1>Batman TV Shows</h1>
    <ul>
      {props.shows.map(show => (
        <li key={show.id}>
          <Link href="/p/[id]" as={`/p/${show.id}`}>
            <a>{show.name}</a>
          </Link>
        </li>
      ))}
    </ul>
  </Layout>
);

Index.getInitialProps = async function() {
  const res = await fetch('https://api.tvmaze.com/search/shows?q=batman');
  const data = await res.json();

  console.log(`Show data fetched. Count: ${data.length}`);

  return {
    shows: data.map(entry => entry.show),
  };
};

export default Index;
