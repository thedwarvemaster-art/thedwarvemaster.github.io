# Managing website content

The website is designed for GitHub Pages. Upload these files, including `site-content.json` and `content.js`, to the folder published by Pages. The site reads `site-content.json` for factions and mechanics; do not delete it. Content changes are committed to that file through GitHub's API.

## Give yourself editing access

1. Create a GitHub fine-grained personal access token restricted to the website repository, with **Contents: Read and write** permission. If your organization requires approval, get the token approved there. Keep it private; anyone holding it can edit the repository within its granted permissions.
2. Open Factions or Mechanics on the deployed site and select **Manage content**.
3. Enter the repository owner and name, the branch that GitHub Pages publishes, and the path to `site-content.json` relative to the repository root. For a site published from `/docs`, for example, enter `docs/site-content.json`. Enter the token and connect.
4. Add, edit, hide, show, or remove entries. Choose an image for a faction and it will be center-cropped to a 256 × 256 square. A blank image field preserves an existing image.

Each save creates a commit. Changes are visible to everyone once GitHub Pages rebuilds; this can take a few minutes. Hiding keeps an entry for later; removing deletes it from the content file. The token is held only in the current page's memory and cleared on sign-out or page close. Never put the token in repository files or share it with visitors. Use a separate token for each administrator and revoke it in GitHub when no longer needed.

For custom domains, enter the repository details manually. For GitHub Actions deployments, use the branch and path that the workflow builds from. The file must already exist on that branch before the editor can connect. GitHub Pages has file and repository size limits; use reasonably sized logos and avoid placing other large files in the content JSON. If a save conflicts with another edit, retry it after reconnecting.

The existing site describes the mechanics provided so far. Use the Mechanics page editor to add more once their details are available.
