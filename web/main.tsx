import React from "react";
import { createRoot } from "react-dom/client";
import CampusApp from "../app/campus-app";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(<CampusApp />);
