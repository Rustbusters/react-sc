import './App.css';
import React, { useState, useEffect, } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Server from './screens/Server';
import Documentation from './screens/Documentation';
import { GlobalStateContext } from './GlobalState';
import Sidebar from './components/Sidebar';
import { ServerMessages, ServerStats, StatsType, defaultStats, MessageType, UserType, ServerActiveUsers } from './utils/types';

import { HTTP_URL, WS_URL } from "./utils/constants"

interface AppProps { };

const App: React.FC<AppProps> = () => {

  // General
  let [selectedServer, setSelectedServer] = useState<number>(0);
  let [availableServers, setAvailableServers] = useState<number[]>([0, 1]);

  // Total statatics for all the servers
  let [totalStats, setTotalStats] = useState<ServerStats>(new Map()); // Store the incoming message from WebSocket

  // Server messages
  let [serversMessages, setServersMessages] = useState<ServerMessages>(new Map());
  serversMessages.set(0, [
    { id: "ajskdjasksjdkajkldjdkajdsljkadsljdlkjdaklsjd", srcId: "0", destId: "1", message: "Hellelloelloelloo World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World o World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World " },
  ])

  // List of active users on each server
  let [serverActiveUsers, setActiveUsers] = useState<ServerActiveUsers>(new Map());

  const handleStats = (serverId: number, stats: any) => {
    // Validate stats structure
    const newStats: StatsType = {
      messagesSent: stats["messages_sent"],
      fragmentsSent: stats["fragments_sent"],

      messagesReceived: stats["messages_received"],
      fragmentsReceived: stats["fragments_received"],

      acksSent: stats["acks_sent"],
      acksReceived: stats["acks_received"],

      nacksReceived: stats["nacks_received"],
    };
    totalStats.set(serverId, newStats);
    setTotalStats(new Map(totalStats));
  }

  const handleMessages = (serverId: number, messages: any) => {
    // Validate server messages structure
    const newMessages: MessageType[] = messages.map((m: any) => ({
      id: m["id"],
      srcId: m["src_id"],
      destId: m["dest_id"],
      message: m["message"],
    }));
    serversMessages.set(serverId, newMessages);
    setServersMessages(new Map(serversMessages));
  }

  const handleActiveUsers = (serverId: number, activeUsers: any) => {
    // Validate active users message structure
    const newActiveUsers: UserType[] = activeUsers.map((u: any) => ({
      id: u["id"],
      name: u["name"]
    }));
    serverActiveUsers.set(serverId, newActiveUsers);
    setActiveUsers(new Map(serverActiveUsers));
  }

  // WebSocket connection setup
  useEffect(() => {
    // Replace with your WebSocket server WS_URL
    const socket = new WebSocket(WS_URL);

    // WebSocket open event
    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    // WebSocket message event
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const serverId: number = data["server_id"];

        if ("stats" in data) { // Stats parsing
          handleStats(serverId, data["stats"]);
        } else if ("messages" in data) { // Server messages parsing
          handleMessages(serverId, data["messages"]);
        } else if ("active_users" in data) {
          handleActiveUsers(serverId, data["active_users"]);
        }
      } catch (err) {
        console.error("Failed to parse message: ", err);
      }
    };

    // WebSocket error event
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // WebSocket close event
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Clean up WebSocket connection on component unmount
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    // Run http request for available servers
    axios.get(`${HTTP_URL}/api/servers`)
      .then(res => {
        // Access the data directly (no need for JSON.stringify here)
        const servers = res.data.servers;

        // Sort the servers array (if it's an array of numbers or strings)
        const sortedServers = servers.sort();

        // Set the sorted servers to your state
        setAvailableServers(sortedServers);
      })
      .catch(e => {
        console.error("Something went terribly wrong bro: ", e);
      })
  }, [window.location.href]);

  return (
    <GlobalStateContext.Provider
      value={{
        totalStats,
        setTotalStats,
        selectedServer,
        setSelectedServer,
        availableServers,
        setAvailableServers,
        serversMessages,
        setServersMessages,
        serverActiveUsers,
        setActiveUsers
      }}
    >
      <Router>
        <div className="flex max-h-screen">
          <Sidebar />

          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            {
              availableServers.map((id, index) =>
                <Route key={index} path={`/servers/${id}`} element={<Server id={id} stats={totalStats.get(id) ?? defaultStats} messages={serversMessages.get(id) ?? []} activeUsers={serverActiveUsers.get(id) ?? []} />} />
              )
            }
            <Route path="/documentation" element={<Documentation />} />
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </GlobalStateContext.Provider>
  );
};

export default App;
