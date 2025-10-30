import {
  OAuthProviderInterface,
  OAuthTokens,
  StandardUserData,
  OAuthError,
  OAuthProviderType,
} from "./OAuthProvider";
import { FACEBOOK_CLIENT_ID } from "./_publicConfigs";

/**
 * Implements the OAuthProvider interface for Facebook.
 * Note: Facebook OAuth does not use PKCE.
 *
 * IMPORTANT: For this provider to be fully integrated, the string 'facebook'
 * must be added to the `oauthProviders` array in `helpers/OAuthProvider.tsx`.
 */
export class FacebookOAuthProvider implements OAuthProviderInterface {
  public readonly name: OAuthProviderType = "facebook" as any; // Cast needed until 'facebook' is added to OAuthProviderType
  public readonly clientId: string;
  public readonly authUrl = "https://www.facebook.com/v18.0/dialog/oauth";
  public readonly scopes = "email public_profile";
  public readonly redirectUri: string;
  private readonly clientSecret: string;
  private readonly tokenUrl =
    "https://graph.facebook.com/v18.0/oauth/access_token";
  private readonly userInfoUrl =
    "https://graph.facebook.com/me?fields=id,name,email,picture";

  constructor(redirectUri: string) {
    this.clientId = FACEBOOK_CLIENT_ID;
    this.clientSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
    this.redirectUri = redirectUri;

    if (!this.clientId) {
      const error = new Error("FACEBOOK_CLIENT_ID is not configured");
      console.error("FacebookOAuthProvider initialization failed:", error);
      throw error;
    }

    if (!this.clientSecret) {
      const error = new Error(
        "FACEBOOK_CLIENT_SECRET environment variable is required"
      );
      console.error("FacebookOAuthProvider initialization failed:", error);
      throw error;
    }
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    console.log(
      "FacebookOAuthProvider: Exchanging authorization code for tokens",
      {
        codeLength: code.length,
        redirectUri,
      }
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      client_secret: this.clientSecret,
      code: code,
    });

    const requestUrl = `${this.tokenUrl}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
    } catch (fetchError) {
      console.error("FacebookOAuthProvider: Token exchange fetch error:", {
        error:
          fetchError instanceof Error ? fetchError.message : String(fetchError),
        url: this.tokenUrl,
      });
      throw new OAuthError(
        "NETWORK_ERROR",
        `Token exchange request failed: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`,
        this.name,
        fetchError
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(
        "FacebookOAuthProvider: Failed to parse token exchange response JSON:",
        {
          error:
            jsonError instanceof Error ? jsonError.message : String(jsonError),
          status: response.status,
        }
      );
      throw new OAuthError(
        "TOKEN_EXCHANGE_FAILED",
        `Token exchange succeeded but response is not valid JSON: ${
          jsonError instanceof Error ? jsonError.message : String(jsonError)
        }`,
        this.name,
        jsonError
      );
    }

    if (!response.ok || data.error) {
      const errorMessage =
        data.error?.message ||
        `Token exchange failed: ${response.status} ${response.statusText}`;
      console.error(
        "FacebookOAuthProvider: Token exchange failed with error response:",
        {
          status: response.status,
          statusText: response.statusText,
          errorBody: data,
        }
      );
      throw new OAuthError(
        "TOKEN_EXCHANGE_FAILED",
        errorMessage,
        this.name,
        data
      );
    }

    if (!data.access_token) {
      throw new OAuthError(
        "TOKEN_EXCHANGE_FAILED",
        "No access token received from Facebook",
        this.name,
        data
      );
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || undefined,
      tokenType: data.token_type || "Bearer",
    };
  }

  async fetchUserInfo(tokens: OAuthTokens): Promise<any> {
    const authHeader = `${tokens.tokenType || "Bearer"} ${tokens.accessToken}`;

    let response: Response;
    try {
      response = await fetch(this.userInfoUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });
    } catch (fetchError) {
      console.error("FacebookOAuthProvider: User info fetch error:", {
        error:
          fetchError instanceof Error ? fetchError.message : String(fetchError),
        url: this.userInfoUrl,
      });
      throw new OAuthError(
        "NETWORK_ERROR",
        `User info request failed: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`,
        this.name,
        fetchError
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(
        "FacebookOAuthProvider: Failed to parse user info response JSON:",
        {
          error:
            jsonError instanceof Error ? jsonError.message : String(jsonError),
          status: response.status,
        }
      );
      throw new OAuthError(
        "USER_INFO_FETCH_FAILED",
        `User info fetch succeeded but response is not valid JSON: ${
          jsonError instanceof Error ? jsonError.message : String(jsonError)
        }`,
        this.name,
        jsonError
      );
    }

    if (!response.ok || data.error) {
      const errorMessage =
        data.error?.message ||
        `User info fetch failed: ${response.status} ${response.statusText}`;
      console.error(
        "FacebookOAuthProvider: User info fetch failed with error response:",
        {
          status: response.status,
          statusText: response.statusText,
          errorBody: data,
        }
      );
      throw new OAuthError(
        "USER_INFO_FETCH_FAILED",
        errorMessage,
        this.name,
        data
      );
    }

    return data;
  }

  mapUserData(userInfo: any): StandardUserData {
    if (!userInfo || !userInfo.id || !userInfo.email) {
      throw new OAuthError(
        "PROVIDER_ERROR",
        "Facebook user info missing required fields (id, email)",
        this.name,
        userInfo
      );
    }

    const mappedData: StandardUserData = {
      providerUserId: userInfo.id,
      email: userInfo.email,
      displayName: userInfo.name || userInfo.email.split("@")[0],
      avatarUrl: userInfo.picture?.data?.url || null,
    };

    return mappedData;
  }

  generateAuthorizationUrl(state: string): {
    url: string;
    codeVerifier: string;
  } {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: state,
      response_type: "code",
    });

    const url = `${this.authUrl}?${params.toString()}`;

    // Facebook OAuth does not use PKCE, so codeVerifier is an empty string.
    return { url, codeVerifier: "" };
  }
}