import { useMutation, useQuery } from "@apollo/client";
import React, { Fragment, useEffect, useState } from "react";
import { Redirect, Route, Switch, withRouter } from "react-router-dom";
import * as MUTATIONS from "./apollo/mutations";
import * as QUERIES from "./apollo/queries";
import "./App.css";
import Backdrop from "./components/Backdrop/Backdrop";
import ErrorHandler from "./components/ErrorHandler/ErrorHandler";
import Layout from "./components/Layout/Layout";
import MainNavigation from "./components/Navigation/MainNavigation/MainNavigation";
import MobileNavigation from "./components/Navigation/MobileNavigation/MobileNavigation";
import Toolbar from "./components/Toolbar/Toolbar";
import LoginPage from "./pages/Auth/Login";
import SignupPage from "./pages/Auth/Signup";
import FeedPage from "./pages/Feed/Feed";
import SinglePostPage from "./pages/Feed/SinglePost/SinglePost";

const App = (props) => {
  const [state, setState] = useState({
    showMobileNav: false,
    showBackdrop: false,
    error: null,
    isAuth: false,
    token: null,
    userId: null,
    authLoading: false,
  });

  const loginUserQuery = useQuery(QUERIES.USER_LOGIN, {
    variables: { email: "", password: "" },
  });
  const [signupUserQuery] = useMutation(MUTATIONS.CREATE_USER);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const expiryDate = localStorage.getItem("expiryDate");
    if (!token || !expiryDate) {
      return;
    }
    if (new Date(expiryDate) <= new Date()) {
      logoutHandler();
      return;
    }
    const userId = localStorage.getItem("userId");
    const remainingMilliseconds =
      new Date(expiryDate).getTime() - new Date().getTime();
    setState((prevState) => ({
      ...prevState,
      isAuth: true,
      token,
      userId,
    }));

    setAutoLogout(remainingMilliseconds);
  }, []);

  const mobileNavHandler = (isOpen) => {
    setState((prevState) => ({
      ...prevState,
      showMobileNav: isOpen,
      showBackdrop: isOpen,
    }));
  };

  const backdropClickHandler = () => {
    setState((prevState) => ({
      ...prevState,
      showMobileNav: false,
      showBackdrop: false,
      setError: null,
    }));
  };

  const logoutHandler = () => {
    setState((prevState) => ({
      ...prevState,
      isAuth: false,
      token: null,
    }));
    localStorage.removeItem("token");
    localStorage.removeItem("expiryDate");
    localStorage.removeItem("userId");
  };

  const loginHandler = (event, authData) => {
    event.preventDefault();
    setState((prevState) => ({
      ...prevState,
      authLoading: true,
    }));

    loginUserQuery
      .refetch({
        email: authData.email,
        password: authData.password,
      })

      .then((resData) => {

        setState((prevState) => ({
          ...prevState,
          isAuth: true,
          token: resData.data.login.token,
          authLoading: false,
          userId: resData.data.login.userId,
        }));

        localStorage.setItem("token", resData.data.login.token);
        localStorage.setItem("userId", resData.data.login.userId);
        const remainingMilliseconds = 60 * 60 * 1000;
        const expiryDate = new Date(
          new Date().getTime() + remainingMilliseconds
        );
        localStorage.setItem("expiryDate", expiryDate.toISOString());
        setAutoLogout(remainingMilliseconds);
      })
      .catch((err) => {
        console.log(err.code);
        setState((prevState) => ({
          ...prevState,
          isAuth: false,
          authLoading: false,
          error: err,
        }));
      });
  };

  const signupHandler = (event, authData) => {
    event.preventDefault();
    setState((prevState) => ({
      ...prevState,
      authLoading: true,
    }));

    signupUserQuery({
      variables: {
        email: authData.signupForm.email.value,
        name: authData.signupForm.name.value,
        password: authData.signupForm.password.value,
      },
    })
      .then((resData) => {
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error(
            "Validation failed. Make sure the email address isn't used yet!"
          );
        }
        if (resData.errors) {
          throw new Error("User creation failed!");
        }
        console.log(resData);
        setState((prevState) => ({
          ...prevState,
          isAuth: false,
          authLoading: false,
        }));
        props.history.replace("/");
      })
      .catch((err) => {
        console.log(err);
        setState((prevState) => ({
          ...prevState,
          isAuth: false,
          authLoading: false,
          error: err,
        }));
      });
  };

  const setAutoLogout = (milliseconds) => {
    setTimeout(() => {
      logoutHandler();
    }, milliseconds);
  };

  const errorHandler = () => {
    setState((prevState) => ({
      ...prevState,
      error: null,
    }));
  };

  let routes = (
    <Switch>
      <Route
        path="/"
        exact
        render={(props) => (
          <LoginPage
            {...props}
            onLogin={loginHandler}
            loading={state.authLoading}
          />
        )}
      />
      <Route
        path="/signup"
        exact
        render={(props) => (
          <SignupPage
            {...props}
            onSignup={signupHandler}
            loading={state.authLoading}
          />
        )}
      />
      <Redirect to="/" />
    </Switch>
  );

  if (state.isAuth) {
    routes = (
      <Switch>
        <Route
          path="/"
          exact
          render={(props) => (
            <FeedPage userId={state.userId} token={state.token} />
          )}
        />
        <Route
          path="/:postId"
          render={(props) => (
            <SinglePostPage
              {...props}
              userId={state.userId}
              token={state.token}
            />
          )}
        />
        <Redirect to="/" />
      </Switch>
    );
  }

  return (
    <Fragment>
      {state.showBackdrop && <Backdrop onClick={backdropClickHandler} />}
      <ErrorHandler error={state.error} onHandle={errorHandler} />
      <Layout
        header={
          <Toolbar>
            <MainNavigation
              onOpenMobileNav={() => {
                mobileNavHandler(true);
              }}
              onLogout={logoutHandler}
              isAuth={state.isAuth}
            />
          </Toolbar>
        }
        mobileNav={
          <MobileNavigation
            open={state.showMobileNav}
            mobile
            onChooseItem={() => {
              mobileNavHandler(false);
            }}
            onLogout={logoutHandler}
            isAuth={state.isAuth}
          />
        }
      />
      {routes}
    </Fragment>
  );
};

