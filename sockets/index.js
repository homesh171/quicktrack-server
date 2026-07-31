const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // client joins a room named after the order's Mongo _id
    // any emit to that room reaches everyone tracking that order
    socket.on("joinOrderRoom", (orderId) => {
      socket.join(orderId);
      console.log(`Socket ${socket.id} joined room ${orderId}`);
    });

    socket.on("leaveOrderRoom", (orderId) => {
      socket.leave(orderId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export default initSocket;
