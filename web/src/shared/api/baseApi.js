import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

import {
  clearAuth,
  setAccessToken,
} from "../../features/auth/store/authSlice.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const refreshMutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  fetchFn: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithAuth = async (args, api, extraOptions) => {
  await refreshMutex.waitForUnlock();

  const url = typeof args === "string" ? args : args.url;
  const isRefreshRequest = url === "/auth/refresh";

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isRefreshRequest) {
    if (!refreshMutex.isLocked()) {
      const release = await refreshMutex.acquire();

      try {
        const refreshResult = await rawBaseQuery(
          {
            url: "/auth/refresh",
            method: "POST",
          },
          api,
          extraOptions,
        );

        const accessToken = refreshResult.data?.data?.accessToken;

        if (accessToken) {
          api.dispatch(setAccessToken(accessToken));
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          api.dispatch(clearAuth());
        }
      } finally {
        release();
      }
    } else {
      await refreshMutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    "Auth",
    "Home",
    "Users",
    "Series",
    "Teams",
    "Players",
    "Squads",
    "Matches",
    "PlayingXI",
    "Score",
    "Commentary",
  ],
  endpoints: () => ({}),
});

export { API_BASE_URL, baseApi, baseQueryWithAuth };
