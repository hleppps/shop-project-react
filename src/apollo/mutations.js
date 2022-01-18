import { gql } from "@apollo/client";

export const UPDATE_STATUS = gql`
  mutation UpdateUserStatus($userStatus: String!) {
    updateStatus(status: $userStatus) {
      status
    }
  }
`;

export const CREATE_POST = gql`
  mutation CreateNewPost(
    $title: String!
    $content: String!
    $imageUrl: String!
  ) {
    createPost(
      postInput: { title: $title, content: $content, imageUrl: $imageUrl }
    ) {
      _id
      title
      content
      imageUrl
      creator {
        name
      }
      createdAt
    }
  }
`;

export const UPDATE_POST = gql`
  mutation UpdateExistingPost(
    $postId: ID!
    $title: String!
    $content: String!
    $imageUrl: String!
  ) {
    updatePost(
      id: $postId
      postInput: { title: $title, content: $content, imageUrl: $imageUrl }
    ) {
      _id
      title
      content
      imageUrl
      creator {
        name
      }
      createdAt
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($postId: ID!) {
    deletePost(id: $postId)
  }
`;

export const CREATE_USER = gql`
  mutation CreateNewUser($email: String!, $name: String!, $password: String!) {
    createUser(userInput: { email: $email, name: $name, password: $password }) {
      _id
      email
    }
  }
`;
