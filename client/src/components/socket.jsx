"use client"
import { useEffect } from "react";
import { io } from "socket.io-client";

// useEffect(()=>{
//     const socket = io("http://localhost:5000");

//     socket.on("connect", () => {
//         console.log("Connected to server");
//     });

//     return () => {
//         socket.disconnect();
//     };
// },[])

export default function Socket() {
    return(
        <div>
            <h1>Socket.io Client</h1>
        </div>
    )
}

