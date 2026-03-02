"use client";

console.warn(
  "⚠️ Avoid importing components from 'index.js' for better performance. This practice is deprecated and may be removed in the future."
);

export * as _Builtin from "./_Builtin";
export * from "./devlink";
export * from "./devlinkContext";
export * from "./DevLinkProvider";
export * from "./interactions";
export * from "./utils";
export * from "./values/Builtin/formatNumber";
