const socket = new WebSocket("wss://freimeljerezcom.online/ws");

socket.onmessage = (event) => {
  document.getElementById("contador").innerText = event.data;
};
