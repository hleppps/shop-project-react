import { gql } from "@apollo/client";

export const GET_POST = gql`
  query FetchSinglePost($postId: ID!) {
    post(id: $postId) {
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

export const GET_STATUS = gql`
  query GetStatus {
    user {
      status
    }
  }
`;

export const GET_POSTS = gql`
  query FetchPosts($page: Int) {
    posts(page: $page) {
      posts {
        _id
        title
        content
        imageUrl
        creator {
          name
        }
        createdAt
      }
      totalPosts
    }
  }
`;

export const USER_LOGIN = gql`
  query UserLogin($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      userId
    }
  }
`;
