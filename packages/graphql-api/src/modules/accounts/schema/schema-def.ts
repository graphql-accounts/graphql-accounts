import gql from 'graphql-tag';

export default ({
  rootQueryName,
  rootMutationName,
  withSchemaDefinition,
}: {
  rootQueryName?: string;
  rootMutationName?: string;
  withSchemaDefinition?: boolean;
}) =>
  withSchemaDefinition
    ? [
        gql`
    schema {
        query: ${rootMutationName || 'Query'}
        mutation: ${rootQueryName || 'Mutation'}
    }
`,
      ]
    : [];
