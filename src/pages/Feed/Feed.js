import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import React, { Fragment, useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import * as MUTATIONS from "../../apollo/mutations";
import * as QUERIES from "../../apollo/queries";
import Button from "../../components/Button/Button";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Post from "../../components/Feed/Post/Post";
import Input from "../../components/Form/Input/Input";
import Loader from "../../components/Loader/Loader";
import Paginator from "../../components/Paginator/Paginator";
import "./Feed.css";

const Feed = (props) => {
  const [state, setState] = useState({
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false,
  });

  const [loadStatusQuery] = useLazyQuery(QUERIES.GET_STATUS);
  const loadPostsQuery = useQuery(QUERIES.GET_POSTS, {
    variables: { page: 1 },
  });

  const [updateStatusMutation] = useMutation(MUTATIONS.UPDATE_STATUS);
  const [createPostMutation] = useMutation(MUTATIONS.CREATE_POST);
  const [updatePostMutation] = useMutation(MUTATIONS.UPDATE_POST);
  const [deletePostMutation] = useMutation(MUTATIONS.DELETE_POST);

  useEffect(() => {
    loadStatusQuery()
      .then((resData) => {
        if (resData.error) {
          localStorage.removeItem("token");
          localStorage.removeItem("expiryDate");
          localStorage.removeItem("userId");
          window.location.reload();
        }
        setState((prevState) => ({
          ...prevState,
          status: resData.data.user.status,
        }));
      })
      .catch(catchError);

    loadPosts();
  }, []);

  const loadPosts = (direction) => {
    if (direction) {
      setState((prevState) => ({
        ...prevState,
        postsLoading: true,
        posts: [],
      }));
    }
    let page = state.postPage;
    if (direction === "next") {
      page++;
    }
    if (direction === "previous") {
      page--;
    }

    setState((prevState) => ({
      ...prevState,
      postPage: page,
    }));

    loadPostsQuery
      .refetch({ page })

      .then((resData) => {
        console.log("LOADED POSTS", resData.data.posts.totalPosts);
        if (resData.errors) {
          throw new Error("Fetching posts failed!");
        }

        setState((prevState) => ({
          ...prevState,
          posts: resData.data.posts.posts.map((post) => {
            return { ...post, imagePath: post.imageUrl };
          }),
          totalPosts: resData.data.posts.totalPosts,
          postsLoading: false,
        }));
      })
      .catch(catchError => {
        console.log(catchError);
      });
  };

  const statusUpdateHandler = (event) => {
    event.preventDefault();

    updateStatusMutation({ variables: { userStatus: state.status } })
      .then((resData) => {
        if (resData.errors) {
          throw new Error("Fetching status failed!");
        }

        console.log(resData);
      })
      .catch(catchError);
  };

  const newPostHandler = () => {
    setState((prevState) => ({
      ...prevState,
      isEditing: true,
    }));
  };

  const startEditPostHandler = (postId) => {
    setState((prevState) => ({
      ...prevState,
      isEditing: true,
      editPost: { ...prevState.posts.find((p) => p._id === postId) },
    }));
  };

  const cancelEditHandler = () => {
    setState((prevState) => ({
      ...prevState,
      isEditing: false,
      editPost: null,
    }));
  };

  const finishEditHandler = (postData) => {
    setState((prevState) => ({
      ...prevState,
      editLoading: true,
    }));

    const formData = new FormData();
    formData.append("image", postData.image);
    if (state.editPost) {
      formData.append("oldPath", state.editPost.imagePath);
    }

    fetch("http://localhost:8080/post-image", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + props.token,
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((fileResData) => {
        let imageUrl = fileResData.filePath || "undefined";
        if (imageUrl) {
          imageUrl = imageUrl.replace(/\\/g, "/");
        }

        let mutation = createPostMutation;
        let variables = {
          title: postData.title,
          content: postData.content,
          imageUrl: imageUrl,
        };

        if (state.editPost) {
          mutation = updatePostMutation;
          variables = {
            postId: state.editPost._id,
            title: postData.title,
            content: postData.content,
            imageUrl,
          };
        }
        return { mutation, variables };
      })
      .then(({ mutation, variables }) => {
        return mutation({ variables });
      })

      .then((resData) => {
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error(
            "Validation failed. Make sure the email address and/or are valid!"
          );
        }
        if (resData.errors) {
          throw new Error("Post creation failed!");
        }

        console.log(resData);
        let resDataField = "createPost";
        if (state.editPost) {
          resDataField = "updatePost";
        }
        const post = {
          _id: resData.data[resDataField]._id,
          title: resData.data[resDataField].title,
          content: resData.data[resDataField].content,
          creator: resData.data[resDataField].creator,
          createdAt: resData.data[resDataField].createdAt,
          imagePath: resData.data[resDataField].imageUrl,
        };
        setState((prevState) => {
          let updatedPosts = [...prevState.posts];
          let updatedTotalPosts = prevState.totalPosts;

          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              (p) => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          } else {
            updatedTotalPosts++;
            if (prevState.posts.length >= 2) {
              updatedPosts.pop();
            }
            updatedPosts.unshift(post);
          }
          return {
            ...prevState,
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
            totalPosts: updatedTotalPosts,
          };
        });

      })
      .catch((err) => {
        console.log(err);

        setState((prevState) => ({
          ...prevState,
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err,
        }));
      });
  };

  const statusInputChangeHandler = (input, value) => {
    setState((prevState) => ({
      ...prevState,
      status: value,
    }));
  };

  const deletePostHandler = (postId) => {
    setState((prevState) => ({
      ...prevState,
      postsLoading: true,
    }));

    deletePostMutation({ variables: { postId } })
      .then((resData) => {
        if (resData.errors) {
          throw new Error("Deleting the post failed!");
        }

        console.log("POST DELETED:", resData);

        loadPosts();
      })
      .catch((err) => {
        console.log(err);
        setState((prevState) => ({
          ...prevState,
          postsLoading: false,
          error: err,
        }));
      });
  };

  const errorHandler = () => {
    setState((prevState) => ({
      ...prevState,
      error: null,
    }));
  };

  const catchError = (error) => {
    setState((prevState) => ({
      ...prevState,
      error,
    }));
  };

  return (
    <Fragment>
      <ErrorHandler error={state.error} onHandle={errorHandler} />
      <FeedEdit
        editing={state.isEditing}
        selectedPost={state.editPost}
        loading={state.editLoading}
        onCancelEdit={cancelEditHandler}
        onFinishEdit={finishEditHandler}
      />
      <section className="feed__status">
        <form onSubmit={statusUpdateHandler}>
          <Input
            type="text"
            placeholder="Your status"
            control="input"
            onChange={statusInputChangeHandler}
            value={state.status}
          />
          <Button mode="flat" type="submit">
            Update
          </Button>
        </form>
      </section>
      <section className="feed__control">
        <Button mode="raised" design="accent" onClick={newPostHandler}>
          New Post
        </Button>
      </section>
      <section className="feed">
        {state.postsLoading && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Loader />
          </div>
        )}
        {state.posts.length <= 0 && !state.postsLoading ? (
          <p style={{ textAlign: "center" }}>No posts found.</p>
        ) : null}
        {!state.postsLoading && (
          <Paginator
            onPrevious={() => {
              loadPosts("previous");
            }}
            onNext={() => {
              loadPosts("next");
            }}
            lastPage={Math.ceil(state.totalPosts / 2)}
            currentPage={state.postPage}
          >
            {state.posts.map((post) => (
              <Post
                key={post._id}
                id={post._id}
                author={post.creator.name}
                date={new Date(post.createdAt).toLocaleDateString("en-US")}
                title={post.title}
                image={post.imageUrl}
                content={post.content}
                onStartEdit={() => {
                  startEditPostHandler(post._id);
                }}
                onDelete={() => {
                  deletePostHandler(post._id);
                }}
              />
            ))}
          </Paginator>
        )}
      </section>
    </Fragment>
  );
};

