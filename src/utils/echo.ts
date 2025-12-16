import { CONFIG } from "../../config/config";
import Echo from "laravel-echo";
import Pusher, { Channel } from "pusher-js";
import { api } from "../lib/api";

type AuthorizerCallBackType = {
  (error: any, response: any): void;
};

const authorizer = (channel: Channel) => {
  async function authorize(socketId: string, callback: AuthorizerCallBackType) {
    try {
      const response = await api.post("/broadcasting/auth", {
        socket_id: socketId,
        channel_name: channel.name,
      });
      callback(false, response.data);
    } catch (error: any) {
      console.error("Broadcast auth error:", error);
      callback(true, error);
    }
  }

  return { authorize };
};

const pusherClient = new Pusher(CONFIG.REVERB_KEY, {
  wsHost: CONFIG.REVERB_HOST,
  wsPort: CONFIG.REVERB_PORT,
  wssPort: CONFIG.REVERB_PORT,
  forceTLS: false,
  disableStats: true,
  cluster: "mt1",
  authEndpoint: CONFIG.REVERB_API_URL,
  enabledTransports: ["ws", "wss"],
  auth: {
    headers: {},
  },
  authorizer: authorizer,
});

const echo = new Echo({
  broadcaster: "reverb",
  client: pusherClient,
});

export default echo;
