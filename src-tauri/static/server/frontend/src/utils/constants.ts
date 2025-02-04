const IP = "127.0.0.1";
const PORT = 8080;
const HTTP_URL = `http://${IP}:${PORT}`;
const WS_URL = `ws://${IP}:${PORT + 1}`;

export {
    IP, PORT, HTTP_URL, WS_URL
}