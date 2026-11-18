export function getFirebaseAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

export function getGoogleSignInErrorMessage(error: unknown): string {
  switch (getFirebaseAuthErrorCode(error)) {
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked. Retrying with a full-page Google sign-in.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In was closed before it finished. Try again when ready.';
    case 'auth/unauthorized-domain':
      return 'This website domain is not authorized for Firebase Authentication. Add the current hostname in Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is disabled for this Firebase project. Enable the Google provider in Firebase Console → Authentication → Sign-in method.';
    case 'auth/invalid-api-key':
      return 'Firebase rejected the web API key. Verify the Firebase web app configuration and the key’s API restrictions.';
    case 'auth/network-request-failed':
      return 'Firebase could not reach Google’s sign-in service. Check the network connection and try again.';
    case 'auth/invalid-credential':
      return 'Google rejected the sign-in credential. Verify the Google provider and OAuth web client configuration in Firebase Console.';
    default:
      return error instanceof Error ? error.message : 'Google Sign-In did not complete.';
  }
}
