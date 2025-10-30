import { OAuthProviderInterface, OAuthProviderType } from "./OAuthProvider";
import { FlootOAuthProvider } from "./FlootOAuthProvider";
import { FacebookOAuthProvider } from "./FacebookOAuthProvider";
export function getOAuthProvider(
  providerName: OAuthProviderType,
  redirectUri: string
): OAuthProviderInterface {
  switch (providerName) {
    case "floot":
      return new FlootOAuthProvider(redirectUri);
    case "facebook":
      return new FacebookOAuthProvider(redirectUri);
  }
}
