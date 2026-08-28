const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
cors: {
origin: "*"
}
});

const PORT =
process.env.PORT || 3000;

app.use(
express.static(
path.join(__dirname)
)
);

/*
Room structure:

```
rooms = {
    ABC123: {
        map: "rainbow",
        host: socket.id,
        guest: socket.id
    }
}
```

*/

const rooms = new Map();

function generateCode() {

```
const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let code = "";

for (let i = 0; i < 6; i++) {

    code +=
        characters[
            crypto.randomInt(
                0,
                characters.length
            )
        ];

}

return code;
```

}

function createUniqueCode() {

```
let code;

do {

    code = generateCode();

} while (
    rooms.has(code)
);

return code;
```

}

io.on(
"connection",
socket => {

```
    console.log(
        "Player connected:",
        socket.id
    );

    /*
        CREATE ROOM
    */

    socket.on(
        "createRoom",
        (data, callback) => {

            const code =
                createUniqueCode();

            const map =
                data &&
                data.map
                ? data.map
                : "rainbow";

            rooms.set(
                code,
                {
                    map,
                    host: socket.id,
                    guest: null
                }
            );

            socket.join(code);

            socket.data.room =
                code;

            socket.data.role =
                "host";

            if (typeof callback === "function") {

                callback({
                    success: true,
                    code,
                    role: "host"
                });

            }

            console.log(
                "Room created:",
                code
            );

        }
    );

    /*
        JOIN ROOM
    */

    socket.on(
        "joinRoom",
        (data, callback) => {

            const code =
                String(
                    data?.code || ""
                )
                .trim()
                .toUpperCase();

            const room =
                rooms.get(code);

            if (!room) {

                callback?.({
                    success: false,
                    error:
                        "That room does not exist."
                });

                return;
            }

            if (room.guest) {

                callback?.({
                    success: false,
                    error:
                        "That room is already full."
                });

                return;
            }

            room.guest =
                socket.id;

            socket.join(code);

            socket.data.room =
                code;

            socket.data.role =
                "guest";

            callback?.({
                success: true,
                code,
                role: "guest"
            });

            /*
                Tell both players that
                the race can begin.
            */

            io.to(code).emit(
                "raceStarting",
                {
                    map: room.map
                }
            );

            console.log(
                "Room started:",
                code
            );

        }
    );

    /*
        MOVEMENT
    */

    socket.on(
        "playerMove",
        data => {

            const code =
                socket.data.room;

            if (!code)
                return;

            const room =
                rooms.get(code);

            if (!room)
                return;

            /*
                Send only to the other
                player in the room.
            */

            socket.to(code).emit(
                "playerUpdate",
                {
                    id: socket.id,
                    position: {
                        x:
                            Number(
                                data?.position?.x || 0
                            ),
                        y:
                            Number(
                                data?.position?.y || 0
                            ),
                        z:
                            Number(
                                data?.position?.z || 0
                            )
                    }
                }
            );

        }
    );

    /*
        PLAYER FINISHED
    */

    socket.on(
        "finished",
        data => {

            const code =
                socket.data.room;

            if (!code)
                return;

            socket.to(code).emit(
                "playerFinished",
                {
                    position:
                        data?.position || 1
                }
            );

        }
    );

    /*
        DISCONNECT
    */

    socket.on(
        "disconnect",
        () => {

            const code =
                socket.data.room;

            if (!code)
                return;

            const room =
                rooms.get(code);

            if (!room)
                return;

            socket.to(code).emit(
                "opponentLeft"
            );

            rooms.delete(code);

            console.log(
                "Room closed:",
                code
            );

        }
    );

}
```

);

app.get(
"/health",
(req, res) => {

```
    res.json({
        online: true,
        rooms: rooms.size,
        players:
            io.engine.clientsCount
    });

}
```

);

server.listen(
PORT,
() => {

```
    console.log(
        "================================="
    );

    console.log(
        "       CHAOS RACE SERVER"
    );

    console.log(
        "================================="
    );

    console.log(
        `Running on port ${PORT}`
    );

    console.log(
        `Open http://localhost:${PORT}`
    );

    console.log(
        "================================="
    );

}
```

);
