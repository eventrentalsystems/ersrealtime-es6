const _REALTIME_ADDRESS = "wss://ersrealtime.com";
const _RETRY_DELAY = 2000;
let _WEB_SOCKET = null;
let _subscriptions;

function ws_connect() {
    if (_WEB_SOCKET !== null && _WEB_SOCKET.readyState === WebSocket.OPEN) {
        //console.log("subscription service already connected.");
        return;
    }

    _WEB_SOCKET = new WebSocket(_REALTIME_ADDRESS);

    _WEB_SOCKET.onopen = async (event) => {
        let should_retry = false;
        switch (_WEB_SOCKET.readyState) {
            case WebSocket.CONNECTING:
                //console.info("onopen CONNECTING");
                break;
            case WebSocket.OPEN:
                //console.info("onopen OPEN");
                _subscriptions.onconnect(_WEB_SOCKET, event);
            break;
            case WebSocket.CLOSING:
                //console.info("onopen CLOSING");
                should_retry = true;
            break;
            case WebSocket.CLOSED:
                //console.info("onopen CLOSED");
                should_retry = true;
            break;
            default:
                //console.info("onopen DEFAULT");
                should_retry = true;
        }
        if (should_retry) {
            //console.warn("subscription service has improper ready state: " + _WEB_SOCKET.readyState);
            setTimeout(ws_connect, _RETRY_DELAY);
        }
    };

    _WEB_SOCKET.onerror = event => {
        _WEB_SOCKET = null;
        setTimeout(ws_connect, _RETRY_DELAY);
    };

    _WEB_SOCKET.onmessage = event => {
        _subscriptions.onmessage(event.data.toString());
    };

    _WEB_SOCKET.onclose = event => {
        switch (_WEB_SOCKET.readyState) {
            case WebSocket.CLOSING:
                //console.info("onclose CLOSING");
                break;
            case WebSocket.CLOSED:
                //console.info("onclose CLOSED");
                break;
            default:
                //console.info("onclose DEFAULT");
        }
            if (!event.wasClean) {
                //console.warn("onclose not clean");
                ws_connect();
                //setTimeout(ws_connect, _RETRY_DELAY);
            }
            _subscriptions.ondisconnect(_WEB_SOCKET, event);
    };
}

_subscriptions = {

    subscribers: {},

    ws: null,

    onmessage(msg) {
        const [foldername, topicname, payload_id] = msg.split(":");
        const topic = `${foldername}:${topicname}`;
        if (_subscriptions.subscribers[topic]) {
            _subscriptions.subscribers[topic].forEach(func => func(payload_id));
        }
    },

    unsubscribe(foldername, topic, func) {
        if (!foldername || typeof foldername !== "string") {
            throw new TypeError("subscribe() -> foldername not a string");
        }
        if (!topic || typeof topic !== "string") {
            throw new TypeError("subscribe() -> topic not a string");
        }
        if (typeof func !== "function") {
            throw new TypeError("subscribe() -> no callback function (3rd arg)");
        }

        const topics = Object.keys(_subscriptions.subscribers);
        topic = foldername + ":" + topic;
        if (_subscriptions.subscribers[topic] && _subscriptions.subscribers[topic].length === 1) {
            // if no more listeners, tell the server we're no longer interested.
            if (_subscriptions.ws !== null) {
                _subscriptions.ws.send(JSON.stringify(["unsubscribe", topic]));
            }
        }
        if (_subscriptions.subscribers[topic] === undefined) {
            _subscriptions.subscribers[topic] = [];
        }
        _subscriptions.subscribers[topic] = _subscriptions.subscribers[topic].filter(f => f !== func);
    },

    subscribe(foldername="", topic="", func) {

        if (!foldername || typeof foldername !== "string") {
            throw new TypeError("subscribe() -> foldername not a string");
        }
        if (!topic || typeof topic !== "string") {
            throw new TypeError("subscribe() -> topic not a string");
        }
        if (typeof func !== "function") {
            throw new TypeError("subscribe() -> no callback function (3rd arg)");
        }

        const topics = Object.keys(_subscriptions.subscribers);
        topic = foldername + ":" + topic;
        if (topics.includes(topic) === false) {
            if (_subscriptions.ws !== null) {
                _subscriptions.ws.send(JSON.stringify(["subscribe", topic]));
            }
        }
        if (_subscriptions.subscribers[topic] === undefined) {
            _subscriptions.subscribers[topic] = [];
        }
        _subscriptions.subscribers[topic].push(func);
    },


    // BELOW HERE = CONNECTION STATUS NOTIFICATIONS //

    listeners: {},

    onconnect(ws, e) {
        _subscriptions.ws = ws;
        for (const topic of Object.keys(_subscriptions.subscribers)) {
            ws.send(JSON.stringify(["subscribe", topic]));
        }
        _subscriptions.notifyListeners("connected", e);
    },

    ondisconnect(ws, e) {
        _subscriptions.notifyListeners("disconnected", e);
        _subscriptions.ws = null;
    },

    notifyListeners(topic, e) {
        if (_subscriptions.listeners[topic]) {
            for (const listener of _subscriptions.listeners[topic]) {
                // setTimeout prevents exceptions from disrupting the other listeners.
                setTimeout(() => listener(e));
            }
        }
    },

    addEventListener(type, listener) {
        _subscriptions.listeners[type] = _subscriptions.listeners[type] || new Set();
        return _subscriptions.listeners[type].add(listener);
    },

    removeEventListener(type, listener) {
        if (_subscriptions.listeners[type]) {
            _subscriptions.listeners[type].delete(listener);
            return true;
        }
        return false;
    },

};
ws_connect();

export const subscribe = _subscriptions.subscribe;
export const unsubscribe = _subscriptions.unsubscribe;
export const onconnect = (func) => {
    _subscriptions.addEventListener("connected", func);
};
export const ondisconnect = (func) => {
    _subscriptions.addEventListener("disconnected", func);
};
