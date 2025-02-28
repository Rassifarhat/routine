"use client";

import React, { FC, PropsWithChildren } from "react";
import { useElementsStore } from "@/store/elementsStore";

export const ElementsProvider: FC<PropsWithChildren> = ({ children }) => {
  return <>{children}</>;
};

export function useElements() {
  return useElementsStore();
}