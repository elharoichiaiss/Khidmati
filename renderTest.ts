import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import App from "./client/src/App";
import { queryClient } from "./client/src/lib/queryClient";

const staticLocationHook = (path = "/") => {
  return () => [path, (navigate: string) => {}] as any;
};

async function run() {
  try {
    const html = renderToString(
      React.createElement(Router, { hook: staticLocationHook("/") }, 
        React.createElement(App)
      )
    );
    console.log("Render successful. HTML length:", html.length);
  } catch (err) {
    console.error("Render crashed:", err);
  }
}

run();