// CLASS COMPONENT

// class FFeed extends Component {
//   state = {
//     isEditing: false,
//     posts: [],
//     totalPosts: 0,
//     editPost: null,
//     status: "",
//     postPage: 1,
//     postsLoading: true,
//     editLoading: false,
//   };

//   componentDidMount() {
//     this.props.client
//       .query({ query: QUERIES.GET_STATUS })
//       .then((resData) => {
//         console.log(resData);
//         if (resData.errors) {
//           throw new Error("Fetching status failed!");
//         }
//         this.setState({ status: resData.data.user.status });
//       })
//       .catch(this.catchError);

//     this.loadPosts();
//   }

//   loadPosts = (direction) => {
//     if (direction) {
//       this.setState({ postsLoading: true, posts: [] });
//     }
//     let page = this.state.postPage;
//     if (direction === "next") {
//       page++;
//       this.setState({ postPage: page });
//     }
//     if (direction === "previous") {
//       page--;
//       this.setState({ postPage: page });
//     }

//     this.props.client
//       .query({
//         query: QUERIES.GET_POSTS,
//         fetchPolicy: "network-only",
//         variables: { page },
//       })
//       .then((resData) => {
//         console.log("LOADED POSTS", resData.data.posts.totalPosts);
//         if (resData.errors) {
//           throw new Error("Fetching posts failed!");
//         }

