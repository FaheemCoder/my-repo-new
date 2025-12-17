import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

import { useEffect, useState } from "react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser, {});

  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user !== undefined) {
      setIsLoading(false);
    }
    if (isAuthenticated || (!!user && user !== null)) {
      setSessionActive(true);
    }
  }, [isAuthLoading, user, isAuthenticated]);

  return {
    isLoading,
    isAuthenticated,
    sessionActive,
    user,
    signIn,
    signOut,
  };
}