// class App extends Component {
//   state = {
//     showBackdrop: false,
//     showMobileNav: false,
//     isAuth: false,
//     token: null,
//     userId: null,
//     authLoading: false,
//     error: null,
//   };

//   componentDidMount() {
//     const token = localStorage.getItem("token");
//     const expiryDate = localStorage.getItem("expiryDate");
//     if (!token || !expiryDate) {
//       return;
//     }
//     if (new Date(expiryDate) <= new Date()) {
//       this.logoutHandler();
//       return;
//     }
//     const userId = localStorage.getItem("userId");
//     const remainingMilliseconds =
//       new Date(expiryDate).getTime() - new Date().getTime();
//     this.setState({ isAuth: true, token: token, userId: userId });
//     this.setAutoLogout(remainingMilliseconds);
//   }

//   mobileNavHandler = (isOpen) => {
//     this.setState({ showMobileNav: isOpen, showBackdrop: isOpen });
//   };

//   backdropClickHandler = () => {
//     this.setState({ showBackdrop: false, showMobileNav: false, error: null });
//   };

//   logoutHandler = () => {
//     this.setState({ isAuth: false, token: null });
//     localStorage.removeItem("token");
//     localStorage.removeItem("expiryDate");
//     localStorage.removeItem("userId");
//   };

//   loginHandler = (event, authData) => {
//     event.preventDefault();
//     this.setState({ authLoading: true });

