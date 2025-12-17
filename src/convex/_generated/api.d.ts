/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as assessments from "../assessments.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as cleanupAuth from "../cleanupAuth.js";
import type * as developmentPlans from "../developmentPlans.js";
import type * as employees from "../employees.js";
import type * as gap from "../gap.js";
import type * as http from "../http.js";
import type * as successProfiles from "../successProfiles.js";
import type * as testData from "../testData.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  assessments: typeof assessments;
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  chat: typeof chat;
  cleanupAuth: typeof cleanupAuth;
  developmentPlans: typeof developmentPlans;
  employees: typeof employees;
  gap: typeof gap;
  http: typeof http;
  successProfiles: typeof successProfiles;
  testData: typeof testData;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