//         this.setState({
//           posts: resData.data.posts.posts.map((post) => {
//             return { ...post, imagePath: post.imageUrl };
//           }),
//           totalPosts: resData.data.posts.totalPosts,
//           postsLoading: false,
//         });
//         return;
//       })
//       .then(() => {
//         return this.props.client.query({
//           query: QUERIES.GET_STATUS,
//         });
//       })
//       .then((queryRes) => {
//         console.log("QUERY POSTS: loading -", queryRes.data.user.status);
//       })
//       .catch(this.catchError);
//   };

//   statusUpdateHandler = (event) => {
//     event.preventDefault();

//     this.props.client
//       .mutate({
//         mutation: MUTATIONS.UPDATE_STATUS,
//         variables: { userStatus: this.state.status },
//       })
//       .then((resData) => {
//         if (resData.errors) {
//           throw new Error("Fetching status failed!");
//         }

//         console.log(resData);
//       })
//       .catch(this.catchError);
//   };

//   newPostHandler = () => {
//     this.setState({ isEditing: true });
//   };

//   startEditPostHandler = (postId) => {
//     this.setState((prevState) => {
//       const loadedPost = { ...prevState.posts.find((p) => p._id === postId) };

//       return {
//         isEditing: true,
//         editPost: loadedPost,
//       };
//     });
//   };

//   cancelEditHandler = () => {
//     this.setState({ isEditing: false, editPost: null });
//   };

//   finishEditHandler = (postData) => {
//     this.setState({
//       editLoading: true,
//     });
//     const formData = new FormData();
//     formData.append("image", postData.image);
//     if (this.state.editPost) {
//       formData.append("oldPath", this.state.editPost.imagePath);
//     }
//     fetch("http://localhost:8080/post-image", {
//       method: "PUT",
//       headers: {
//         Authorization: "Bearer " + this.props.token,
//       },
//       body: formData,
//     })
//       .then((res) => res.json())
//       .then((fileResData) => {
//         let imageUrl = fileResData.filePath || "undefined";
//         if (imageUrl) {
//           imageUrl = imageUrl.replace(/\\/g, "/");
//         }

//         let mutation = MUTATIONS.CREATE_POST;
//         let variables = {
//           title: postData.title,
//           content: postData.content,
//           imageUrl: imageUrl,
//         };

//         if (this.state.editPost) {
//           mutation = MUTATIONS.UPDATE_POST;
//           variables = {
//             postId: this.state.editPost._id,
//             title: postData.title,
//             content: postData.content,
//             imageUrl,
//           };
//         }
//         return { mutation, variables };
//       })
//       .then(({ mutation, variables }) => {
//         return this.props.client.mutate({ mutation, variables });
//       })

//       .then((resData) => {
//         if (resData.errors && resData.errors[0].status === 422) {
//           throw new Error(
//             "Validation failed. Make sure the email address and/or are valid!"
//           );
//         }
//         if (resData.errors) {
//           throw new Error("Post creation failed!");
//         }