//     this.props.client
//       .query({
//         query: QUERIES.USER_LOGIN,
//         variables: { email: authData.email, password: authData.password },
//       })
//       .then((resData) => {
//         if (resData.errors && resData.errors[0].status === 422) {
//           throw new Error(
//             "Validation failed. Make sure the email address isn't used yet!"
//           );
//         }
//         if (resData.errors) {
//           throw new Error("User login failed!");
//         }
//         console.log(resData);
//         this.setState({
//           isAuth: true,
//           token: resData.data.login.token,
//           authLoading: false,
//           userId: resData.data.login.userId,
//         });
//         localStorage.setItem("token", resData.data.login.token);
//         localStorage.setItem("userId", resData.data.login.userId);
//         const remainingMilliseconds = 60 * 60 * 1000;
//         const expiryDate = new Date(
//           new Date().getTime() + remainingMilliseconds
//         );
//         localStorage.setItem("expiryDate", expiryDate.toISOString());
//         this.setAutoLogout(remainingMilliseconds);
//       })
//       .catch((err) => {
//         console.log(err);
//         this.setState({
//           isAuth: false,
//           authLoading: false,
//           error: err,
//         });
//       });
//   };

//   signupHandler = (event, authData) => {
//     event.preventDefault();
//     this.setState({ authLoading: true });

//     this.props.client
//       .mutate({
//         mutation: MUTATIONS.CREATE_USER,
//         variables: {
//           email: authData.signupForm.email.value,
//           name: authData.signupForm.name.value,
//           password: authData.signupForm.password.value,
//         },
//       })

//       .then((resData) => {
//         if (resData.errors && resData.errors[0].status === 422) {
//           throw new Error(
//             "Validation failed. Make sure the email address isn't used yet!"
//           );
//         }
//         if (resData.errors) {
//           throw new Error("User creation failed!");
//         }
//         console.log(resData);
//         this.setState({ isAuth: false, authLoading: false });
//         this.props.history.replace("/");
//       })
//       .catch((err) => {
//         console.log(err);
//         this.setState({
//           isAuth: false,
//           authLoading: false,
//           error: err,
//         });
//       });
//   };

//   setAutoLogout = (milliseconds) => {
//     setTimeout(() => {
//       this.logoutHandler();
//     }, milliseconds);
//   };

//   errorHandler = () => {
//     this.setState({ error: null });
//   };

//   render() {
//     let routes = (
//       <Switch>
//         <Route
//           path="/"
//           exact
//           render={(props) => (
//             <LoginPage
//               {...props}
//               onLogin={this.loginHandler}
//               loading={this.state.authLoading}
//             />
//           )}
//         />
//         <Route
//           path="/signup"
//           exact
//           render={(props) => (
//             <SignupPage
//               {...props}
//               onSignup={this.signupHandler}
//               loading={this.state.authLoading}
//             />
//           )}
//         />
//         <Redirect to="/" />
//       </Switch>
//     );

//     if (this.state.isAuth) {
//       routes = (
//         <Switch>
//           <Route
//             path="/"
//             exact
//             render={(props) => (
//               <FeedPage userId={this.state.userId} token={this.state.token} />
//             )}
//           />
//           <Route
//             path="/:postId"
//             render={(props) => (
//               <SinglePostPage
//                 {...props}
//                 userId={this.state.userId}
//                 token={this.state.token}
//               />
//             )}
//           />
//           <Redirect to="/" />
//         </Switch>
//       );
//     }

//     return (
//       <Fragment>
//         {this.state.showBackdrop && (
//           <Backdrop onClick={this.backdropClickHandler} />
//         )}
//         <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
//         <Layout
//           header={
//             <Toolbar>
//               <MainNavigation
//                 onOpenMobileNav={this.mobileNavHandler.bind(this, true)}
//                 onLogout={this.logoutHandler}
//                 isAuth={this.state.isAuth}
//               />
//             </Toolbar>
//           }
//           mobileNav={
//             <MobileNavigation
//               open={this.state.showMobileNav}
//               mobile
//               onChooseItem={this.mobileNavHandler.bind(this, false)}
//               onLogout={this.logoutHandler}
//               isAuth={this.state.isAuth}
//             />
//           }
//         />
//         {routes}
//       </Fragment>
//     );
//   }
// }

// export default withApollo(withRouter(App));
export default withRouter(App);
