# ersrealtime-es6
Client helper library to connect to the realtime server


INSTALL
=======

    npm install ersrealtime

EXAMPLE
========

    /// using modules ///
    import { onconnect, ondisconnect, subscribe, unsubscribe } from "ersrealtime";

    /// using cjs ///
    const { onconnect, ondisconnect, subscribe, unsubscribe } = require("ersrealtime");

    onconnect(() => {
        console.log("connected to realtime server");
    });

    ondisconnect(() => {
        console.log("disconnected from realtime server");
    });

    subscribe(foldername, "upcoming_races", function show_race_id(raceid) {
        console.log(`upcoming race: ${raceid}`);
        // if you want only once:
        // unsubscribe(foldername, "upcoming_races", show_race_id);
    });

NOTES
=====

* there currently isn't a way to 
