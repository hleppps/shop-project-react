import { useQuery } from "@apollo/client";
import React from "react";
import * as QUERIES from "../../../apollo/queries";
import Image from "../../../components/Image/Image";
import "./SinglePost.css";

const SinglePost = (props) => {
  const postId = props.match.params.postId;
  const { loading, error, data } = useQuery(QUERIES.GET_POST, {
    variables: { postId },
  });

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (error) {
    throw new Error("Fetching post failed!");
  }

  const title = data.post.title;
  const author = data.post.creator.name;
  const date = new Date(data.post.createdAt).toLocaleDateString("en-US");
  const image = "http://localhost:8080/" + data.post.imageUrl;
  const content = data.post.content;

  return (
    <section className="single-post">
      <h1>{title}</h1>
      <h2>
        Created by {author} on {new Date(date).toLocaleDateString("en-US")}
      </h2>
      <div className="single-post__image">
        <Image contain imageUrl={image} />
      </div>
      <p>{content}</p>
    </section>
  );
};

// class SinglePost extends Component {
//   state = {
//     title: "",
//     author: "",
//     date: "",
//     image: "",
//     content: "",
//   };

//   componentDidMount() {
//     const postId = this.props.match.params.postId;

//     this.props.client
//       .query({ query: QUERIES.GET_POST, variables: { postId } })
//       .then((resData) => {
//         if (resData.errors) {
//           throw new Error("Fetching post failed!");
//         }

//         this.setState({
//           title: resData.data.post.title,
//           author: resData.data.post.creator.name,
//           image: "http://localhost:8080/" + resData.data.post.imageUrl,
//           date: new Date(resData.data.post.createdAt).toLocaleDateString(
//             "en-US"
//           ),
//           content: resData.data.post.content,
//         });
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }

//   render() {
//     return (
//       <section className="single-post">
//         <h1>{this.state.title}</h1>
//         <h2>
//           Created by {this.state.author} on {this.state.date}
//         </h2>
//         <div className="single-post__image">
//           <Image contain imageUrl={this.state.image} />
//         </div>
//         <p>{this.state.content}</p>
//       </section>
//     );
//   }
// }

export default SinglePost;
// export default withApollo(SinglePost);
