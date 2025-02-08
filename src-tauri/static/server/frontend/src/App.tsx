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
  // serversMessages.set(0, [
  //   { id: "1", srcId: "2", destId: "3", message: "Hello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello WorldHello World", timestamp: 1707321600000 },
  //   { id: "4", srcId: "1", destId: "3", message: "Hello World", timestamp: 1707321600000 },
  //   { id: "2", srcId: "3", destId: "3", message: "Yo", timestamp: 1707321600002 },
  //   { id: "3", srcId: "1", destId: "2", message: "My N", timestamp: 1707321600001 },
  // ]);
  // List of active users on each server
  let [serverActiveUsers, setActiveUsers] = useState<ServerActiveUsers>(new Map());

  const handleStats = (serverId: number, stats: StatsType) => {
    totalStats.set(serverId, stats);
    setTotalStats(new Map(totalStats));
  }

  const handleNewMessage = (serverId: number, message: MessageType) => {
    const curMessages = serversMessages.get(serverId) ?? [];
    serversMessages.set(serverId, [...curMessages, message]);
    setServersMessages(new Map(serversMessages));
  }

  const handleMessages = (serverId: number, messages: MessageType[]) => {
    serversMessages.set(serverId, messages);
    setServersMessages(new Map(serversMessages));
  }

  const handleActiveUsers = (serverId: number, activeUsers: UserType[]) => {
    serverActiveUsers.set(serverId, activeUsers);
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
        const serverId: number = data["serverId"];

        if ("stats" in data) { // Stats parsing
          handleStats(serverId, data["stats"]);
        } else if ("newMessage" in data) {
          console.log(`New Message: ${serverId} ${data["newMessage"]}`);
          handleNewMessage(serverId, data["newMessage"]);
        } else if ("messages" in data) { // Server messages parsing
          console.log(`Messages: ${serverId} ${data["messages"]}`);
          handleMessages(serverId, data["messages"]);
        } else if ("activeUsers" in data) {
          handleActiveUsers(serverId, data["activeUsers"]);
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
