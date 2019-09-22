import React from 'react';
import Link from 'next/link';

const Navigation: React.FC = () => {
  return (
    <ul className="root">
      <li>
        <Link href="" as={`/`}>
          <a>Home</a>
        </Link>
      </li>
      <li>
        <Link href="/ssr" as={`/ssr`}>
          <a>ssr</a>
        </Link>
      </li>
      <style jsx>{`
        .root {
          margin: 1rem 0 1rem 0;
          padding: 0;
          display: flex;
          list-style: none;
        }
        .root > li:not(:last-child) {
          margin-right: 1rem;
        }
        a:link,
        a:visited {
          text-decoration: none;
          color: navy;
          text-transform: uppercase;
        }
        a:hover {
          text-decoration: underline;
        }
      `}</style>
    </ul>
  );
};

export default Navigation;
