import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";

export function TestChat() {
    const { messages } = useChat({
        id: 'test',
        transport: new DefaultChatTransport({
            api: '/api/chat',
            fetch: async (url, init) => {
                const res = await fetch(url, init);
                console.log(res.headers.get('x-thread-id'));
                return res;
            }
        })
    });
}
