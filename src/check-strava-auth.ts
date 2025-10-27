export function checkStravaAuth() {
    // const statusEl = document.getElementById('status');
    // if (!statusEl)
    //     return;

    try {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (state !== 'strava_auth') {
            return;
        }


        if (error) {
            // statusEl.textContent = 'Authentication failed: ' + error;
            // statusEl.className = 'error';

            // Send error to parent window
            if (window.opener) {
                window.opener.postMessage({
                    type: 'STRAVA_AUTH_ERROR',
                    error: error
                }, window.location.origin);
            }

            setTimeout(() => {
                window.close();
            }, 3000);
            return;
        }

        if (!code) {
            // statusEl.textContent = 'No authorization code received';
            // statusEl.className = 'error';

            if (window.opener) {
                window.opener.postMessage({
                    type: 'STRAVA_AUTH_ERROR',
                    error: 'No authorization code received'
                }, window.location.origin);
            }

            setTimeout(() => {
                window.close();
            }, 3000);
            return;
        }

        // Verify state parameter (basic security check)
        if (state !== 'strava_auth') {
            // statusEl.textContent = 'Invalid state parameter';
            // statusEl.className = 'error';

            if (window.opener) {
                window.opener.postMessage({
                    type: 'STRAVA_AUTH_ERROR',
                    error: 'Invalid state parameter'
                }, window.location.origin);
            }

            setTimeout(() => {
                window.close();
            }, 3000);
            return;
        }

        // Success - send code to parent window
        // statusEl.textContent = 'Authentication successful! Closing window...';
        // statusEl.className = 'success';

        if (window.opener) {
            window.opener.postMessage({
                type: 'STRAVA_AUTH_SUCCESS',
                code: code
            }, window.location.origin);
        }

        // Close the popup after a short delay
        setTimeout(() => {
            window.close();
        }, 1500);

    } catch (err) {
        console.error('Error processing Strava callback:', err);
        // statusEl.textContent = 'Error processing authentication';
        // statusEl.className = 'error';

        if (window.opener) {
            window.opener.postMessage({
                type: 'STRAVA_AUTH_ERROR',
                error: 'Error processing authentication'
            }, window.location.origin);
        }

        setTimeout(() => {
            window.close();
        }, 3000);
    }
}