import React, { Component } from "react";

import NavBar from "./NavBar/NavBar";
import { Switch, Route, Redirect, useRouteMatch } from "react-router-dom";
import PostMaker from "./Core/PostMaker";
import P2PClient from "./Core/Skype";
import Users from "./Core/Users";
import NotFound from "./NotFound";

import { getCurrentUserInfo } from "../Services/userService";
import { getPosts } from "../Services/postsService";
import { getUsers } from "../Services/usersService";
import Socials from "../Messages/Socials";
import DiscordAccountGenerator from "./Core/DiscordAccountGenerator";
import Test from "./Core/Test";
import API from "../API";
import { toast } from "react-toastify";
import { FakeMsgs } from "../Utils";
import { WS_URL } from "../app-config";

class App extends Component {
  state = { user: {}, channels: [], users: [], friends: [] };

  componentDidMount = async () => {
    const { data: user } = await API.get("/users/@me");

    if (user.error) {
      toast.error(user.error);
      return this.props.history.replace("/auth");
    }
    const { data: channels } = await API.get("/channels/@me");
    if (channels.error) {
      toast.error(channels.error);
      return this.props.history.replace("/auth");
    }

    const { data: users } = await API.get("/users");
    if (users.error) {
      toast.error(users.error);
      return this.props.history.replace("/auth");
    }
    this.setState({ user, users, channels });

    // * on setup le websocket
    let client = new WebSocket(`${WS_URL}/${localStorage.token}`);
    client.onmsg = (msg) => {
      // * event handler
      if (msg.event == "channelUpdate") {
        console.log("channelUpdate:", msg.channel);
        let channels = [...this.state.channels];
        // * pas ouf la complexité mieux avec indexOf
        let found = false;
        channels = channels.map((channel) => {
          found = true;
          return channel._id === msg.channel._id ? msg.channel : channel;
        });

        // channels.sort((a, b) => {
        //   if (a.messages.length == 0 && b.messages.length == 0) {
        //     return a.name > b.name;
        //   } else {
        //     if (a.messages.length == 0) {

        //     }
        //   }
        // });

        // * si non trouvé ajouté ?
        this.setState({ channels });
      }
      if (msg.event == "newChannel") {
        this.setState({ channels: [...this.state.channels, msg.channel] });
      }
    };

    client.onmessage = ({ data }) => {
      try {
        client.onmsg(JSON.parse(data));
      } catch {}
    };
  };

  handleUsersUpdate = async () => {
    this.setState({ users: await getUsers() });
  };

  handleNewMessage = (channelId, msg) => {
    const channels = [...this.state.channels].map((chan) => {
      if (chan._id == channelId) {
        chan.messages.push(msg);
      }
      return chan;
    });
    this.setState({ channels });
  };

  render() {
    const { path, url } = this.props.match;
    const { user, users, channels } = this.state;
    const { username, pp, _id } = user;
    return (
      <div className="w-full h-full flex flex-col select-none">
        <NavBar username={username} pp_url={pp} />
        <main className="w-full h-full mt-2 rounded bg-gray-900 overflow-hidden p-1">
          <Switch>
            <Route
              path={path + "/channels"}
              render={(props) => (
                <Socials
                  {...props}
                  currentUser={user}
                  users={users}
                  channels={channels}
                  handleNewMessage={this.handleNewMessage}
                />
              )}
            />
            <Route
              path={path + `/users`}
              render={(props) => (
                <Users
                  {...props}
                  users={users}
                  handleUsersUpdate={this.handleUsersUpdate}
                />
              )}
            />
            <Route
              path={path + `/discordAccountGenerator`}
              component={DiscordAccountGenerator}
            />
            <Route path={path + `/test`} component={Test} />

            <Redirect exact path={path + "/"} to={path + "/channels"} />
            <Route path={path + "/"} component={NotFound} />
          </Switch>
        </main>
      </div>
    );
  }
}

export default App;