//         console.log(resData);
//         let resDataField = "createPost";
//         if (this.state.editPost) {
//           resDataField = "updatePost";
//         }
//         const post = {
//           _id: resData.data[resDataField]._id,
//           title: resData.data[resDataField].title,
//           content: resData.data[resDataField].content,
//           creator: resData.data[resDataField].creator,
//           createdAt: resData.data[resDataField].createdAt,
//           imagePath: resData.data[resDataField].imageUrl,
//         };

//         this.setState((prevState) => {
//           let updatedPosts = [...prevState.posts];
//           let updatedTotalPosts = prevState.totalPosts;

//           if (prevState.editPost) {
//             const postIndex = prevState.posts.findIndex(
//               (p) => p._id === prevState.editPost._id
//             );
//             updatedPosts[postIndex] = post;
//           } else {
//             updatedTotalPosts++;
//             if (prevState.posts.length >= 2) {
//               updatedPosts.pop();
//             }
//             updatedPosts.unshift(post);
//           }
//           return {
//             posts: updatedPosts,
//             isEditing: false,
//             editPost: null,
//             editLoading: false,
//             totalPosts: updatedTotalPosts,
//           };
//         });
//       })
//       .catch((err) => {
//         console.log(err);
//         this.setState({
//           isEditing: false,
//           editPost: null,
//           editLoading: false,
//           error: err,
//         });
//       });
//   };

//   statusInputChangeHandler = (input, value) => {
//     this.setState({ status: value });
//   };

//   deletePostHandler = (postId) => {
//     this.setState({ postsLoading: true });

//     return this.props.client
//       .mutate({ mutation: MUTATIONS.DELETE_POST, variables: { postId } })
//       .then((resData) => {
//         if (resData.errors) {
//           throw new Error("Deleting the post failed!");
//         }

//         console.log("POST DELETED:", resData);

//         this.loadPosts();
//       })
//       .catch((err) => {
//         console.log(err);
//         this.setState({ postsLoading: false, error: err });
//       });
//   };

//   errorHandler = () => {
//     this.setState({ error: null });
//   };

//   catchError = (error) => {
//     this.setState({ error: error });
//   };

//   render() {
//     return (
//       <Fragment>
//         <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
//         <FeedEdit
//           editing={this.state.isEditing}
//           selectedPost={this.state.editPost}
//           loading={this.state.editLoading}
//           onCancelEdit={this.cancelEditHandler}
//           onFinishEdit={this.finishEditHandler}
//         />
//         <section className="feed__status">
//           <form onSubmit={this.statusUpdateHandler}>
//             <Input
//               type="text"
//               placeholder="Your status"
//               control="input"
//               onChange={this.statusInputChangeHandler}
//               value={this.state.status}
//             />
//             <Button mode="flat" type="submit">
//               Update
//             </Button>
//           </form>
//         </section>
//         <section className="feed__control">
//           <Button mode="raised" design="accent" onClick={this.newPostHandler}>
//             New Post
//           </Button>
//         </section>
//         <section className="feed">
//           {this.state.postsLoading && (
//             <div style={{ textAlign: "center", marginTop: "2rem" }}>
//               <Loader />
//             </div>
//           )}
//           {this.state.posts.length <= 0 && !this.state.postsLoading ? (
//             <p style={{ textAlign: "center" }}>No posts found.</p>
//           ) : null}
//           {!this.state.postsLoading && (
//             <Paginator
//               onPrevious={this.loadPosts.bind(this, "previous")}
//               onNext={this.loadPosts.bind(this, "next")}
//               lastPage={Math.ceil(this.state.totalPosts / 2)}
//               currentPage={this.state.postPage}
//             >
//               {this.state.posts.map((post) => (
//                 <Post
//                   key={post._id}
//                   id={post._id}
//                   author={post.creator.name}
//                   date={new Date(post.createdAt).toLocaleDateString("en-US")}
//                   title={post.title}
//                   image={post.imageUrl}
//                   content={post.content}
//                   onStartEdit={this.startEditPostHandler.bind(this, post._id)}
//                   onDelete={this.deletePostHandler.bind(this, post._id)}
//                 />
//               ))}
//             </Paginator>
//           )}
//         </section>
//       </Fragment>
//     );
//   }
// }

export default withRouter(Feed);
// export default withApollo(Feed);
