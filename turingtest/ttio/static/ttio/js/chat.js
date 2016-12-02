var ws_scheme = window.location.protocol == "https:" ? "wss" : "ws";
var chat_socket = new ReconnectingWebSocket(ws_scheme + '://' + window.location.host + "/chat" + window.location.pathname);
